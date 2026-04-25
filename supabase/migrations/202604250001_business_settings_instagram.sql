begin;

alter table public.business_settings
  add column if not exists instagram_handle text;

alter table public.business_settings
  drop constraint if exists business_settings_instagram_handle_check,
  add constraint business_settings_instagram_handle_check
  check (
    instagram_handle is null
    or instagram_handle ~ '^[A-Za-z0-9._]{1,30}$'
  );

comment on column public.business_settings.instagram_handle
  is 'Handle publico do Instagram sem @, exibido no site e usado para montar o link do perfil.';

create or replace view public.public_business_settings
with (security_barrier = true)
as
select
  business_name,
  timezone,
  min_notice_minutes,
  max_advance_days,
  cancellation_limit_minutes,
  reschedule_limit_minutes,
  slot_interval_minutes,
  default_buffer_minutes,
  whatsapp_phone,
  email,
  address,
  instagram_handle
from public.business_settings
where id = true;

grant select on public.public_business_settings to anon, authenticated;

commit;
