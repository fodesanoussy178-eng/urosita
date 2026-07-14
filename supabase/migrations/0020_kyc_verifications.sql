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
