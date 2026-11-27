-- ============================================================
-- TSC MOBILE PUSH NOTIFICATIONS
-- Secure device token registration and delivery tracking
-- ============================================================

create table if not exists public.tsc_push_tokens (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(user_id) on delete cascade,

  expo_push_token text not null unique,

  device_platform text not null
    check (device_platform in ('android', 'ios')),

  device_name text,

  last_seen_at timestamptz not null default now(),

  disabled_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists tsc_push_tokens_user_idx
  on public.tsc_push_tokens(user_id)
  where disabled_at is null;

alter table public.tsc_push_tokens enable row level security;

drop policy if exists "Users can view their own push tokens"
  on public.tsc_push_tokens;

create policy "Users can view their own push tokens"
on public.tsc_push_tokens
for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users can register their own push tokens"
  on public.tsc_push_tokens;

create policy "Users can register their own push tokens"
on public.tsc_push_tokens
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own push tokens"
  on public.tsc_push_tokens;

create policy "Users can update their own push tokens"
on public.tsc_push_tokens
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users can remove their own push tokens"
  on public.tsc_push_tokens;

create policy "Users can remove their own push tokens"
on public.tsc_push_tokens
for delete
to authenticated
using (user_id = (select auth.uid()));

revoke all on public.tsc_push_tokens from anon, authenticated;

grant select, insert, update, delete
on public.tsc_push_tokens to authenticated;

-- Track push delivery separately from the immutable wallet ledger.
alter table public.tsc_notifications
  add column if not exists push_status text not null default 'pending'
    check (push_status in ('pending', 'sent', 'failed', 'skipped'));

alter table public.tsc_notifications
  add column if not exists push_sent_at timestamptz;

alter table public.tsc_notifications
  add column if not exists push_attempts integer not null default 0
    check (push_attempts >= 0);

alter table public.tsc_notifications
  add column if not exists push_error text;

create index if not exists tsc_notifications_push_pending_idx
  on public.tsc_notifications(created_at)
  where push_status = 'pending';

-- Only trusted server-side processes may change delivery tracking.
revoke update (
  push_status,
  push_sent_at,
  push_attempts,
  push_error
) on public.tsc_notifications from authenticated, anon;

