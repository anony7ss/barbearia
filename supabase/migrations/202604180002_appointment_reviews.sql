-- Corte Nobre Barbearia - real appointment reviews
-- Reviews are tied to completed appointments and exposed publicly only after approval.

begin;

create table if not exists public.appointment_reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  rating integer not null check (rating between 1 and 5),
  comment text not null check (char_length(btrim(comment)) between 8 and 700),
  is_public boolean not null default true,
  is_approved boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointment_reviews_public_idx
  on public.appointment_reviews(created_at desc)
  where is_public and is_approved;

create index if not exists appointment_reviews_barber_idx
  on public.appointment_reviews(barber_id, created_at desc);

create index if not exists appointment_reviews_profile_idx
  on public.appointment_reviews(profile_id, created_at desc);

drop trigger if exists touch_appointment_reviews on public.appointment_reviews;
create trigger touch_appointment_reviews before update on public.appointment_reviews
  for each row execute function public.touch_updated_at();

alter table public.appointment_reviews enable row level security;

drop policy if exists appointment_reviews_public_read on public.appointment_reviews;
create policy appointment_reviews_public_read on public.appointment_reviews
  for select to anon, authenticated
  using (is_public and is_approved);

drop policy if exists appointment_reviews_own_read on public.appointment_reviews;
create policy appointment_reviews_own_read on public.appointment_reviews
  for select to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1
      from public.appointments a
      where a.id = appointment_reviews.appointment_id
        and a.user_id = (select auth.uid())
    )
  );

drop policy if exists appointment_reviews_own_insert on public.appointment_reviews;
create policy appointment_reviews_own_insert on public.appointment_reviews
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (
      select 1
      from public.appointments a
      where a.id = appointment_reviews.appointment_id
        and a.user_id = (select auth.uid())
        and a.status = 'completed'
        and a.barber_id = appointment_reviews.barber_id
        and a.service_id = appointment_reviews.service_id
    )
  );

drop policy if exists appointment_reviews_admin_all on public.appointment_reviews;
create policy appointment_reviews_admin_all on public.appointment_reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.appointment_reviews to anon;
grant select, insert on public.appointment_reviews to authenticated;

commit;
