-- TSC: Emergency Operations foundation.
-- Supports traveller SOS alerts, responder assignment,
-- emergency status management, activity history and realtime monitoring.

create table if not exists public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),

  traveller_id uuid not null
    references public.profiles(user_id)
    on delete restrict,

  journey_id uuid
    references public.journeys(id)
    on delete set null,

  category text not null default 'other'
    check (
      category in (
        'medical',
        'accident',
        'security',
        'natural_disaster',
        'transport',
        'other'
      )
    ),

  severity text not null default 'high'
    check (
      severity in (
        'low',
        'moderate',
        'high',
        'critical'
      )
    ),

  status text not null default 'reported'
    check (
      status in (
        'reported',
        'acknowledged',
        'assigned',
        'responding',
        'resolved',
        'cancelled'
      )
    ),

  title text not null
    check (char_length(trim(title)) between 1 and 160),

  description text,

  latitude double precision
    check (latitude is null or latitude between -90 and 90),

  longitude double precision
    check (longitude is null or longitude between -180 and 180),

  location_accuracy_meters double precision
    check (
      location_accuracy_meters is null
      or location_accuracy_meters >= 0
    ),

  location_address text,

  assigned_responder_id uuid
    references public.profiles(user_id)
    on delete set null,

  reported_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  assigned_at timestamptz,
  responding_at timestamptz,
  resolved_at timestamptz,
  cancelled_at timestamptz,

  resolution_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint emergency_alert_coordinates_complete
    check (
      (latitude is null and longitude is null)
      or (latitude is not null and longitude is not null)
    ),

  constraint emergency_alert_journey_owner
    check (journey_id is null or traveller_id is not null)
);

create index if not exists emergency_alerts_traveller_idx
  on public.emergency_alerts(traveller_id, reported_at desc);

create index if not exists emergency_alerts_status_idx
  on public.emergency_alerts(status, reported_at desc);

create index if not exists emergency_alerts_severity_idx
  on public.emergency_alerts(severity, reported_at desc);

create index if not exists emergency_alerts_responder_idx
  on public.emergency_alerts(assigned_responder_id, status);

create index if not exists emergency_alerts_journey_idx
  on public.emergency_alerts(journey_id);

-- Chronological emergency activity history.
create table if not exists public.emergency_activity_logs (
  id uuid primary key default gen_random_uuid(),

  emergency_id uuid not null
    references public.emergency_alerts(id)
    on delete cascade,

  actor_user_id uuid
    references public.profiles(user_id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'emergency_reported',
        'emergency_acknowledged',
        'responder_assigned',
        'responder_changed',
        'response_started',
        'emergency_resolved',
        'emergency_cancelled',
        'emergency_updated'
      )
    ),

  details jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists emergency_activity_logs_emergency_idx
  on public.emergency_activity_logs(emergency_id, created_at);

create index if not exists emergency_activity_logs_actor_idx
  on public.emergency_activity_logs(actor_user_id, created_at desc);

alter table public.emergency_alerts
  enable row level security;

alter table public.emergency_activity_logs
  enable row level security;

-- Maintain timestamps and enforce emergency management rules.
create or replace function public.tsc_validate_emergency_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  valid_transition boolean := false;
  journey_owner uuid;
  responder_role text;
  responder_status text;
begin
  new.updated_at := pg_catalog.now();

  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Authentication required.'
        using errcode = '42501';
    end if;

    if new.traveller_id <> auth.uid()
       and not public.tsc_has_permission('emergencies.manage') then
      raise exception 'You cannot create an emergency for another traveller.'
        using errcode = '42501';
    end if;

    if new.traveller_id = auth.uid()
       and not public.tsc_has_permission('emergencies.manage') then

      if new.status <> 'reported' then
        raise exception 'New traveller SOS alerts must begin as reported.'
          using errcode = '42501';
      end if;

      if new.assigned_responder_id is not null then
        raise exception 'Travellers cannot assign emergency responders.'
          using errcode = '42501';
      end if;

      select p.account_status
      into responder_status
      from public.profiles p
      where p.user_id = auth.uid();

      if responder_status is distinct from 'active' then
        raise exception 'An active account is required to report an emergency.'
          using errcode = '42501';
      end if;
    end if;

    if new.journey_id is not null then
      select j.traveller_id
      into journey_owner
      from public.journeys j
      where j.id = new.journey_id;

      if journey_owner is null
         or journey_owner <> new.traveller_id then
        raise exception 'The selected journey does not belong to this traveller.'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  if new.traveller_id is distinct from old.traveller_id then
    raise exception 'Emergency ownership cannot be changed.'
      using errcode = '42501';
  end if;

  if new.reported_at is distinct from old.reported_at then
    raise exception 'Emergency report time cannot be changed.'
      using errcode = '42501';
  end if;

  if new.journey_id is distinct from old.journey_id then
    raise exception 'The linked journey cannot be changed.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     or new.assigned_responder_id is distinct from old.assigned_responder_id
     or new.resolution_notes is distinct from old.resolution_notes then

    if not public.tsc_has_permission('emergencies.manage') then
      raise exception 'Emergency management permission required.'
        using errcode = '42501';
    end if;
  end if;

  if new.assigned_responder_id is not null then
    select p.role, p.account_status
    into responder_role, responder_status
    from public.profiles p
    where p.user_id = new.assigned_responder_id;

    if responder_role not in ('admin', 'super_admin')
       or responder_status is distinct from 'active' then
      raise exception 'The assigned responder must be an active administrator.'
        using errcode = '22023';
    end if;
  end if;

  if new.status is distinct from old.status then
    valid_transition :=
      (old.status = 'reported'
        and new.status in ('acknowledged', 'cancelled'))
      or
      (old.status = 'acknowledged'
        and new.status in ('assigned', 'responding', 'resolved'))
      or
      (old.status = 'assigned'
        and new.status in ('responding', 'resolved'))
      or
      (old.status = 'responding'
        and new.status in ('resolved', 'assigned'));

    if not valid_transition then
      raise exception 'Invalid emergency status transition: % to %.',
        old.status, new.status
        using errcode = '22023';
    end if;

    if new.status = 'acknowledged' then
      new.acknowledged_at := coalesce(
        new.acknowledged_at,
        pg_catalog.now()
      );
    elsif new.status = 'assigned' then
      if new.assigned_responder_id is null then
        raise exception 'Assign a responder before setting status to assigned.'
          using errcode = '22023';
      end if;

      new.assigned_at := pg_catalog.now();
    elsif new.status = 'responding' then
      if new.assigned_responder_id is null then
        raise exception 'Assign a responder before starting the response.'
          using errcode = '22023';
      end if;

      new.responding_at := coalesce(
        new.responding_at,
        pg_catalog.now()
      );
    elsif new.status = 'resolved' then
      new.resolved_at := pg_catalog.now();
    elsif new.status = 'cancelled' then
      new.cancelled_at := pg_catalog.now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists emergency_alerts_validate_update
  on public.emergency_alerts;

create trigger emergency_alerts_validate_update
before insert or update on public.emergency_alerts
for each row
execute function public.tsc_validate_emergency_update();

-- Automatically create activity history for emergency events.
create or replace function public.tsc_log_emergency_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_type text;
  activity_details jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    activity_type := 'emergency_reported';

    activity_details := pg_catalog.jsonb_build_object(
      'category', new.category,
      'severity', new.severity,
      'status', new.status,
      'journey_id', new.journey_id
    );

    insert into public.emergency_activity_logs (
      emergency_id,
      actor_user_id,
      event_type,
      details
    )
    values (
      new.id,
      auth.uid(),
      activity_type,
      activity_details
    );

    return new;
  end if;

  if new.status is distinct from old.status then
    activity_type := case new.status
      when 'acknowledged' then 'emergency_acknowledged'
      when 'assigned' then 'responder_assigned'
      when 'responding' then 'response_started'
      when 'resolved' then 'emergency_resolved'
      when 'cancelled' then 'emergency_cancelled'
      else 'emergency_updated'
    end;

    activity_details := pg_catalog.jsonb_build_object(
      'previous_status', old.status,
      'new_status', new.status
    );

  elsif new.assigned_responder_id is distinct from old.assigned_responder_id then
    activity_type := case
      when old.assigned_responder_id is null
        then 'responder_assigned'
      else 'responder_changed'
    end;

    activity_details := pg_catalog.jsonb_build_object(
      'previous_responder_id', old.assigned_responder_id,
      'new_responder_id', new.assigned_responder_id
    );

  elsif new.resolution_notes is distinct from old.resolution_notes then
    activity_type := 'emergency_updated';

    activity_details := pg_catalog.jsonb_build_object(
      'resolution_notes_updated', true
    );

  else
    return new;
  end if;

  insert into public.emergency_activity_logs (
    emergency_id,
    actor_user_id,
    event_type,
    details
  )
  values (
    new.id,
    auth.uid(),
    activity_type,
    activity_details
  );

  return new;
end;
$$;

drop trigger if exists emergency_alerts_activity_log
  on public.emergency_alerts;

create trigger emergency_alerts_activity_log
after insert or update on public.emergency_alerts
for each row
execute function public.tsc_log_emergency_activity();

-- Travellers can read their own emergency alerts.
-- Emergency administrators can monitor all alerts.
drop policy if exists "Travellers and permitted admins can read emergencies"
  on public.emergency_alerts;

create policy "Travellers and permitted admins can read emergencies"
on public.emergency_alerts
for select
to authenticated
using (
  traveller_id = (select auth.uid())
  or (select public.tsc_has_permission('emergencies.view'))
  or (select public.tsc_has_permission('emergencies.manage'))
);

-- Travellers can report emergencies for themselves.
-- Permitted administrators can create operational records.
drop policy if exists "Travellers and permitted admins can report emergencies"
  on public.emergency_alerts;

create policy "Travellers and permitted admins can report emergencies"
on public.emergency_alerts
for insert
to authenticated
with check (
  (
    traveller_id = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.user_id = (select auth.uid())
        and p.role = 'traveller'
        and p.account_status = 'active'
    )
  )
  or (select public.tsc_has_permission('emergencies.manage'))
);

-- Only permitted emergency administrators can update alerts.
drop policy if exists "Permitted emergency administrators can update emergencies"
  on public.emergency_alerts;

create policy "Permitted emergency administrators can update emergencies"
on public.emergency_alerts
for update
to authenticated
using (
  (select public.tsc_has_permission('emergencies.manage'))
)
with check (
  (select public.tsc_has_permission('emergencies.manage'))
);

-- Emergency activity is visible to the affected traveller
-- and permitted emergency administrators.
drop policy if exists "Travellers and permitted admins can read emergency activity"
  on public.emergency_activity_logs;

create policy "Travellers and permitted admins can read emergency activity"
on public.emergency_activity_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.emergency_alerts e
    where e.id = emergency_id
      and e.traveller_id = (select auth.uid())
  )
  or (select public.tsc_has_permission('emergencies.view'))
  or (select public.tsc_has_permission('emergencies.manage'))
);

-- Activity history is generated only by database triggers.
-- Authenticated clients cannot directly modify or insert audit records.
revoke all on public.emergency_alerts
  from anon, authenticated;

grant select, insert, update
  on public.emergency_alerts to authenticated;

revoke all on public.emergency_activity_logs
  from anon, authenticated;

grant select
  on public.emergency_activity_logs to authenticated;

revoke all on function public.tsc_validate_emergency_update()
  from public, anon, authenticated;

revoke all on function public.tsc_log_emergency_activity()
  from public, anon, authenticated;

-- Enable realtime INSERT/UPDATE events for Admin emergency monitoring.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_alerts'
  ) then
    alter publication supabase_realtime
      add table public.emergency_alerts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_activity_logs'
  ) then
    alter publication supabase_realtime
      add table public.emergency_activity_logs;
  end if;
end
$$;
