-- Security hardening for admin RPCs and internal-only helper functions.
-- Keep this as an incremental migration. Do not edit migrations that may
-- already have been applied in production.

revoke execute on function public.check_rate_limit(text, text, integer, integer) from public;
revoke execute on function public.check_rate_limit(text, text, integer, integer) from anon;
revoke execute on function public.check_rate_limit(text, text, integer, integer) from authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;

revoke execute on function public.active_admin_count(uuid) from public;
revoke execute on function public.active_admin_count(uuid) from anon;
revoke execute on function public.active_admin_count(uuid) from authenticated;

revoke execute on function public.soft_delete_profile(uuid, uuid) from public;
revoke execute on function public.soft_delete_profile(uuid, uuid) from anon;
revoke execute on function public.soft_delete_profile(uuid, uuid) from authenticated;

create or replace function public.soft_delete_profile(
  p_profile_id uuid,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null or not public.is_admin() then
    raise exception 'Admin privileges required'
      using errcode = '42501';
  end if;

  if p_actor_id is not null and p_actor_id <> v_actor_id then
    raise exception 'Actor mismatch'
      using errcode = '42501';
  end if;

  if p_profile_id = v_actor_id then
    raise exception 'Cannot soft delete own admin profile'
      using errcode = '42501';
  end if;

  update public.profiles
  set
    is_active = false,
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
  where id = p_profile_id;

  if not found then
    raise exception 'Profile not found'
      using errcode = 'P0002';
  end if;

  insert into public.audit_logs(actor_id, action, entity_table, entity_id, metadata)
  values (
    v_actor_id,
    'SOFT_DELETE',
    'profiles',
    p_profile_id,
    jsonb_build_object('deleted_at', now())
  );
end;
$$;

grant execute on function public.soft_delete_profile(uuid, uuid) to authenticated;
