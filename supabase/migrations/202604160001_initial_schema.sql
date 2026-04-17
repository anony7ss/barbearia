-- Corte Nobre Barbearia - initial production schema
-- Apply with: supabase db push

begin;

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.profile_role as enum ('client', 'barber', 'admin');
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type public.notification_status as enum ('queued', 'sent', 'failed', 'cancelled');
create type public.contact_status as enum ('new', 'read', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.profile_role not null default 'client',
  full_name text,
  phone text,
  avatar_url text,
  preferred_barber_id uuid,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  bio text,
  specialties text[] not null default '{}',
  photo_url text,
  rating numeric(3,2) not null default 5 check (rating >= 0 and rating <= 5),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_preferred_barber_id_fkey
  foreign key (preferred_barber_id) references public.barbers(id) on delete set null;

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 8 and 500),
  duration_minutes integer not null check (duration_minutes between 10 and 240),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 60),
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'Corte Nobre Barbearia',
  timezone text not null default 'America/Sao_Paulo',
  min_notice_minutes integer not null default 120 check (min_notice_minutes >= 0),
  max_advance_days integer not null default 30 check (max_advance_days between 1 and 180),
  cancellation_limit_minutes integer not null default 240 check (cancellation_limit_minutes >= 0),
  reschedule_limit_minutes integer not null default 240 check (reschedule_limit_minutes >= 0),
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes in (10, 15, 20, 30, 60)),
  default_buffer_minutes integer not null default 0 check (default_buffer_minutes between 0 and 60),
  whatsapp_phone text,
  email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  break_start time,
  break_end time,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_time_check check (start_time < end_time),
  constraint availability_rules_break_check check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_start < break_end)
  )
);

create table public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocked_slots_time_check check (starts_at < ends_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'confirmed',
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text,
  customer_phone text not null check (char_length(customer_phone) between 8 and 24),
  guest_lookup_code text not null unique,
  guest_access_token_hash text not null,
  notes text,
  internal_notes text,
  source text not null default 'guest' check (source in ('guest', 'account', 'admin')),
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_check check (starts_at < ends_at)
);

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('pending', 'confirmed'));

create table public.appointment_guests (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  name text not null,
  email text,
  phone text not null,
  lookup_code text not null,
  access_token_hash text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  destination text not null,
  status public.notification_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status public.contact_status not null default 'new',
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.rate_limits (
  key text not null,
  bucket text not null,
  hits integer not null default 0,
  window_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (key, bucket)
);

create index profiles_role_idx on public.profiles(role);
create index profiles_preferred_barber_id_idx on public.profiles(preferred_barber_id);
create index barbers_active_order_idx on public.barbers(is_active, display_order);
create index services_active_order_idx on public.services(is_active, display_order);
create index availability_rules_barber_weekday_idx on public.availability_rules(barber_id, weekday) where is_active;
create index blocked_slots_range_idx on public.blocked_slots using gist (tstzrange(starts_at, ends_at, '[)'));
create index blocked_slots_barber_idx on public.blocked_slots(barber_id);
create index appointments_user_id_idx on public.appointments(user_id);
create index appointments_barber_starts_idx on public.appointments(barber_id, starts_at);
create index appointments_status_starts_idx on public.appointments(status, starts_at);
create index appointments_guest_lookup_code_idx on public.appointments(guest_lookup_code);
create index appointment_guests_lookup_code_idx on public.appointment_guests(lookup_code);
create index notifications_appointment_idx on public.notifications(appointment_id);
create index contact_messages_status_created_idx on public.contact_messages(status, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_barbers_updated_at before update on public.barbers
  for each row execute function public.touch_updated_at();
create trigger touch_services_updated_at before update on public.services
  for each row execute function public.touch_updated_at();
create trigger touch_business_settings_updated_at before update on public.business_settings
  for each row execute function public.touch_updated_at();
create trigger touch_availability_rules_updated_at before update on public.availability_rules
  for each row execute function public.touch_updated_at();
create trigger touch_appointments_updated_at before update on public.appointments
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  )
  or exists (
    select 1
    from public.admin_users a
    where a.profile_id = (select auth.uid())
  );
$$;

create or replace function public.check_rate_limit(
  p_key text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.rate_limits%rowtype;
begin
  delete from public.rate_limits
  where window_start < now() - make_interval(secs => greatest(p_window_seconds, 1) * 2);

  insert into public.rate_limits as rl (key, bucket, hits, window_start)
  values (p_key, p_bucket, 1, now())
  on conflict (key, bucket) do update
  set
    hits = case
      when rl.window_start < now() - make_interval(secs => greatest(p_window_seconds, 1))
        then 1
      else rl.hits + 1
    end,
    window_start = case
      when rl.window_start < now() - make_interval(secs => greatest(p_window_seconds, 1))
        then now()
      else rl.window_start
    end
  returning * into current_row;

  return current_row.hits <= p_limit;
end;
$$;

create or replace function public.get_guest_appointment(
  p_code text,
  p_contact text
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  customer_name text,
  service_name text,
  barber_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.starts_at,
    a.ends_at,
    a.status,
    a.customer_name,
    s.name as service_name,
    b.name as barber_name
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  where a.guest_lookup_code = upper(trim(p_code))
    and (
      lower(coalesce(a.customer_email, '')) = lower(trim(p_contact))
      or regexp_replace(a.customer_phone, '\D', '', 'g') = regexp_replace(p_contact, '\D', '', 'g')
    )
  limit 1;
$$;

create or replace function public.get_appointment_by_guest_token(
  p_appointment_id uuid,
  p_token text
)
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  customer_name text,
  service_name text,
  barber_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.starts_at,
    a.ends_at,
    a.status,
    a.customer_name,
    s.name as service_name,
    b.name as barber_name
  from public.appointments a
  join public.services s on s.id = a.service_id
  join public.barbers b on b.id = a.barber_id
  where a.id = p_appointment_id
    and a.guest_access_token_hash = encode(extensions.digest(p_token::text, 'sha256'), 'hex')
  limit 1;
$$;

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.is_admin() then
    insert into public.audit_logs(actor_id, action, entity_table, entity_id, metadata)
    values (
      (select auth.uid()),
      tg_op,
      tg_table_name,
      case when tg_op = 'DELETE' then old.id else new.id end,
      jsonb_build_object('at', now())
    );
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_services after insert or update or delete on public.services
  for each row execute function public.audit_admin_change();
create trigger audit_barbers after insert or update or delete on public.barbers
  for each row execute function public.audit_admin_change();
create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.audit_admin_change();

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.business_settings enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_guests enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_admin_manage on public.profiles
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy admin_users_admin_only on public.admin_users
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy barbers_public_read_active on public.barbers
  for select to anon, authenticated
  using (is_active = true);

create policy barbers_admin_manage on public.barbers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy services_public_read_active on public.services
  for select to anon, authenticated
  using (is_active = true);

create policy services_admin_manage on public.services
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy business_settings_public_read on public.business_settings
  for select to anon, authenticated
  using (true);

create policy business_settings_admin_manage on public.business_settings
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy availability_rules_public_read_active on public.availability_rules
  for select to anon, authenticated
  using (is_active = true);

create policy availability_rules_admin_manage on public.availability_rules
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy blocked_slots_admin_manage on public.blocked_slots
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy appointments_select_own_or_admin on public.appointments
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy appointments_admin_manage on public.appointments
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy appointment_guests_admin_manage on public.appointment_guests
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy appointment_guests_owner_read on public.appointment_guests
  for select to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_id
        and a.user_id = (select auth.uid())
    )
  );

create policy notifications_admin_manage on public.notifications
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy contact_messages_admin_manage on public.contact_messages
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated
  using ((select public.is_admin()));

revoke all on public.rate_limits from anon, authenticated;
revoke all on public.audit_logs from anon;
grant execute on function public.get_guest_appointment(text, text) to anon, authenticated;
grant execute on function public.get_appointment_by_guest_token(uuid, text) to anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to anon, authenticated;

commit;
