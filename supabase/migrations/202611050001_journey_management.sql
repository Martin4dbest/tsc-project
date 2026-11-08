-- TSC: Shared Journey Management foundation
-- Supports Traveller Web, Mobile Web, Android, iOS and Admin.
-- Access is enforced by Supabase Row Level Security.

create table if not exists public.journeys (
  id uuid primary key default gen_random_uuid(),

  traveller_id uuid not null
    references public.profiles(user_id)
    on delete restrict,

  journey_name text not null
    check (char_length(trim(journey_name)) between 1 and 160),

  origin_name text not null
    check (char_length(trim(origin_name)) between 1 and 200),

  origin_address text,
  origin_latitude numeric(9,6),
  origin_longitude numeric(9,6),

  destination_name text not null
    check (char_length(trim(destination_name)) between 1 and 200),

  destination_address text,
  destination_latitude numeric(9,6),
  destination_longitude numeric(9,6),

  departure_at timestamptz not null,
  departure_timezone text not null,

  expected_arrival_at timestamptz,
  arrival_timezone text,

  transport_mode text not null default 'other'
    check (
      transport_mode in (
        'air',
        'road',
        'rail',
        'sea',
        'other'
      )
    ),

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'scheduled',
        'active',
        'completed',
        'cancelled'
      )
    ),

  notes text,

  location_sharing_enabled boolean not null default false,
  location_sharing_consent_at timestamptz,

  started_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint journeys_arrival_after_departure
    check (
      expected_arrival_at is null
      or expected_arrival_at > departure_at
    ),

  constraint journeys_origin_coordinates_valid
    check (
      (origin_latitude is null and origin_longitude is null)
      or (
        origin_latitude between -90 and 90
        and origin_longitude between -180 and 180
      )
    ),

  constraint journeys_destination_coordinates_valid
    check (
      (destination_latitude is null and destination_longitude is null)
      or (
        destination_latitude between -90 and 90
        and destination_longitude between -180 and 180
      )
    ),

  constraint journeys_location_consent_required
    check (
      location_sharing_enabled = false
      or location_sharing_consent_at is not null
    )
);

create index if not exists journeys_traveller_idx
  on public.journeys(traveller_id, created_at desc);

create index if not exists journeys_status_departure_idx
  on public.journeys(status, departure_at);

create index if not exists journeys_departure_idx
  on public.journeys(departure_at);

-- Maintain timestamps and validate journey status transitions.
create or replace function public.tsc_validate_journey_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  valid_transition boolean := false;
begin
  new.updated_at := pg_catalog.now();

  if tg_op = 'INSERT' then
    if new.status <> 'draft'
       and not public.tsc_has_permission('journeys.manage') then
      raise exception 'New traveller journeys must begin as drafts.'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if new.traveller_id <> old.traveller_id then
    raise exception 'Journey ownership cannot be changed.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is null then
      raise exception 'Authentication required.'
        using errcode = '42501';
    end if;

    if auth.uid() <> old.traveller_id
       and not public.tsc_has_permission('journeys.manage') then
      raise exception 'You are not permitted to change this journey status.'
        using errcode = '42501';
    end if;

    valid_transition :=
      (old.status = 'draft'
        and new.status in ('scheduled', 'cancelled'))
      or
      (old.status = 'scheduled'
        and new.status in ('active', 'cancelled'))
      or
      (old.status = 'active'
        and new.status in ('completed', 'cancelled'));

    if not valid_transition then
      raise exception 'Invalid journey status transition: % to %.',
        old.status, new.status
        using errcode = '22023';
    end if;

    if new.status = 'active' then
      new.started_at := coalesce(new.started_at, pg_catalog.now());
    end if;

    if new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, pg_catalog.now());
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists journeys_validate_update
  on public.journeys;

create trigger journeys_validate_update
before insert or update on public.journeys
for each row
execute function public.tsc_validate_journey_update();

alter table public.journeys enable row level security;

-- Travellers see their own journeys.
-- Admins need journeys.view or journeys.manage.
drop policy if exists "Journey owners and permitted admins can read"
  on public.journeys;

create policy "Journey owners and permitted admins can read"
on public.journeys
for select
to authenticated
using (
  traveller_id = (select auth.uid())
  or (select public.tsc_has_permission('journeys.view'))
  or (select public.tsc_has_permission('journeys.manage'))
);

-- Travellers can create drafts for their own active accounts.
-- Permitted administrators can create journeys operationally.
drop policy if exists "Travellers and permitted admins can create journeys"
  on public.journeys;

create policy "Travellers and permitted admins can create journeys"
on public.journeys
for insert
to authenticated
with check (
  (
    traveller_id = (select auth.uid())
    and status = 'draft'
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.role = 'traveller'
        and p.account_status = 'active'
    )
  )
  or (select public.tsc_has_permission('journeys.manage'))
);

-- Owners can manage their own journeys.
-- Admin management requires the journeys.manage permission.
drop policy if exists "Journey owners and permitted admins can update"
  on public.journeys;

create policy "Journey owners and permitted admins can update"
on public.journeys
for update
to authenticated
using (
  traveller_id = (select auth.uid())
  or (select public.tsc_has_permission('journeys.manage'))
)
with check (
  traveller_id = (select auth.uid())
  or (select public.tsc_has_permission('journeys.manage'))
);

drop policy if exists "Journey owners and permitted admins can delete"
  on public.journeys;

create policy "Journey owners and permitted admins can delete"
on public.journeys
for delete
to authenticated
using (
  (
    traveller_id = (select auth.uid())
    and status = 'draft'
  )
  or (select public.tsc_has_permission('journeys.manage'))
);

revoke all on public.journeys from anon, authenticated;
grant select, insert, update, delete
  on public.journeys to authenticated;

revoke all on function public.tsc_validate_journey_update()
  from public, anon, authenticated;

