-- 0007 : inscription enrichie + abonnement structure.
--
-- - profiles : date de naissance, adresse, ville, telephone — renseignes a
--   l'inscription et stockes par handle_new_user.
-- - structures : un abonnement actif est requis pour publier une mission.
--   Le verrou est un trigger en base (pas contournable cote client).
--   Le compte fondateur publie sans abonnement.

alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists address text;

alter table public.structures add column if not exists subscription_active boolean not null default false;
alter table public.structures add column if not exists subscribed_at timestamptz;

-- ---------------------------------------------------------------------------
-- Fondateur : seul compte autorise a publier sans abonnement.
-- ---------------------------------------------------------------------------
create or replace function public.is_founder()
returns boolean
language sql
stable
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'fodesanoussy178@gmail.com'
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user : stocke aussi ville, telephone, date de naissance et
-- adresse passes dans les metadonnees de signUp().
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, city, phone, birth_date, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'worker'),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'birth_date', '') ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'birth_date')::date
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'address', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- subscribe_structure : active l'abonnement de sa propre structure.
-- Beta : activation directe, sans paiement. Quand le paiement reel arrivera
-- (Stripe/Lemonway via Edge Function), c'est le webhook de paiement
-- (service_role) qui appellera cette logique, plus le client.
-- ---------------------------------------------------------------------------
create or replace function public.subscribe_structure(p_structure_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.structures
  set subscription_active = true,
      subscribed_at = now()
  where id = p_structure_id
    and owner_id = auth.uid();
  if not found then
    raise exception 'Structure introuvable ou non autorisee.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Verrou de publication : mission -> abonnement actif obligatoire,
-- sauf pour le fondateur.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_structure_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
begin
  if public.is_founder() then
    return new;
  end if;
  select subscription_active into v_active
  from public.structures
  where id = new.structure_id;
  if not coalesce(v_active, false) then
    raise exception 'Abonnement requis : abonne ta structure pour publier des missions.';
  end if;
  return new;
end;
$$;

drop trigger if exists missions_require_subscription on public.missions;
create trigger missions_require_subscription
  before insert on public.missions
  for each row execute function public.enforce_structure_subscription();

-- Durcissement (lints Supabase) :
-- la fonction de trigger ne doit pas etre appelable via l'API REST, et
-- l'abonnement se declenche cote authentifie uniquement (jamais anon).
revoke all on function public.enforce_structure_subscription() from anon, authenticated;
revoke all on function public.subscribe_structure(uuid) from anon;
