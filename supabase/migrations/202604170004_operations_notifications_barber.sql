-- Corte Nobre Barbearia - operational notifications and barber workflow
-- Incremental migration: keep production history immutable.

begin;

alter table public.business_settings
  add column if not exists notification_cron_last_run_at timestamptz,
  add column if not exists notification_cron_last_result text;

alter table public.business_settings
  drop constraint if exists business_settings_notification_cron_last_result_length_check,
  add constraint business_settings_notification_cron_last_result_length_check
    check (notification_cron_last_result is null or char_length(notification_cron_last_result) <= 500) not valid;

create index if not exists barbers_profile_id_idx
  on public.barbers(profile_id)
  where profile_id is not null;

create index if not exists notification_jobs_status_updated_idx
  on public.notification_jobs(status, updated_at desc);

create index if not exists notification_jobs_template_status_idx
  on public.notification_jobs(template, status, scheduled_for);

create index if not exists appointments_customer_user_idx
  on public.appointments(user_id, starts_at desc)
  where user_id is not null;

comment on column public.business_settings.notification_cron_last_run_at
  is 'Last successful invocation attempt of the notification processor.';

comment on column public.business_settings.notification_cron_last_result
  is 'Sanitized summary of the last notification processor run.';

commit;
