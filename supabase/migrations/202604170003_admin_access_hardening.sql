-- Corte Nobre Barbearia - admin access hardening
-- Keeps disabled/soft-deleted profiles from retaining administrative access.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active = true
      and p.deleted_at is null
  )
  or exists (
    select 1
    from public.admin_users a
    join public.profiles p on p.id = a.profile_id
    where a.profile_id = (select auth.uid())
      and p.is_active = true
      and p.deleted_at is null
  );
$$;

commit;
