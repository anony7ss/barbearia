begin;

alter table public.appointments
  alter column guest_lookup_code drop not null,
  alter column guest_access_token_hash drop not null;

commit;
