-- Corte Nobre Barbearia - product/security enhancements
-- Incremental migration: do not edit the initial migration after production use.

begin;

create table if not exists public.client_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  favorite_barber_id uuid references public.barbers(id) on delete set null,
  favorite_service_id uuid references public.services(id) on delete set null,
  personal_notes text,
  birthday date,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  service_id uuid not null references public.services(id) on delete restrict,
  barber_id uuid references public.barbers(id) on delete set null,
  desired_date date not null,
  preferred_period text not null default 'any' check (preferred_period in ('morning', 'afternoon', 'evening', 'any')),
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text,
  customer_phone text not null check (char_length(customer_phone) between 8 and 24),
  status text not null default 'open' check (status in ('open', 'notified', 'booked', 'cancelled', 'expired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and char_length(code) between 3 and 32),
  description text not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  is_public boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_validity_check check (expires_at is null or starts_at is null or starts_at < expires_at)
);

create table if not exists public.no_show_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  customer_phone text,
  customer_email text,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  previous_status public.appointment_status,
  next_status public.appointment_status not null,
  reason text,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_preferences_favorite_barber_idx on public.client_preferences(favorite_barber_id);
create index if not exists waitlist_entries_status_date_idx on public.waitlist_entries(status, desired_date);
create index if not exists waitlist_entries_contact_idx on public.waitlist_entries(customer_phone, customer_email);
create index if not exists coupons_active_code_idx on public.coupons(code) where is_active;
create index if not exists no_show_events_user_idx on public.no_show_events(user_id, created_at desc);
create index if not exists appointment_status_history_appointment_idx on public.appointment_status_history(appointment_id, created_at desc);

drop trigger if exists touch_client_preferences on public.client_preferences;
create trigger touch_client_preferences before update on public.client_preferences
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_waitlist_entries on public.waitlist_entries;
create trigger touch_waitlist_entries before update on public.waitlist_entries
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_coupons on public.coupons;
create trigger touch_coupons before update on public.coupons
  for each row execute function public.touch_updated_at();

create or replace function public.get_guest_appointment_details(
  p_code text,
  p_contact text
)
returns table (
  id uuid,
  service_id uuid,
  barber_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  customer_name text,
  customer_email text,
  customer_phone text,
  service_name text,
  service_price_cents integer,
  service_duration_minutes integer,
  barber_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.service_id,
    a.barber_id,
    a.starts_at,
    a.ends_at,
    a.status,
    a.customer_name,
    a.customer_email,
    a.customer_phone,
    s.name as service_name,
    s.price_cents as service_price_cents,
    s.duration_minutes as service_duration_minutes,
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

create or replace function public.log_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_status_history(appointment_id, previous_status, next_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.appointment_status_history(appointment_id, previous_status, next_status, reason, actor_id)
    values (new.id, old.status, new.status, coalesce(new.cancel_reason, null), auth.uid());

    if new.status = 'no_show' then
      insert into public.no_show_events(appointment_id, user_id, customer_phone, customer_email, created_by)
      values (new.id, new.user_id, new.customer_phone, new.customer_email, auth.uid())
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists appointment_status_history_trigger on public.appointments;
create trigger appointment_status_history_trigger after insert or update of status on public.appointments
  for each row execute function public.log_appointment_status_change();

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  entity uuid;
  payload jsonb;
begin
  if tg_op = 'DELETE' then
    entity := old.id;
    payload := jsonb_build_object('old', to_jsonb(old), 'new', null, 'changed_at', now());
  elsif tg_op = 'INSERT' then
    entity := new.id;
    payload := jsonb_build_object('old', null, 'new', to_jsonb(new), 'changed_at', now());
  else
    entity := new.id;
    payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new), 'changed_at', now());
  end if;

  if public.is_admin() then
    insert into public.audit_logs(actor_id, action, entity_table, entity_id, metadata)
    values (
      auth.uid(),
      tg_op,
      tg_table_name,
      entity,
      payload
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace view public.admin_appointment_summary
with (security_invoker = true)
as
select
  a.id,
  a.starts_at,
  a.ends_at,
  a.status,
  a.customer_name,
  a.customer_phone,
  s.name as service_name,
  s.price_cents,
  b.name as barber_name,
  a.created_at
from public.appointments a
join public.services s on s.id = a.service_id
join public.barbers b on b.id = a.barber_id;

create or replace view public.admin_revenue_by_day
with (security_invoker = true)
as
select
  date_trunc('day', a.starts_at) as day,
  count(*) filter (where a.status in ('pending', 'confirmed', 'completed')) as appointment_count,
  coalesce(sum(s.price_cents) filter (where a.status in ('pending', 'confirmed', 'completed')), 0) as estimated_revenue_cents,
  count(*) filter (where a.status = 'cancelled') as cancelled_count,
  count(*) filter (where a.status = 'no_show') as no_show_count
from public.appointments a
join public.services s on s.id = a.service_id
group by 1;

create or replace view public.admin_barber_occupancy
with (security_invoker = true)
as
select
  b.id as barber_id,
  b.name as barber_name,
  date_trunc('day', a.starts_at) as day,
  count(a.id) filter (where a.status in ('pending', 'confirmed', 'completed')) as booked_slots,
  coalesce(sum(extract(epoch from (a.ends_at - a.starts_at)) / 60) filter (where a.status in ('pending', 'confirmed', 'completed')), 0) as booked_minutes
from public.barbers b
left join public.appointments a on a.barber_id = b.id
group by b.id, b.name, date_trunc('day', a.starts_at);

alter table public.client_preferences enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.coupons enable row level security;
alter table public.no_show_events enable row level security;
alter table public.appointment_status_history enable row level security;

drop policy if exists client_preferences_own_select on public.client_preferences;
create policy client_preferences_own_select on public.client_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists client_preferences_own_write on public.client_preferences;
create policy client_preferences_own_write on public.client_preferences
  for all to authenticated
  using ((select auth.uid()) = user_id or public.is_admin())
  with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists waitlist_entries_own_select on public.waitlist_entries;
create policy waitlist_entries_own_select on public.waitlist_entries
  for select to authenticated
  using ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists waitlist_entries_own_insert on public.waitlist_entries;
create policy waitlist_entries_own_insert on public.waitlist_entries
  for insert to authenticated
  with check ((select auth.uid()) = user_id or public.is_admin());

drop policy if exists waitlist_entries_admin_all on public.waitlist_entries;
create policy waitlist_entries_admin_all on public.waitlist_entries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists coupons_public_read on public.coupons;
create policy coupons_public_read on public.coupons
  for select to anon, authenticated
  using (is_active and is_public and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at >= now()));

drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all on public.coupons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists no_show_events_admin_all on public.no_show_events;
create policy no_show_events_admin_all on public.no_show_events
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists no_show_events_own_read on public.no_show_events;
create policy no_show_events_own_read on public.no_show_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists appointment_status_history_admin_read on public.appointment_status_history;
create policy appointment_status_history_admin_read on public.appointment_status_history
  for select to authenticated
  using (public.is_admin());

drop policy if exists appointment_status_history_own_read on public.appointment_status_history;
create policy appointment_status_history_own_read on public.appointment_status_history
  for select to authenticated
  using (
    exists (
      select 1
      from public.appointments a
      where a.id = appointment_status_history.appointment_id
        and a.user_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barbershop-gallery',
  'barbershop-gallery',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists gallery_public_read on storage.objects;
create policy gallery_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'barbershop-gallery');

drop policy if exists gallery_admin_insert on storage.objects;
create policy gallery_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'barbershop-gallery' and public.is_admin());

drop policy if exists gallery_admin_update on storage.objects;
create policy gallery_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'barbershop-gallery' and public.is_admin())
  with check (bucket_id = 'barbershop-gallery' and public.is_admin());

drop policy if exists gallery_admin_delete on storage.objects;
create policy gallery_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'barbershop-gallery' and public.is_admin());

revoke all on public.client_preferences from anon;
revoke all on public.waitlist_entries from anon;
revoke all on public.no_show_events from anon;
revoke all on public.appointment_status_history from anon;
grant execute on function public.get_guest_appointment_details(text, text) to anon, authenticated;
grant select on public.admin_appointment_summary to authenticated;
grant select on public.admin_revenue_by_day to authenticated;
grant select on public.admin_barber_occupancy to authenticated;

commit;
