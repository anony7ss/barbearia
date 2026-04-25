begin;

drop view if exists public.public_business_settings;

create view public.public_business_settings
with (security_barrier = true)
as
select
  whatsapp_phone,
  email,
  address,
  instagram_handle
from public.business_settings
where id = true;

grant select on public.public_business_settings to anon, authenticated;

commit;
