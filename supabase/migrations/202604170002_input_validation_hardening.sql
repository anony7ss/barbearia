-- Corte Nobre Barbearia - input validation hardening
-- Incremental migration. Adds database-side guardrails so APIs do not rely on client validation.

begin;

create or replace function public.is_safe_text_array(
  p_values text[],
  p_max_items integer,
  p_max_length integer
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(array_length(p_values, 1), 0) <= p_max_items
    and not exists (
      select 1
      from unnest(p_values) as value
      where char_length(btrim(value)) not between 1 and p_max_length
    );
$$;

alter table public.profiles
  add constraint profiles_full_name_length_check
  check (full_name is null or char_length(btrim(full_name)) between 2 and 120) not valid,
  add constraint profiles_phone_digits_check
  check (phone is null or phone ~ '^[0-9]{8,24}$') not valid,
  add constraint profiles_avatar_https_check
  check (avatar_url is null or (char_length(avatar_url) <= 1000 and avatar_url ~* '^https://')) not valid,
  add constraint profiles_internal_notes_length_check
  check (internal_notes is null or char_length(internal_notes) <= 1000) not valid;

alter table public.barbers
  add constraint barbers_bio_length_check
  check (bio is null or char_length(bio) <= 600) not valid,
  add constraint barbers_photo_https_check
  check (photo_url is null or (char_length(photo_url) <= 1000 and photo_url ~* '^https://')) not valid,
  add constraint barbers_display_order_check
  check (display_order >= 0) not valid,
  add constraint barbers_specialties_length_check
  check (public.is_safe_text_array(specialties, 12, 60)) not valid;

alter table public.services
  add constraint services_display_order_check
  check (display_order >= 0) not valid;

alter table public.business_settings
  add constraint business_settings_contact_check
  check (
    (whatsapp_phone is null or whatsapp_phone ~ '^[0-9]{8,24}$')
    and (email is null or (char_length(email) <= 180 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    and (address is null or char_length(address) <= 500)
    and char_length(timezone) between 3 and 80
  ) not valid;

alter table public.blocked_slots
  add constraint blocked_slots_reason_length_check
  check (reason is null or char_length(reason) <= 180) not valid;

alter table public.appointments
  add constraint appointments_email_format_check
  check (customer_email is null or (char_length(customer_email) <= 180 and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) not valid,
  add constraint appointments_phone_digits_check
  check (customer_phone ~ '^[0-9]{8,24}$') not valid,
  add constraint appointments_lookup_code_format_check
  check (guest_lookup_code ~ '^[A-F0-9]{10}$') not valid,
  add constraint appointments_access_hash_format_check
  check (guest_access_token_hash ~ '^[a-f0-9]{64}$') not valid,
  add constraint appointments_notes_length_check
  check (notes is null or char_length(notes) <= 500) not valid,
  add constraint appointments_internal_notes_length_check
  check (internal_notes is null or char_length(internal_notes) <= 1000) not valid,
  add constraint appointments_cancel_reason_length_check
  check (cancel_reason is null or char_length(cancel_reason) <= 240) not valid;

alter table public.appointment_guests
  add constraint appointment_guests_name_length_check
  check (char_length(btrim(name)) between 2 and 120) not valid,
  add constraint appointment_guests_email_format_check
  check (email is null or (char_length(email) <= 180 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) not valid,
  add constraint appointment_guests_phone_digits_check
  check (phone ~ '^[0-9]{8,24}$') not valid,
  add constraint appointment_guests_lookup_code_format_check
  check (lookup_code ~ '^[A-F0-9]{10}$') not valid,
  add constraint appointment_guests_access_hash_format_check
  check (access_token_hash ~ '^[a-f0-9]{64}$') not valid;

alter table public.contact_messages
  add constraint contact_messages_name_length_check
  check (char_length(btrim(name)) between 2 and 120) not valid,
  add constraint contact_messages_email_format_check
  check (char_length(email) <= 180 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') not valid,
  add constraint contact_messages_phone_digits_check
  check (phone is null or phone ~ '^[0-9]{8,24}$') not valid,
  add constraint contact_messages_message_length_check
  check (char_length(message) between 10 and 1200) not valid;

alter table public.client_preferences
  add constraint client_preferences_personal_notes_length_check
  check (personal_notes is null or char_length(personal_notes) <= 500) not valid;

alter table public.waitlist_entries
  add constraint waitlist_entries_email_format_check
  check (customer_email is null or (char_length(customer_email) <= 180 and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) not valid,
  add constraint waitlist_entries_phone_digits_check
  check (customer_phone ~ '^[0-9]{8,24}$') not valid,
  add constraint waitlist_entries_notes_length_check
  check (notes is null or char_length(notes) <= 500) not valid;

alter table public.coupons
  add constraint coupons_description_length_check
  check (char_length(description) between 3 and 240) not valid,
  add constraint coupons_percent_value_check
  check (discount_type <> 'percent' or discount_value between 1 and 100) not valid,
  add constraint coupons_fixed_value_check
  check (discount_type <> 'fixed' or discount_value between 1 and 1000000) not valid;

alter table public.no_show_events
  add constraint no_show_events_contact_check
  check (
    (customer_phone is null or customer_phone ~ '^[0-9]{8,24}$')
    and (customer_email is null or (char_length(customer_email) <= 180 and customer_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
    and (reason is null or char_length(reason) <= 240)
  ) not valid;

alter table public.appointment_status_history
  add constraint appointment_status_history_reason_length_check
  check (reason is null or char_length(reason) <= 240) not valid;

alter table public.notifications
  add constraint notifications_destination_length_check
  check (char_length(destination) <= 240) not valid,
  add constraint notifications_error_length_check
  check (error_message is null or char_length(error_message) <= 1000) not valid;

alter table public.notification_jobs
  add constraint notification_jobs_template_length_check
  check (char_length(template) between 3 and 120) not valid,
  add constraint notification_jobs_attempts_limit_check
  check (attempts between 0 and 20) not valid,
  add constraint notification_jobs_last_error_length_check
  check (last_error is null or char_length(last_error) <= 1000) not valid;

commit;
