-- Corte Nobre Barbearia - remove online payments and Stripe surface
-- Keeps booking flow focused on scheduling only.

begin;

drop index if exists public.appointments_payment_status_idx;
drop index if exists public.appointments_stripe_checkout_session_uidx;
drop index if exists public.appointments_stripe_payment_intent_uidx;
drop index if exists public.payment_records_provider_reference_uidx;

alter table public.appointments
  drop constraint if exists appointments_payment_method_check,
  drop constraint if exists appointments_payment_status_check,
  drop constraint if exists appointments_payment_amount_check,
  drop constraint if exists appointments_payment_currency_check,
  drop column if exists payment_method,
  drop column if exists payment_status,
  drop column if exists payment_amount_cents,
  drop column if exists payment_currency,
  drop column if exists stripe_checkout_session_id,
  drop column if exists stripe_payment_intent_id,
  drop column if exists paid_at;

drop table if exists public.payment_records cascade;

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

grant execute on function public.get_guest_appointment_details(text, text) to anon, authenticated;

commit;
