-- Corte Nobre Barbearia - real barber review stats
-- Keeps barber stars derived from public appointment reviews.

begin;

alter table public.barbers
  add column if not exists review_count integer not null default 0 check (review_count >= 0);

create index if not exists appointment_reviews_barber_public_idx
  on public.appointment_reviews(barber_id, created_at desc)
  where is_public;

create or replace function public.recalculate_barber_review_stats(p_barber_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stats record;
begin
  if p_barber_id is null then
    return;
  end if;

  select
    count(*)::integer as review_count,
    round(avg(rating)::numeric, 2) as average_rating
  into stats
  from public.appointment_reviews
  where barber_id = p_barber_id
    and is_public = true;

  update public.barbers
  set
    review_count = coalesce(stats.review_count, 0),
    rating = case
      when coalesce(stats.review_count, 0) > 0 then coalesce(stats.average_rating, 5.00)
      else 5.00
    end,
    updated_at = now()
  where id = p_barber_id;
end;
$$;

revoke all on function public.recalculate_barber_review_stats(uuid) from public;

create or replace function public.sync_barber_review_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalculate_barber_review_stats(old.barber_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.barber_id is distinct from new.barber_id then
    perform public.recalculate_barber_review_stats(old.barber_id);
  end if;

  perform public.recalculate_barber_review_stats(new.barber_id);
  return new;
end;
$$;

revoke all on function public.sync_barber_review_stats() from public;

drop trigger if exists sync_barber_review_stats on public.appointment_reviews;
create trigger sync_barber_review_stats
  after insert or update or delete on public.appointment_reviews
  for each row execute function public.sync_barber_review_stats();

with stats as (
  select
    b.id as barber_id,
    count(r.id)::integer as review_count,
    round(avg(r.rating)::numeric, 2) as average_rating
  from public.barbers b
  left join public.appointment_reviews r
    on r.barber_id = b.id
   and r.is_public = true
  group by b.id
)
update public.barbers b
set
  review_count = stats.review_count,
  rating = case
    when stats.review_count > 0 then coalesce(stats.average_rating, 5.00)
    else 5.00
  end
from stats
where stats.barber_id = b.id;

commit;
