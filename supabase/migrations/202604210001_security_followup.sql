-- Corte Nobre Barbearia - security follow-up hardening
-- Keeps production history immutable.

begin;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists gallery_public_read on storage.objects;

commit;
