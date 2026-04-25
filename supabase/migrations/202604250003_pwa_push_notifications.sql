begin;

alter table public.client_preferences
  add column if not exists push_booking_updates boolean not null default false;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh_key text not null,
  auth_key text not null,
  device_kind text not null default 'mobile'
    check (device_kind in ('mobile', 'tablet', 'desktop', 'unknown')),
  user_agent text,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  last_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_check
    check (char_length(endpoint) between 20 and 2000 and endpoint ~* '^https://'),
  constraint push_subscriptions_p256dh_key_check
    check (char_length(p256dh_key) between 16 and 512),
  constraint push_subscriptions_auth_key_check
    check (char_length(auth_key) between 8 and 512),
  constraint push_subscriptions_user_agent_check
    check (user_agent is null or char_length(user_agent) <= 500),
  constraint push_subscriptions_last_error_check
    check (last_error is null or char_length(last_error) <= 500)
);

create index if not exists push_subscriptions_user_active_idx
  on public.push_subscriptions(user_id, is_active, updated_at desc);

drop trigger if exists touch_push_subscriptions on public.push_subscriptions;
create trigger touch_push_subscriptions before update on public.push_subscriptions
  for each row execute function public.touch_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own_select on public.push_subscriptions;
create policy push_subscriptions_own_select on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists push_subscriptions_own_insert on public.push_subscriptions;
create policy push_subscriptions_own_insert on public.push_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists push_subscriptions_own_update on public.push_subscriptions;
create policy push_subscriptions_own_update on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists push_subscriptions_own_delete on public.push_subscriptions;
create policy push_subscriptions_own_delete on public.push_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

revoke all on public.push_subscriptions from anon;

alter table public.notifications
  drop constraint if exists notifications_channel_check;

alter table public.notifications
  add constraint notifications_channel_check
  check (channel in ('email', 'whatsapp', 'push'));

commit;
