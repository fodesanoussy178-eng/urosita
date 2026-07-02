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
create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

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

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- structures
-- ---------------------------------------------------------------------------
create policy "structures: owner full read"
  on public.structures for select
  using (owner_id = auth.uid());

create policy "structures: read via open mission"
  on public.structures for select
  using (
    exists (
      select 1 from public.missions m
      where m.structure_id = public.structures.id and m.status = 'open'
    )
  );

create policy "structures: owner insert"
  on public.structures for insert
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'structure_admin'
    )
  );

create policy "structures: owner update"
  on public.structures for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "structures: owner delete"
  on public.structures for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- missions
-- ---------------------------------------------------------------------------
create policy "missions: read open or own structure"
  on public.missions for select
  using (
    status = 'open'
    or exists (
      select 1 from public.structures s
      where s.id = public.missions.structure_id and s.owner_id = auth.uid()
    )
  );

create policy "missions: owner insert"
  on public.missions for insert
  with check (
    exists (
      select 1 from public.structures s
      where s.id = structure_id and s.owner_id = auth.uid()
    )
  );

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
create policy "applications: worker read own"
  on public.applications for select
  using (worker_id = auth.uid());

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

create policy "applications: worker apply"
  on public.applications for insert
  with check (
    worker_id = auth.uid()
    and exists (
      select 1 from public.missions m
      where m.id = mission_id and m.status = 'open'
    )
  );

create policy "applications: worker cancel own"
  on public.applications for update
  using (worker_id = auth.uid())
  with check (worker_id = auth.uid() and status in ('pending', 'cancelled'));

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
create policy "lemonway_accounts: read own"
  on public.lemonway_accounts for select
  using (profile_id = auth.uid());

create policy "payments: worker reads own"
  on public.payments for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = public.payments.application_id and a.worker_id = auth.uid()
    )
  );

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
create policy "reliability_disputes: worker read own"
  on public.reliability_disputes for select
  using (worker_id = auth.uid());

create policy "reliability_disputes: worker create own"
  on public.reliability_disputes for insert
  with check (worker_id = auth.uid());
