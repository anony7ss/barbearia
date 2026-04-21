-- Corte Nobre Barbearia - admin operations and security hardening
-- Incremental migration. Run after 202604160002_product_security_features.sql.

begin;

alter table public.profiles
  add column if not exists is_active boolean not null default true,
  add column if not exists deleted_at timestamptz,
  add column if not exists internal_notes text;

create index if not exists profiles_active_role_idx
  on public.profiles(role, created_at desc)
  where is_active = true and deleted_at is null;

create index if not exists profiles_deleted_at_idx
  on public.profiles(deleted_at)
  where deleted_at is not null;

create index if not exists appointments_barber_status_starts_idx
  on public.appointments(barber_id, status, starts_at desc);

create index if not exists appointments_customer_phone_idx
  on public.appointments(customer_phone);

create index if not exists audit_logs_table_created_idx
  on public.audit_logs(entity_table, created_at desc);

create table if not exists public.loyalty_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  points_delta integer not null,
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  template text not null,
  scheduled_for timestamptz not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loyalty_events_profile_idx
  on public.loyalty_events(profile_id, created_at desc);

create index if not exists notification_jobs_due_idx
  on public.notification_jobs(status, scheduled_for)
  where status = 'queued';

drop trigger if exists touch_notification_jobs on public.notification_jobs;
create trigger touch_notification_jobs before update on public.notification_jobs
  for each row execute function public.touch_updated_at();

create or replace function public.active_admin_count(p_excluding uuid default null)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.profiles p
  where p.role = 'admin'
    and p.is_active = true
    and p.deleted_at is null
    and (p_excluding is null or p.id <> p_excluding);
$$;

create or replace function public.prevent_last_admin_loss()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.role = 'admin' then
    if public.active_admin_count(old.id) = 0 then
      raise exception 'Cannot remove the last active admin';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
    and old.role = 'admin'
    and (
      new.role is distinct from 'admin'
      or new.is_active is distinct from true
      or new.deleted_at is not null
    )
  then
    if public.active_admin_count(old.id) = 0 then
      raise exception 'Cannot remove the last active admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_last_admin_loss on public.profiles;
create trigger profiles_prevent_last_admin_loss
  before update or delete on public.profiles
  for each row execute function public.prevent_last_admin_loss();

create or replace function public.soft_delete_profile(
  p_profile_id uuid,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    is_active = false,
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
  where id = p_profile_id;

  insert into public.audit_logs(actor_id, action, entity_table, entity_id, metadata)
  values (
    p_actor_id,
    'SOFT_DELETE',
    'profiles',
    p_profile_id,
    jsonb_build_object('deleted_at', now())
  );
end;
$$;

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_admin_change();

drop trigger if exists audit_availability_rules on public.availability_rules;
create trigger audit_availability_rules after insert or update or delete on public.availability_rules
  for each row execute function public.audit_admin_change();

drop trigger if exists audit_blocked_slots on public.blocked_slots;
create trigger audit_blocked_slots after insert or update or delete on public.blocked_slots
  for each row execute function public.audit_admin_change();

drop trigger if exists audit_loyalty_events on public.loyalty_events;
create trigger audit_loyalty_events after insert or update or delete on public.loyalty_events
  for each row execute function public.audit_admin_change();

alter table public.loyalty_events enable row level security;
alter table public.notification_jobs enable row level security;

drop policy if exists loyalty_events_admin_all on public.loyalty_events;
create policy loyalty_events_admin_all on public.loyalty_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists loyalty_events_own_read on public.loyalty_events;
create policy loyalty_events_own_read on public.loyalty_events
  for select to authenticated
  using (profile_id = (select auth.uid()));

drop policy if exists notification_jobs_admin_all on public.notification_jobs;
create policy notification_jobs_admin_all on public.notification_jobs
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant execute on function public.active_admin_count(uuid) to authenticated;
grant execute on function public.soft_delete_profile(uuid, uuid) to authenticated;

commit;
