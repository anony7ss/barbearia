begin;

alter table public.barbers
  add column if not exists photo_storage_path text;

alter table public.barbers
  drop constraint if exists barbers_photo_storage_path_check;

alter table public.barbers
  add constraint barbers_photo_storage_path_check
  check (photo_storage_path is null or char_length(photo_storage_path) <= 500);

create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  storage_path text,
  external_url text,
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  is_active boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint gallery_items_source_check check (((storage_path is not null)::int + (external_url is not null)::int) = 1),
  constraint gallery_items_storage_path_check check (storage_path is null or char_length(storage_path) <= 500),
  constraint gallery_items_external_url_check check (
    external_url is null
    or (char_length(external_url) <= 1000 and external_url ~* '^https://')
  ),
  constraint gallery_items_alt_text_check check (alt_text is null or char_length(alt_text) between 2 and 180),
  constraint gallery_items_caption_check check (caption is null or char_length(caption) <= 240),
  constraint gallery_items_sort_order_check check (sort_order >= 0)
);

create index if not exists gallery_items_barber_sort_idx
  on public.gallery_items(barber_id, sort_order, created_at desc);

create index if not exists gallery_items_public_idx
  on public.gallery_items(is_active, sort_order, created_at desc);

create unique index if not exists gallery_items_one_cover_per_barber_idx
  on public.gallery_items(barber_id)
  where is_cover = true;

drop trigger if exists touch_gallery_items_updated_at on public.gallery_items;
create trigger touch_gallery_items_updated_at before update on public.gallery_items
  for each row execute function public.touch_updated_at();

drop trigger if exists audit_gallery_items on public.gallery_items;
create trigger audit_gallery_items after insert or update or delete on public.gallery_items
  for each row execute function public.audit_admin_change();

alter table public.gallery_items enable row level security;

grant select on public.gallery_items to anon, authenticated;
grant insert, update, delete on public.gallery_items to authenticated;

create or replace function public.is_barber_owner(p_barber_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.barbers b
    join public.profiles p on p.id = auth.uid()
    where b.id = p_barber_id
      and b.profile_id = auth.uid()
      and b.is_active = true
      and p.role = 'barber'
      and p.is_active = true
      and p.deleted_at is null
  );
$$;

create or replace function public.storage_barber_id_from_path(p_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  candidate text;
begin
  if split_part(p_name, '/', 1) <> 'barbers' then
    return null;
  end if;

  candidate := split_part(p_name, '/', 2);
  if candidate !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;

  return candidate::uuid;
end;
$$;

grant execute on function public.is_barber_owner(uuid) to authenticated;
grant execute on function public.storage_barber_id_from_path(text) to authenticated;

drop policy if exists gallery_items_public_read on public.gallery_items;
create policy gallery_items_public_read on public.gallery_items
  for select to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.barbers b
      where b.id = barber_id
        and b.is_active = true
    )
  );

drop policy if exists gallery_items_admin_manage on public.gallery_items;
create policy gallery_items_admin_manage on public.gallery_items
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists gallery_items_barber_read_own on public.gallery_items;
create policy gallery_items_barber_read_own on public.gallery_items
  for select to authenticated
  using (public.is_barber_owner(barber_id));

drop policy if exists gallery_items_barber_insert_own on public.gallery_items;
create policy gallery_items_barber_insert_own on public.gallery_items
  for insert to authenticated
  with check (public.is_barber_owner(barber_id));

drop policy if exists gallery_items_barber_update_own on public.gallery_items;
create policy gallery_items_barber_update_own on public.gallery_items
  for update to authenticated
  using (public.is_barber_owner(barber_id))
  with check (public.is_barber_owner(barber_id));

drop policy if exists gallery_items_barber_delete_own on public.gallery_items;
create policy gallery_items_barber_delete_own on public.gallery_items
  for delete to authenticated
  using (public.is_barber_owner(barber_id));

drop policy if exists gallery_barber_insert on storage.objects;
create policy gallery_barber_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'barbershop-gallery'
    and public.storage_barber_id_from_path(name) is not null
    and public.is_barber_owner(public.storage_barber_id_from_path(name))
  );

drop policy if exists gallery_barber_update on storage.objects;
create policy gallery_barber_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'barbershop-gallery'
    and public.storage_barber_id_from_path(name) is not null
    and public.is_barber_owner(public.storage_barber_id_from_path(name))
  )
  with check (
    bucket_id = 'barbershop-gallery'
    and public.storage_barber_id_from_path(name) is not null
    and public.is_barber_owner(public.storage_barber_id_from_path(name))
  );

drop policy if exists gallery_barber_delete on storage.objects;
create policy gallery_barber_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'barbershop-gallery'
    and public.storage_barber_id_from_path(name) is not null
    and public.is_barber_owner(public.storage_barber_id_from_path(name))
  );

commit;
