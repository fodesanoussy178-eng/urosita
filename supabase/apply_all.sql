-- UROSI-T : script unique regroupant les migrations, a coller tel quel
-- dans Dashboard Supabase -> SQL Editor -> New query -> Run.
-- Re-executable sans danger si deja applique en partie.

-- ============ 0001_schema.sql ============
-- UROSI-T schema: modele mandataire (MEL micro-missions)
-- Aucune colonne ne permet a la plateforme de fixer un prix ou de filtrer
-- l'acces via l'indice de fiabilite. Les plafonds legaux sont des contraintes
-- SQL (CHECK / trigger), pas des regles applicatives contournables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles : un profil par utilisateur auth.users, cree par le trigger
-- handle_new_user (voir 0002_functions.sql).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'worker' check (role in ('worker', 'structure_admin')),
  is_micro_entrepreneur boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Un profil par utilisateur, cree automatiquement a l''inscription.';

-- ---------------------------------------------------------------------------
-- structures : entites qui publient des missions. Un profil structure_admin
-- peut posseder plusieurs structures (agences, associations...).
-- ---------------------------------------------------------------------------
create table if not exists public.structures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  siret text,
  created_at timestamptz not null default now()
);

create index if not exists structures_owner_id_idx on public.structures (owner_id);

-- ---------------------------------------------------------------------------
-- missions : plafond legal de 5h/mission = contrainte CHECK sur duration_minutes.
-- ---------------------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null references public.structures (id) on delete cascade,
  title text not null,
  detail text,
  city text,
  scheduled_date date not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 300),
  worker_rate_cents integer not null check (worker_rate_cents > 0),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists missions_structure_id_idx on public.missions (structure_id);
create index if not exists missions_status_scheduled_date_idx on public.missions (status, scheduled_date);

-- ---------------------------------------------------------------------------
-- applications : candidature d'un worker a une mission. Plafond legal de
-- 3 jours consecutifs chez la meme structure = trigger (0002_functions.sql),
-- car il faut regarder l'historique, pas seulement la ligne inseree.
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (mission_id, worker_id)
);

create index if not exists applications_mission_id_idx on public.applications (mission_id);
create index if not exists applications_worker_id_idx on public.applications (worker_id);
create index if not exists applications_worker_status_idx on public.applications (worker_id, status);

-- ---------------------------------------------------------------------------
-- lemonway_accounts / payments : modelisation du cantonnement des fonds.
-- Les appels a l'API Lemonway elle-meme doivent vivre dans des Edge
-- Functions (service_role), jamais cote client. Non branche dans cette passe.
-- ---------------------------------------------------------------------------
create table if not exists public.lemonway_accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  lemonway_wallet_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'held', 'released', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists payments_application_id_idx on public.payments (application_id);

-- ---------------------------------------------------------------------------
-- reliability_disputes : contestabilite RGPD Art. 22 sur l'indice de
-- fiabilite calcule automatiquement.
-- ---------------------------------------------------------------------------
create table if not exists public.reliability_disputes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles (id) on delete cascade,
  description text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists reliability_disputes_worker_id_idx on public.reliability_disputes (worker_id);

-- ============ 0002_functions.sql ============
-- Fonctions et triggers portant les regles metier du modele mandataire.

-- ---------------------------------------------------------------------------
-- handle_new_user : cree automatiquement la ligne profiles a l'inscription,
-- avec le role choisi par l'utilisateur (metadonnees passees a signUp()).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'worker')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- enforce_consecutive_days_cap : un travailleur qui n'est pas
-- micro-entrepreneur ne peut pas enchainer plus de 3 jours consecutifs de
-- missions acceptees pour la meme structure (protection contre le
-- requalification en salariat deguise).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_consecutive_days_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_structure_id uuid;
  v_new_date date;
  v_is_micro boolean;
  v_dates date[];
  v_run integer;
  v_max_run integer;
  v_d date;
  v_prev date;
begin
  select structure_id, scheduled_date into v_structure_id, v_new_date
  from public.missions where id = new.mission_id;

  select coalesce(is_micro_entrepreneur, false) into v_is_micro
  from public.profiles where id = new.worker_id;

  if v_is_micro then
    return new;
  end if;

  select array_agg(distinct m.scheduled_date order by m.scheduled_date)
  into v_dates
  from public.applications a
  join public.missions m on m.id = a.mission_id
  where a.worker_id = new.worker_id
    and a.status = 'accepted'
    and a.id <> new.id
    and m.structure_id = v_structure_id;

  v_dates := array_append(coalesce(v_dates, array[]::date[]), v_new_date);

  select array_agg(distinct d order by d) into v_dates from unnest(v_dates) d;

  v_run := 1;
  v_max_run := 1;
  v_prev := null;

  foreach v_d in array v_dates loop
    if v_prev is not null and v_d = v_prev + 1 then
      v_run := v_run + 1;
    else
      v_run := 1;
    end if;
    if v_run > v_max_run then
      v_max_run := v_run;
    end if;
    v_prev := v_d;
  end loop;

  if v_max_run > 3 then
    raise exception 'Plafond legal depasse : 3 jours consecutifs maximum pour la meme structure (travailleur non micro-entrepreneur).'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists applications_consecutive_days_cap on public.applications;
create trigger applications_consecutive_days_cap
  before insert or update of status on public.applications
  for each row
  when (new.status = 'accepted')
  execute function public.enforce_consecutive_days_cap();

-- ---------------------------------------------------------------------------
-- reliability_index : indice de fiabilite calcule par travailleur, en
-- security_invoker pour que chacun ne voie que le sien via les policies RLS
-- de la table sous-jacente (voir 0003_rls.sql).
-- ---------------------------------------------------------------------------
create or replace view public.reliability_index
with (security_invoker = on) as
select
  a.worker_id,
  count(*) filter (where a.status = 'accepted') as accepted_count,
  count(*) filter (where a.status = 'rejected') as rejected_count,
  count(*) filter (where a.status = 'cancelled') as cancelled_count,
  count(*) as total_applications,
  case
    when count(*) filter (where a.status in ('accepted', 'cancelled')) = 0 then null
    else round(
      100.0 * count(*) filter (where a.status = 'accepted')
      / nullif(count(*) filter (where a.status in ('accepted', 'cancelled')), 0),
      1
    )
  end as reliability_score
from public.applications a
group by a.worker_id;

comment on view public.reliability_index is
  'Indice informatif, non-determinant : jamais utilise pour filtrer l''acces aux missions.';

-- ============ 0003_rls.sql ============
-- Row Level Security : chaque table est verrouillee par defaut, seules les
-- policies ci-dessous ouvrent des acces precis. Aucune policy ne filtre sur
-- l'indice de fiabilite (contestabilite RGPD Art. 22 respectee).

alter table public.profiles enable row level security;
alter table public.structures enable row level security;
alter table public.missions enable row level security;
alter table public.applications enable row level security;
alter table public.lemonway_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.reliability_disputes enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles: structures read applicant profiles" on public.profiles;
create policy "profiles: structures read applicant profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.applications a
      join public.missions m on m.id = a.mission_id
      join public.structures s on s.id = m.structure_id
      where a.worker_id = public.profiles.id
        and s.owner_id = auth.uid()
    )
  );

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- structures
-- ---------------------------------------------------------------------------
drop policy if exists "structures: owner full read" on public.structures;
create policy "structures: owner full read"
  on public.structures for select
  using (owner_id = auth.uid());

drop policy if exists "structures: read via open mission" on public.structures;
create policy "structures: read via open mission"
  on public.structures for select
  using (
    exists (
      select 1 from public.missions m
      where m.structure_id = public.structures.id and m.status = 'open'
    )
  );

drop policy if exists "structures: owner insert" on public.structures;
create policy "structures: owner insert"
  on public.structures for insert
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'structure_admin'
    )
  );

drop policy if exists "structures: owner update" on public.structures;
create policy "structures: owner update"
  on public.structures for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "structures: owner delete" on public.structures;
create policy "structures: owner delete"
  on public.structures for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
drop policy if exists "missions: read open or own structure" on public.missions;
create policy "missions: read open or own structure"
  on public.missions for select
  using (
    status = 'open'
    or exists (
      select 1 from public.structures s
      where s.id = public.missions.structure_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "missions: owner insert" on public.missions;
create policy "missions: owner insert"
  on public.missions for insert
  with check (
    exists (
      select 1 from public.structures s
      where s.id = structure_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "missions: owner update" on public.missions;
create policy "missions: owner update"
  on public.missions for update
  using (
    exists (
      select 1 from public.structures s
      where s.id = public.missions.structure_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.structures s
      where s.id = structure_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "missions: owner delete" on public.missions;
create policy "missions: owner delete"
  on public.missions for delete
  using (
    exists (
      select 1 from public.structures s
      where s.id = public.missions.structure_id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
drop policy if exists "applications: worker read own" on public.applications;
create policy "applications: worker read own"
  on public.applications for select
  using (worker_id = auth.uid());

drop policy if exists "applications: structure read for own missions" on public.applications;
create policy "applications: structure read for own missions"
  on public.applications for select
  using (
    exists (
      select 1
      from public.missions m
      join public.structures s on s.id = m.structure_id
      where m.id = public.applications.mission_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "applications: worker apply" on public.applications;
create policy "applications: worker apply"
  on public.applications for insert
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.status = 'open'
    )
  );

drop policy if exists "applications: worker cancel own" on public.applications;
create policy "applications: worker cancel own"
  on public.applications for update
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid() and status in ('pending', 'cancelled'));

drop policy if exists "applications: structure accept or reject" on public.applications;
create policy "applications: structure accept or reject"
  on public.applications for update
  using (
    exists (
      select 1
      from public.missions m
      join public.structures s on s.id = m.structure_id
      where m.id = public.applications.mission_id and s.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.missions m
      join public.structures s on s.id = m.structure_id
      where m.id = mission_id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- lemonway_accounts / payments : lecture seule cote client, aucune ecriture
-- (creation et mise a jour reservees aux Edge Functions en service_role).
-- ---------------------------------------------------------------------------
drop policy if exists "lemonway_accounts: read own" on public.lemonway_accounts;
create policy "lemonway_accounts: read own"
  on public.lemonway_accounts for select
  using (profile_id = auth.uid());

drop policy if exists "payments: worker reads own" on public.payments;
create policy "payments: worker reads own"
  on public.payments for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = public.payments.application_id and a.worker_id = auth.uid()
    )
  );

drop policy if exists "payments: structure reads own missions payments" on public.payments;
create policy "payments: structure reads own missions payments"
  on public.payments for select
  using (
    exists (
      select 1
      from public.applications a
      join public.missions m on m.id = a.mission_id
      join public.structures s on s.id = m.structure_id
      where a.id = public.payments.application_id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- reliability_disputes
-- ---------------------------------------------------------------------------
drop policy if exists "reliability_disputes: worker read own" on public.reliability_disputes;
create policy "reliability_disputes: worker read own"
  on public.reliability_disputes for select
  using (worker_id = auth.uid());

drop policy if exists "reliability_disputes: worker create own" on public.reliability_disputes;
create policy "reliability_disputes: worker create own"
  on public.reliability_disputes for insert
  with check (worker_id = auth.uid());

-- ============ 0004_fix_rls_recursion.sql ============
-- Corrige une recursion infinie dans les policies RLS : la policy de
-- missions consultait structures, dont la policy consultait missions ->
-- Postgres rejetait toute lecture (42P17), y compris celle du profil.
-- Les sous-requetes inter-tables passent par des fonctions security definer
-- (qui ne re-declenchent pas la RLS), ce qui brise le cycle.

create or replace function public.is_structure_owner(_structure_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.structures s
    where s.id = _structure_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.owns_mission(_mission_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.missions m
    join public.structures s on s.id = m.structure_id
    where m.id = _mission_id and s.owner_id = auth.uid()
  );
$$;

create or replace function public.mission_is_open(_mission_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.missions m
    where m.id = _mission_id and m.status = 'open'
  );
$$;

create or replace function public.structure_has_open_mission(_structure_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.missions m
    where m.structure_id = _structure_id and m.status = 'open'
  );
$$;

create or replace function public.is_my_applicant(_worker_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.missions m on m.id = a.mission_id
    join public.structures s on s.id = m.structure_id
    where a.worker_id = _worker_id and s.owner_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles: structures read applicant profiles" on public.profiles;
create policy "profiles: structures read applicant profiles"
  on public.profiles for select
  using (public.is_my_applicant(id));

-- ---------------------------------------------------------------------------
-- structures
-- ---------------------------------------------------------------------------
drop policy if exists "structures: read via open mission" on public.structures;
create policy "structures: read via open mission"
  on public.structures for select
  using (public.structure_has_open_mission(id));

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
drop policy if exists "missions: read open or own structure" on public.missions;
create policy "missions: read open or own structure"
  on public.missions for select
  using (status = 'open' or public.is_structure_owner(structure_id));

drop policy if exists "missions: owner insert" on public.missions;
create policy "missions: owner insert"
  on public.missions for insert
  with check (public.is_structure_owner(structure_id));

drop policy if exists "missions: owner update" on public.missions;
create policy "missions: owner update"
  on public.missions for update
  using (public.is_structure_owner(structure_id))
  with check (public.is_structure_owner(structure_id));

drop policy if exists "missions: owner delete" on public.missions;
create policy "missions: owner delete"
  on public.missions for delete
  using (public.is_structure_owner(structure_id));

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
drop policy if exists "applications: structure read for own missions" on public.applications;
create policy "applications: structure read for own missions"
  on public.applications for select
  using (public.owns_mission(mission_id));

drop policy if exists "applications: worker apply" on public.applications;
create policy "applications: worker apply"
  on public.applications for insert
  with check (worker_id = auth.uid() and public.mission_is_open(mission_id));

drop policy if exists "applications: structure accept or reject" on public.applications;
create policy "applications: structure accept or reject"
  on public.applications for update
  using (public.owns_mission(mission_id))
  with check (public.owns_mission(mission_id));

-- ---------------------------------------------------------------------------
-- payments : meme traitement pour la lecture cote structure.
-- ---------------------------------------------------------------------------
drop policy if exists "payments: structure reads own missions payments" on public.payments;
create policy "payments: structure reads own missions payments"
  on public.payments for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = public.payments.application_id
        and public.owns_mission(a.mission_id)
    )
  );

-- ============ 0005_checkin_ratings.sql ============
-- Presence (QR) et notation : chaque candidature acceptee porte un jeton de
-- pointage unique. Le QR affiche une URL de validation qui n'aboutit que si
-- la personne qui scanne est connectee au compte de la structure concernee.
-- Apres la mission, le travailleur la marque terminee et note la structure.

-- ---------------------------------------------------------------------------
-- applications : statut 'completed' + jeton et horodatage de pointage
-- ---------------------------------------------------------------------------
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'completed'));

alter table public.applications
  add column if not exists checkin_token uuid not null default gen_random_uuid();
alter table public.applications
  add column if not exists checked_in_at timestamptz;

-- Le travailleur peut annuler (pending -> cancelled) ou terminer
-- (accepted -> completed) sa propre candidature.
drop policy if exists "applications: worker cancel own" on public.applications;
drop policy if exists "applications: worker cancel or complete own" on public.applications;
create policy "applications: worker cancel or complete own"
  on public.applications for update
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid() and status in ('pending', 'cancelled', 'completed'));

-- ---------------------------------------------------------------------------
-- ratings : note (1-5) donnee par le travailleur a la structure apres une
-- mission terminee. Informatif : jamais utilise pour filtrer l'acces.
-- ---------------------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  structure_id uuid not null references public.structures (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  score integer not null check (score between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists ratings_structure_id_idx on public.ratings (structure_id);

alter table public.ratings enable row level security;

drop policy if exists "ratings: authenticated read" on public.ratings;
create policy "ratings: authenticated read"
  on public.ratings for select
  using (auth.uid() is not null);

drop policy if exists "ratings: worker rates own completed application" on public.ratings;
create policy "ratings: worker rates own completed application"
  on public.ratings for insert
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and a.worker_id = auth.uid()
        and a.status = 'completed'
    )
  );

-- ============ 0006_parity_batch.sql ============
-- Parite avec le prototype v0.5 :
--  - notation bidirectionnelle (travailleur -> structure ET structure ->
--    travailleur), informative et jamais bloquante (inscrit aux CGU)
--  - missions solidaires (0 EUR, reservees aux structures ESS)
--  - signalement de retard et signalement de probleme
--  - champ "a propos" et badge ESS sur les structures

-- ---------------------------------------------------------------------------
-- ratings : direction de la note
-- ---------------------------------------------------------------------------
alter table public.ratings
  add column if not exists direction text not null default 'worker_to_structure'
  check (direction in ('worker_to_structure', 'structure_to_worker'));

alter table public.ratings drop constraint if exists ratings_application_id_key;
drop index if exists ratings_application_id_key;
alter table public.ratings drop constraint if exists ratings_application_direction_key;
alter table public.ratings
  add constraint ratings_application_direction_key unique (application_id, direction);

create index if not exists ratings_worker_id_idx on public.ratings (worker_id);

create or replace function public.owns_completed_application(_application_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.applications a
    join public.missions m on m.id = a.mission_id
    join public.structures s on s.id = m.structure_id
    where a.id = _application_id
      and a.status = 'completed'
      and s.owner_id = auth.uid()
  );
$$;

drop policy if exists "ratings: worker rates own completed application" on public.ratings;
create policy "ratings: worker rates own completed application"
  on public.ratings for insert
  with check (
    direction = 'worker_to_structure'
    and worker_id = auth.uid()
    and exists (
      select 1 from public.applications a
      where a.id = application_id
        and a.worker_id = auth.uid()
        and a.status = 'completed'
    )
  );

drop policy if exists "ratings: structure rates worker on completed application" on public.ratings;
create policy "ratings: structure rates worker on completed application"
  on public.ratings for insert
  with check (
    direction = 'structure_to_worker'
    and public.owns_completed_application(application_id)
  );

-- ---------------------------------------------------------------------------
-- missions : solidaire (0 EUR)
-- ---------------------------------------------------------------------------
alter table public.missions add column if not exists is_solidaire boolean not null default false;
alter table public.missions drop constraint if exists missions_worker_rate_cents_check;
alter table public.missions
  add constraint missions_worker_rate_cents_check
  check (
    (is_solidaire and worker_rate_cents = 0)
    or (not is_solidaire and worker_rate_cents > 0)
  );

-- ---------------------------------------------------------------------------
-- structures : ESS + a propos
-- ---------------------------------------------------------------------------
alter table public.structures add column if not exists is_ess boolean not null default false;
alter table public.structures add column if not exists about text;

-- ---------------------------------------------------------------------------
-- delay_notices : "j'arrive en retard" (informatif, visible par la structure)
-- ---------------------------------------------------------------------------
create table if not exists public.delay_notices (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  minutes integer not null check (minutes > 0 and minutes <= 240),
  created_at timestamptz not null default now()
);

create index if not exists delay_notices_application_id_idx on public.delay_notices (application_id);

alter table public.delay_notices enable row level security;

drop policy if exists "delay_notices: worker notifies own accepted application" on public.delay_notices;
create policy "delay_notices: worker notifies own accepted application"
  on public.delay_notices for insert
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id
        and a.worker_id = auth.uid()
        and a.status = 'accepted'
    )
  );

drop policy if exists "delay_notices: worker reads own" on public.delay_notices;
create policy "delay_notices: worker reads own"
  on public.delay_notices for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = public.delay_notices.application_id and a.worker_id = auth.uid()
    )
  );

drop policy if exists "delay_notices: structure reads for own missions" on public.delay_notices;
create policy "delay_notices: structure reads for own missions"
  on public.delay_notices for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = public.delay_notices.application_id
        and public.owns_mission(a.mission_id)
    )
  );

-- ---------------------------------------------------------------------------
-- reports : signalement d'un probleme par le travailleur. Ne penalise
-- jamais : aucune policy ne s'appuie dessus pour filtrer quoi que ce soit.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  worker_id uuid not null references public.profiles (id) on delete cascade,
  motif text not null check (motif in ('absent', 'conditions', 'securite', 'autre')),
  note text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports: worker creates own" on public.reports;
create policy "reports: worker creates own"
  on public.reports for insert
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.applications a
      where a.id = application_id and a.worker_id = auth.uid()
    )
  );

drop policy if exists "reports: worker reads own" on public.reports;
create policy "reports: worker reads own"
  on public.reports for select
  using (worker_id = auth.uid());


-- ============ 0019_missions_real_schedules.sql ============
-- 0019 : horaires reels, cout structure et donnees analytiques propres.
-- Les champs historiques (scheduled_date, start_time, duration_minutes, places,
-- worker_rate_cents) restent alimentes pour ne pas casser les ecrans existants.

-- Compatibilite prod : certaines bases ont 0019 sans avoir encore toutes les
-- colonnes de 0001/0006/0007/0014. Ces ajouts sont idempotents et ne suppriment
-- aucune donnee.

-- Colonnes de base (0001) : garanties presentes avant que les contraintes et
-- triggers de 0019 ne les referencent. Sur une base complete, ces ADD sont des
-- no-op grace a "if not exists".
alter table public.missions add column if not exists scheduled_date date;
alter table public.missions add column if not exists duration_minutes integer;
alter table public.missions add column if not exists status text not null default 'open';
alter table public.missions add column if not exists city text;

alter table public.missions add column if not exists is_solidaire boolean not null default false;
alter table public.missions add column if not exists sector text not null default 'autre';
alter table public.missions add column if not exists difficulty smallint not null default 1;
alter table public.missions add column if not exists is_urgent boolean not null default false;
alter table public.missions add column if not exists start_time time;
alter table public.missions add column if not exists address text;
alter table public.missions add column if not exists lat double precision;
alter table public.missions add column if not exists lng double precision;
alter table public.missions add column if not exists distance_km numeric;
alter table public.missions add column if not exists worker_rate_cents integer not null default 1000;
alter table public.missions add column if not exists base_rate_cents integer;
alter table public.missions add column if not exists pricing_breakdown jsonb;
alter table public.missions add column if not exists places integer not null default 1;
alter table public.missions add column if not exists slots jsonb;

alter table public.missions drop constraint if exists missions_worker_rate_cents_check;
alter table public.missions
  add constraint missions_worker_rate_cents_check
  check (
    (is_solidaire and worker_rate_cents = 0)
    or (not is_solidaire and worker_rate_cents > 0)
  );

alter table public.missions drop constraint if exists missions_duration_minutes_check;
alter table public.missions
  add constraint missions_duration_minutes_check
  check (duration_minutes >= 60 and duration_minutes <= 4320);

alter table public.missions drop constraint if exists missions_sector_check;
alter table public.missions
  add constraint missions_sector_check
  check (sector in ('restauration', 'vente', 'logistique', 'evenementiel', 'nettoyage', 'manutention', 'administratif', 'autre'));

alter table public.missions drop constraint if exists missions_difficulty_check;
alter table public.missions
  add constraint missions_difficulty_check check (difficulty between 1 and 3);

alter table public.missions drop constraint if exists missions_places_check;
alter table public.missions
  add constraint missions_places_check check (places between 1 and 20);

alter table public.missions add column if not exists starts_at timestamptz;
alter table public.missions add column if not exists ends_at timestamptz;
alter table public.missions add column if not exists mission_days integer not null default 1 check (mission_days between 1 and 3);
alter table public.missions add column if not exists duration_minutes_per_person integer;
alter table public.missions add column if not exists positions integer not null default 1 check (positions between 1 and 20);
alter table public.missions add column if not exists total_worker_hours numeric(10,2) not null default 0;
alter table public.missions add column if not exists hourly_rate numeric(10,2);
alter table public.missions add column if not exists worker_amount numeric(12,2) not null default 0;
alter table public.missions add column if not exists worker_subtotal numeric(12,2) not null default 0;
alter table public.missions add column if not exists service_fee numeric(12,2) not null default 0;
alter table public.missions add column if not exists structure_total numeric(12,2) not null default 0;
alter table public.missions add column if not exists time_slot text not null default 'afternoon';
alter table public.missions add column if not exists day_of_week text;
alter table public.missions add column if not exists mission_category text not null default 'autre';
alter table public.missions add column if not exists location text;

alter table public.missions drop constraint if exists missions_time_slot_check;
alter table public.missions
  add constraint missions_time_slot_check
  check (time_slot in ('morning', 'afternoon', 'evening', 'night'));

alter table public.missions drop constraint if exists missions_day_of_week_check;
alter table public.missions
  add constraint missions_day_of_week_check
  check (day_of_week is null or day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'));

alter table public.missions drop constraint if exists missions_money_totals_check;
alter table public.missions
  add constraint missions_money_totals_check
  check (
    total_worker_hours >= 0
    and worker_amount >= 0
    and worker_subtotal >= 0
    and service_fee >= 0
    and structure_total >= 0
    and (hourly_rate is null or hourly_rate >= 0)
  );

create table if not exists public.mission_days (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 1440),
  created_at timestamptz not null default now()
);

create index if not exists mission_days_mission_id_idx on public.mission_days(mission_id);
create index if not exists mission_days_starts_at_idx on public.mission_days(starts_at);
create index if not exists missions_starts_at_idx on public.missions(starts_at);
create index if not exists missions_time_slot_status_idx on public.missions(time_slot, status);
create index if not exists missions_day_status_idx on public.missions(day_of_week, status);
create index if not exists missions_category_status_idx on public.missions(mission_category, status);
create index if not exists missions_location_status_idx on public.missions(location, status);
create index if not exists missions_urgent_status_idx on public.missions(is_urgent, status);

-- Dependance 0004 : garantie presente avant les policies qui l'appellent.
-- security definer -> ne re-declenche pas la RLS (evite la recursion 42P17).
create or replace function public.is_structure_owner(_structure_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.structures s
    where s.id = _structure_id and s.owner_id = auth.uid()
  );
$$;

alter table public.mission_days enable row level security;

drop policy if exists "mission_days: read open or own structure" on public.mission_days;
create policy "mission_days: read open or own structure"
  on public.mission_days for select
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_days.mission_id
        and (m.status = 'open' or public.is_structure_owner(m.structure_id))
    )
  );

drop policy if exists "mission_days: owner insert" on public.mission_days;
create policy "mission_days: owner insert"
  on public.mission_days for insert
  with check (
    exists (
      select 1 from public.missions m
      where m.id = mission_days.mission_id
        and public.is_structure_owner(m.structure_id)
    )
  );

drop policy if exists "mission_days: owner update" on public.mission_days;
create policy "mission_days: owner update"
  on public.mission_days for update
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_days.mission_id
        and public.is_structure_owner(m.structure_id)
    )
  )
  with check (
    exists (
      select 1 from public.missions m
      where m.id = mission_days.mission_id
        and public.is_structure_owner(m.structure_id)
    )
  );

drop policy if exists "mission_days: owner delete" on public.mission_days;
create policy "mission_days: owner delete"
  on public.mission_days for delete
  using (
    exists (
      select 1 from public.missions m
      where m.id = mission_days.mission_id
        and public.is_structure_owner(m.structure_id)
    )
  );

grant select on public.mission_days to anon, authenticated;
grant insert, update, delete on public.mission_days to authenticated;

create or replace function public.mission_day_name(p_date timestamptz)
returns text
language sql stable
as $$
  select case extract(isodow from p_date at time zone 'Europe/Paris')::int
    when 1 then 'monday'
    when 2 then 'tuesday'
    when 3 then 'wednesday'
    when 4 then 'thursday'
    when 5 then 'friday'
    when 6 then 'saturday'
    else 'sunday'
  end
$$;

create or replace function public.mission_time_slot(p_start timestamptz, p_end timestamptz)
returns text
language plpgsql stable
as $$
declare
  v_hour int;
begin
  if (p_end at time zone 'Europe/Paris')::date > (p_start at time zone 'Europe/Paris')::date then
    return 'night';
  end if;
  v_hour := extract(hour from p_start at time zone 'Europe/Paris')::int;
  if v_hour >= 5 and v_hour < 12 then
    return 'morning';
  elsif v_hour >= 12 and v_hour < 18 then
    return 'afternoon';
  elsif v_hour >= 18 and v_hour < 22 then
    return 'evening';
  end if;
  return 'night';
end;
$$;

create or replace function public.missions_apply_slots()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  s jsonb;
  v_date date;
  v_start time;
  v_end time;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_duration integer;
  v_total integer := 0;
  v_min_start timestamptz := null;
  v_max_end timestamptz := null;
  v_start_dates date[] := '{}';
  v_days integer;
  v_positions integer;
  v_worker_amount numeric;
  v_worker_subtotal numeric;
begin
  v_positions := greatest(coalesce(nullif(new.positions, 0), nullif(new.places, 0), 1), 1);
  new.positions := v_positions;
  new.places := v_positions;
  new.location := coalesce(nullif(new.location, ''), nullif(new.address, ''), new.city);

  if new.slots is not null then
    if jsonb_typeof(new.slots) <> 'array' or jsonb_array_length(new.slots) = 0 then
      raise exception 'Planning invalide.';
    end if;
    if jsonb_array_length(new.slots) > 12 then
      raise exception '12 créneaux maximum.';
    end if;

    for s in select * from jsonb_array_elements(new.slots)
    loop
      v_date := (s ->> 'date')::date;
      v_start := (s ->> 'start')::time;
      v_end := (s ->> 'end')::time;
      if v_date is null or v_start is null or v_end is null then
        raise exception 'Chaque jour doit avoir une date, une heure de début et une heure de fin.';
      end if;
      if v_end = v_start then
        raise exception 'La durée ne peut pas être nulle (%).', v_date;
      end if;

      v_start_at := (v_date::text || ' ' || v_start::text || ' Europe/Paris')::timestamptz;
      v_end_at := ((case when v_end < v_start then (v_date + 1) else v_date end)::text || ' ' || v_end::text || ' Europe/Paris')::timestamptz;
      v_duration := (extract(epoch from (v_end_at - v_start_at)) / 60)::int;
      if v_duration <= 0 then
        raise exception 'Durée invalide (%).', v_date;
      end if;

      v_total := v_total + v_duration;
      if v_min_start is null or v_start_at < v_min_start then
        v_min_start := v_start_at;
      end if;
      if v_max_end is null or v_end_at > v_max_end then
        v_max_end := v_end_at;
      end if;
      if not v_date = any(v_start_dates) then
        v_start_dates := array_append(v_start_dates, v_date);
      end if;
    end loop;

    v_days := coalesce(array_length(v_start_dates, 1), 1);
    if v_days > 3 then
      raise exception 'Une mission dure 3 jours maximum.';
    end if;
    if v_total < 60 then
      raise exception 'Durée totale minimale : 1 heure.';
    end if;
    if v_total > 4320 then
      raise exception 'Durée totale maximale : 3 jours.';
    end if;

    new.starts_at := v_min_start;
    new.ends_at := v_max_end;
    new.duration_minutes := v_total;
    new.duration_minutes_per_person := v_total;
    new.scheduled_date := (v_min_start at time zone 'Europe/Paris')::date;
    new.start_time := (v_min_start at time zone 'Europe/Paris')::time;
    new.mission_days := v_days;
    new.day_of_week := public.mission_day_name(v_min_start);
    new.time_slot := public.mission_time_slot(v_min_start, v_max_end);
  end if;

  new.duration_minutes_per_person := coalesce(new.duration_minutes_per_person, new.duration_minutes);
  new.starts_at := coalesce(new.starts_at, (new.scheduled_date::text || ' ' || coalesce(new.start_time, '09:00'::time)::text || ' Europe/Paris')::timestamptz);
  new.ends_at := coalesce(new.ends_at, new.starts_at + make_interval(mins => new.duration_minutes));
  new.mission_days := coalesce(new.mission_days, 1);
  new.day_of_week := coalesce(new.day_of_week, public.mission_day_name(new.starts_at));
  new.time_slot := coalesce(new.time_slot, public.mission_time_slot(new.starts_at, new.ends_at));

  if new.is_solidaire then
    new.hourly_rate := coalesce(new.hourly_rate, 0);
    new.worker_amount := 0;
    new.worker_subtotal := 0;
    new.service_fee := 0;
    new.structure_total := 0;
    new.worker_rate_cents := 0;
    new.base_rate_cents := 0;
  else
    v_worker_amount := coalesce(nullif(new.worker_amount, 0), greatest(coalesce(new.worker_rate_cents, 0), 0) / 100.0);
    new.worker_amount := round(v_worker_amount, 2);
    v_worker_subtotal := coalesce(nullif(new.worker_subtotal, 0), new.worker_amount * v_positions);
    new.worker_subtotal := round(v_worker_subtotal, 2);
    new.service_fee := round(coalesce(nullif(new.service_fee, 0), new.worker_subtotal * 0.18), 2);
    new.structure_total := round(coalesce(nullif(new.structure_total, 0), new.worker_subtotal + new.service_fee), 2);
    new.worker_rate_cents := greatest(round(new.worker_amount * 100)::int, 1);
    new.base_rate_cents := coalesce(new.base_rate_cents, new.worker_rate_cents);
  end if;

  new.total_worker_hours := round((new.duration_minutes_per_person / 60.0) * v_positions, 2);
  return new;
end;
$$;

create or replace function public.missions_sync_days()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  s jsonb;
  v_date date;
  v_start time;
  v_end time;
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_duration integer;
begin
  delete from public.mission_days where mission_id = new.id;
  if new.slots is null then
    insert into public.mission_days(mission_id, date, starts_at, ends_at, duration_minutes)
    values (new.id, (new.starts_at at time zone 'Europe/Paris')::date, new.starts_at, new.ends_at, new.duration_minutes_per_person);
    return new;
  end if;

  for s in select * from jsonb_array_elements(new.slots)
  loop
    v_date := (s ->> 'date')::date;
    v_start := (s ->> 'start')::time;
    v_end := (s ->> 'end')::time;
    v_start_at := (v_date::text || ' ' || v_start::text || ' Europe/Paris')::timestamptz;
    v_end_at := ((case when v_end < v_start then (v_date + 1) else v_date end)::text || ' ' || v_end::text || ' Europe/Paris')::timestamptz;
    v_duration := (extract(epoch from (v_end_at - v_start_at)) / 60)::int;
    insert into public.mission_days(mission_id, date, starts_at, ends_at, duration_minutes)
    values (new.id, v_date, v_start_at, v_end_at, v_duration);
  end loop;

  return new;
end;
$$;

create or replace function public.missions_apply_pricing()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v jsonb;
begin
  if new.is_solidaire then
    new.base_rate_cents := 0;
    new.worker_rate_cents := 0;
    new.pricing_breakdown := null;
    return new;
  end if;

  if new.worker_amount is not null and new.worker_amount > 0 then
    new.base_rate_cents := greatest(round(new.worker_amount * 100)::int, 1);
    new.worker_rate_cents := new.base_rate_cents;
    new.pricing_breakdown := jsonb_build_object(
      'source', 'structure_schedule_form',
      'worker_amount', new.worker_amount,
      'worker_subtotal', new.worker_subtotal,
      'service_fee', new.service_fee,
      'structure_total', new.structure_total,
      'positions', new.positions,
      'duration_minutes_per_person', new.duration_minutes_per_person,
      'total_worker_hours', new.total_worker_hours
    );
    return new;
  end if;

  new.base_rate_cents := greatest(coalesce(new.base_rate_cents, new.worker_rate_cents), 1);
  if to_regprocedure('public.compute_mission_pricing(uuid,integer,date,time without time zone,integer,text,integer,boolean,numeric)') is not null then
    execute 'select public.compute_mission_pricing($1,$2,$3,$4,$5,$6,$7,$8,$9)'
      into v
      using
        new.structure_id,
        new.base_rate_cents,
        new.scheduled_date,
        new.start_time,
        new.duration_minutes,
        coalesce(new.sector, 'autre'),
        coalesce(new.difficulty, 1),
        coalesce(new.is_urgent, false),
        new.distance_km;
  else
    v := jsonb_build_object(
      'base_cents', new.base_rate_cents,
      'adjustments', '[]'::jsonb,
      'total_cents', new.base_rate_cents
    );
  end if;
  new.worker_rate_cents := greatest((v ->> 'total_cents')::int, 1);
  new.pricing_breakdown := v;
  return new;
end;
$$;

drop trigger if exists missions_apply_slots on public.missions;
create trigger missions_apply_slots
  before insert or update of slots, places, positions, worker_amount, worker_subtotal, service_fee, structure_total, is_solidaire
  on public.missions
  for each row execute function public.missions_apply_slots();

drop trigger if exists missions_sync_days on public.missions;
create trigger missions_sync_days
  after insert or update of slots, starts_at, ends_at, duration_minutes_per_person
  on public.missions
  for each row execute function public.missions_sync_days();

drop trigger if exists missions_apply_pricing on public.missions;
drop trigger if exists zz_missions_apply_pricing on public.missions;
create trigger zz_missions_apply_pricing
  before insert or update of worker_amount, is_solidaire, base_rate_cents, worker_rate_cents
  on public.missions
  for each row execute function public.missions_apply_pricing();

revoke execute on function public.missions_apply_slots() from public, anon, authenticated;
revoke execute on function public.missions_sync_days() from public, anon, authenticated;
revoke execute on function public.missions_apply_pricing() from public, anon, authenticated;

-- ============ 0020_kyc_verifications.sql ============
-- 0020 : parcours KYC (verification d'identite + IBAN) declenche a la
-- premiere mission remuneree acceptee par un travailleur.
--
-- Principes :
--   * Les documents d'identite ne sont JAMAIS stockes dans une table publique :
--     ils vivent dans un bucket Supabase prive (kyc-documents) protege par des
--     policies RLS strictes (chaque utilisateur n'accede qu'a son propre dossier).
--   * Chaque changement de statut est historise dans kyc_status_history.
--   * Le module fondateur agit en mode SIMULATION via des RPC dediees, gardees
--     par un code d'acces. L'architecture (colonnes provider / provider_ref, la
--     source d'historique, les RPC isolees, le trigger de garde paiement) permet
--     de brancher les webhooks Lemonway plus tard sans refonte : il suffira
--     d'appeler set_config('app.kyc_source','lemonway_webhook', true) puis de
--     mettre a jour le statut depuis une Edge Function en service_role.
--
-- Statuts : unverified | info_required | pending | verified | rejected
--   unverified    -> Non verifie (dossier pas encore soumis)
--   info_required -> Informations a completer (le fondateur/Lemonway a demande un doc)
--   pending       -> Verification en cours (dossier soumis, en attente de decision)
--   verified      -> Verifie (paiements autorises)
--   rejected      -> Refuse

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'unverified'
    check (status in ('unverified', 'info_required', 'pending', 'verified', 'rejected')),
  full_name text,
  -- IBAN au nom de l'utilisateur : donnee sensible, lisible uniquement par son
  -- proprietaire (RLS). Les RPC fondateur n'en exposent que les 4 derniers
  -- chiffres. En production, l'IBAN devrait plutot transiter vers Lemonway.
  iban text,
  document_type text check (document_type in ('id_card', 'passport', 'residence_permit')),
  -- Chemin (reference) du fichier dans le bucket prive, jamais le contenu.
  document_path text,
  missing_info text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  provider text not null default 'simulation' check (provider in ('simulation', 'lemonway')),
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kyc_verifications_status_idx on public.kyc_verifications(status);
create index if not exists kyc_verifications_user_idx on public.kyc_verifications(user_id);

create table if not exists public.kyc_status_history (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.kyc_verifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  from_status text,
  to_status text not null,
  reason text,
  source text not null default 'user'
    check (source in ('user', 'simulation', 'lemonway_webhook', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists kyc_status_history_verification_idx on public.kyc_status_history(verification_id);
create index if not exists kyc_status_history_user_idx on public.kyc_status_history(user_id);

-- ---------------------------------------------------------------------------
-- Triggers : updated_at + journalisation de tout changement de statut
-- ---------------------------------------------------------------------------
create or replace function public.kyc_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists kyc_touch_updated_at on public.kyc_verifications;
create trigger kyc_touch_updated_at
  before update on public.kyc_verifications
  for each row execute function public.kyc_touch_updated_at();

-- Journalise chaque transition de statut, quelle que soit la source (worker,
-- simulation fondateur, futur webhook Lemonway). La source et la raison sont
-- lues depuis des variables de session posees par l'appelant ; par defaut la
-- source est 'user' (soumission par le travailleur lui-meme).
create or replace function public.kyc_log_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.kyc_status_history(verification_id, user_id, from_status, to_status, reason, source)
    values (
      new.id,
      new.user_id,
      case when tg_op = 'UPDATE' then old.status else null end,
      new.status,
      nullif(current_setting('app.kyc_reason', true), ''),
      coalesce(nullif(current_setting('app.kyc_source', true), ''), 'user')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists kyc_log_status_change on public.kyc_verifications;
create trigger kyc_log_status_change
  after insert or update of status on public.kyc_verifications
  for each row execute function public.kyc_log_status_change();

-- ---------------------------------------------------------------------------
-- RLS : un utilisateur ne voit et ne modifie que son propre dossier ; il ne
-- peut jamais s'auto-verifier ni s'auto-refuser (ces transitions passent par
-- les RPC fondateur security definer, ou plus tard par une Edge Function).
-- ---------------------------------------------------------------------------
alter table public.kyc_verifications enable row level security;
alter table public.kyc_status_history enable row level security;

drop policy if exists "kyc: owner read own" on public.kyc_verifications;
create policy "kyc: owner read own"
  on public.kyc_verifications for select
  using (user_id = auth.uid());

drop policy if exists "kyc: owner insert own" on public.kyc_verifications;
create policy "kyc: owner insert own"
  on public.kyc_verifications for insert
  with check (user_id = auth.uid() and status in ('unverified', 'pending'));

drop policy if exists "kyc: owner update own" on public.kyc_verifications;
create policy "kyc: owner update own"
  on public.kyc_verifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and status in ('unverified', 'pending'));

drop policy if exists "kyc_history: owner read own" on public.kyc_status_history;
create policy "kyc_history: owner read own"
  on public.kyc_status_history for select
  using (user_id = auth.uid());

grant select, insert, update on public.kyc_verifications to authenticated;
grant select on public.kyc_status_history to authenticated;

-- ---------------------------------------------------------------------------
-- Bucket prive pour les pieces d'identite + policies storage strictes.
-- Chemin attendu : "{user_id}/piece-identite-*.<ext>". La 1re composante du
-- chemin doit etre l'uid de l'utilisateur connecte.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

drop policy if exists "kyc docs: owner read" on storage.objects;
create policy "kyc docs: owner read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc docs: owner insert" on storage.objects;
create policy "kyc docs: owner insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc docs: owner update" on storage.objects;
create policy "kyc docs: owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "kyc docs: owner delete" on storage.objects;
create policy "kyc docs: owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- RPC fondateur (mode SIMULATION), gardees par un code d'acces.
--
-- SECURITE / PROTOTYPE : le code est verifie cote serveur dans la fonction,
-- mais reste un simple secret partage. En production il DOIT etre remplace par
-- une vraie autorisation (role admin dedie / claim JWT), et les changements de
-- statut reels doivent venir des webhooks Lemonway via une Edge Function en
-- service_role (source d'historique 'lemonway_webhook'). Les documents et
-- l'IBAN complet ne sont jamais renvoyes par ces fonctions.
-- ---------------------------------------------------------------------------
create or replace function public.founder_list_verifications(p_passcode text)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  status text,
  document_type text,
  iban_masked text,
  missing_info text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  provider text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if p_passcode is distinct from 'AGORA59' then
    raise exception 'Code fondateur invalide.' using errcode = '28000';
  end if;

  return query
    select
      k.id,
      k.user_id,
      coalesce(k.full_name, p.full_name),
      k.status,
      k.document_type,
      case
        when k.iban is null or length(regexp_replace(k.iban, '\s', '', 'g')) < 4 then null
        else '•••• ' || right(regexp_replace(k.iban, '\s', '', 'g'), 4)
      end,
      k.missing_info,
      k.rejection_reason,
      k.submitted_at,
      k.reviewed_at,
      k.provider,
      k.created_at,
      k.updated_at
    from public.kyc_verifications k
    left join public.profiles p on p.id = k.user_id
    order by
      case k.status
        when 'pending' then 0
        when 'info_required' then 1
        when 'verified' then 2
        when 'rejected' then 3
        else 4
      end,
      k.submitted_at desc nulls last,
      k.created_at desc;
end;
$$;

create or replace function public.founder_verification_history(p_passcode text, p_verification_id uuid)
returns table (
  id uuid,
  from_status text,
  to_status text,
  reason text,
  source text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if p_passcode is distinct from 'AGORA59' then
    raise exception 'Code fondateur invalide.' using errcode = '28000';
  end if;

  return query
    select h.id, h.from_status, h.to_status, h.reason, h.source, h.created_at
    from public.kyc_status_history h
    where h.verification_id = p_verification_id
    order by h.created_at desc;
end;
$$;

create or replace function public.founder_set_verification_status(
  p_passcode text,
  p_verification_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_passcode is distinct from 'AGORA59' then
    raise exception 'Code fondateur invalide.' using errcode = '28000';
  end if;
  if p_status not in ('verified', 'rejected', 'info_required') then
    raise exception 'Statut fondateur invalide : %', p_status;
  end if;

  -- Source d'historique = simulation. Remplacer par 'lemonway_webhook' quand
  -- la decision viendra de l'API Lemonway.
  perform set_config('app.kyc_source', 'simulation', true);
  perform set_config('app.kyc_reason', coalesce(p_reason, ''), true);

  update public.kyc_verifications
    set status = p_status,
        reviewed_at = now(),
        rejection_reason = case when p_status = 'rejected' then p_reason else null end,
        missing_info = case when p_status = 'info_required' then p_reason else null end
    where id = p_verification_id;

  if not found then
    raise exception 'Vérification introuvable.';
  end if;
end;
$$;

grant execute on function public.founder_list_verifications(text) to anon, authenticated;
grant execute on function public.founder_verification_history(text, uuid) to anon, authenticated;
grant execute on function public.founder_set_verification_status(text, uuid, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Garde paiement : tant qu'un travailleur n'est pas 'verified', aucune ligne
-- payments ne peut etre creee pour lui (barriere non contournable en base,
-- meme depuis une Edge Function en service_role, qui declenche aussi le trigger).
-- ---------------------------------------------------------------------------
create or replace function public.enforce_kyc_before_payment()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.applications a
    join public.kyc_verifications k on k.user_id = a.worker_id
    where a.id = new.application_id and k.status = 'verified'
  ) then
    raise exception 'Paiement bloqué : le compte du travailleur n''est pas vérifié (KYC).'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_kyc_before_payment on public.payments;
create trigger enforce_kyc_before_payment
  before insert on public.payments
  for each row execute function public.enforce_kyc_before_payment();

-- Les fonctions de trigger ne doivent pas etre appelables directement.
revoke execute on function public.kyc_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.kyc_log_status_change() from public, anon, authenticated;
revoke execute on function public.enforce_kyc_before_payment() from public, anon, authenticated;
