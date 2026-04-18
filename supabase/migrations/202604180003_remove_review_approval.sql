-- Corte Nobre Barbearia - reviews publish without moderation approval
-- Public visibility is controlled only by the customer opt-in flag is_public.

begin;

drop policy if exists appointment_reviews_public_read on public.appointment_reviews;

drop index if exists public.appointment_reviews_public_idx;

alter table public.appointment_reviews
  drop column if exists is_approved;

create index if not exists appointment_reviews_public_idx
  on public.appointment_reviews(created_at desc)
  where is_public;

create policy appointment_reviews_public_read on public.appointment_reviews
  for select to anon, authenticated
  using (is_public);

commit;
