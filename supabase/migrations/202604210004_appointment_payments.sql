-- Corte Nobre Barbearia - appointment payments
-- Adds server-owned payment state to appointments and hardens Stripe payment records.

begin;

alter table public.appointments
  add column if not exists payment_method text not null default 'pay_at_shop',
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_amount_cents integer not null default 0,
  add column if not exists payment_currency text not null default 'brl',
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_payment_method_check'
  ) then
    alter table public.appointments
      add constraint appointments_payment_method_check
      check (payment_method in ('pay_at_shop', 'online'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_payment_status_check'
  ) then
    alter table public.appointments
      add constraint appointments_payment_status_check
      check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_payment_amount_check'
  ) then
    alter table public.appointments
      add constraint appointments_payment_amount_check
      check (payment_amount_cents >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'appointments_payment_currency_check'
  ) then
    alter table public.appointments
      add constraint appointments_payment_currency_check
      check (payment_currency ~ '^[a-z]{3}$');
  end if;
end $$;

update public.appointments a
set
  payment_amount_cents = coalesce(nullif(a.payment_amount_cents, 0), s.price_cents, 0),
  payment_currency = coalesce(nullif(a.payment_currency, ''), 'brl')
from public.services s
where s.id = a.service_id
  and (a.payment_amount_cents = 0 or a.payment_currency is null or a.payment_currency = '');

create index if not exists appointments_payment_status_idx
  on public.appointments(payment_status, starts_at desc);

create unique index if not exists appointments_stripe_checkout_session_uidx
  on public.appointments(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists appointments_stripe_payment_intent_uidx
  on public.appointments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists payment_records_provider_reference_uidx
  on public.payment_records(provider, provider_reference)
  where provider_reference is not null;

drop function if exists public.get_guest_appointment_details(text, text);
create function public.get_guest_appointment_details(
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
  payment_method text,
  payment_status text,
  payment_amount_cents integer,
  payment_currency text,
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
    a.payment_method,
    a.payment_status,
    a.payment_amount_cents,
    a.payment_currency,
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

grant execute on function public.get_guest_appointment_details(text, text) to anon, authenticated;

commit;
