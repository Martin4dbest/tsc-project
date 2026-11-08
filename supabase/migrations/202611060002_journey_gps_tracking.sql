-- TSC: Secure GPS location history for active journeys.
-- Location capture requires explicit traveller consent.
-- GPS records are append-only for authenticated clients.

create table if not exists public.journey_location_updates (
  id uuid primary key default gen_random_uuid(),

  journey_id uuid not null
    references public.journeys(id)
    on delete cascade,

  traveller_id uuid not null
    references public.profiles(user_id)
    on delete restrict,

  latitude double precision not null
    check (latitude between -90 and 90),

  longitude double precision not null
    check (longitude between -180 and 180),

  accuracy_meters double precision
    check (accuracy_meters is null or accuracy_meters >= 0),

  altitude_meters double precision,

  speed_meters_per_second double precision
    check (
      speed_meters_per_second is null
      or speed_meters_per_second >= 0
    ),

  heading_degrees double precision
    check (
      heading_degrees is null
      or heading_degrees between 0 and 360
    ),

  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists journey_location_updates_journey_time_idx
  on public.journey_location_updates(journey_id, recorded_at desc);

create index if not exists journey_location_updates_traveller_time_idx
  on public.journey_location_updates(traveller_id, recorded_at desc);

alter table public.journey_location_updates
  enable row level security;

-- A traveller can read only their own journey location history.
-- Authorised journey administrators can read records for monitoring.
drop policy if exists "Journey owners and permitted admins can read GPS updates"
  on public.journey_location_updates;

create policy "Journey owners and permitted admins can read GPS updates"
on public.journey_location_updates
for select
to authenticated
using (
  traveller_id = (select auth.uid())
  or (select public.tsc_has_permission('journeys.view'))
  or (select public.tsc_has_permission('journeys.manage'))
);

-- Only the authenticated journey owner can submit GPS records.
-- The journey must be active and location sharing must be enabled.
drop policy if exists "Travellers can submit consented active journey GPS updates"
  on public.journey_location_updates;

create policy "Travellers can submit consented active journey GPS updates"
on public.journey_location_updates
for insert
to authenticated
with check (
  traveller_id = (select auth.uid())
  and exists (
    select 1
    from public.journeys j
    where j.id = journey_id
      and j.traveller_id = (select auth.uid())
      and j.status = 'active'
      and j.location_sharing_enabled = true
      and j.location_sharing_consent_at is not null
  )
);

-- Authenticated clients can read and insert only.
-- No client-side update or delete access to GPS history.
revoke all on public.journey_location_updates from anon, authenticated;

grant select, insert
  on public.journey_location_updates to authenticated;
