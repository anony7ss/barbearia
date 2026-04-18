-- Corte Nobre Barbearia - security audit follow-up
-- Incremental migration. Keeps production history immutable.

begin;

revoke all on public.admin_appointment_summary from anon, authenticated;
revoke all on public.admin_revenue_by_day from anon, authenticated;
revoke all on public.admin_barber_occupancy from anon, authenticated;

drop policy if exists business_settings_public_read on public.business_settings;

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
  address
from public.business_settings
where id = true;

grant select on public.public_business_settings to anon, authenticated;

create or replace function public.audit_redact_row(p_data jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  item record;
  text_value text;
begin
  if p_data is null then
    return null;
  end if;

  for item in select key, value from jsonb_each(p_data)
  loop
    text_value := nullif(trim(both '"' from item.value::text), 'null');

    if item.key ~* '(token|hash|secret|password)' then
      result := result || jsonb_build_object(item.key, '[redigido]');
    elsif item.key in ('email', 'customer_email') and text_value is not null then
      result := result || jsonb_build_object(item.key, '[email protegido]');
    elsif item.key in ('phone', 'customer_phone', 'whatsapp_phone') and text_value is not null then
      result := result || jsonb_build_object(item.key, '[telefone protegido]');
    elsif item.key in ('notes', 'internal_notes', 'personal_notes', 'metadata', 'payload') and item.value <> 'null'::jsonb then
      result := result || jsonb_build_object(item.key, '[conteudo protegido]');
    else
      result := result || jsonb_build_object(item.key, item.value);
    end if;
  end loop;

  return result;
end;
$$;

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  entity uuid;
  old_payload jsonb;
  new_payload jsonb;
  old_changes jsonb := '{}'::jsonb;
  new_changes jsonb := '{}'::jsonb;
  payload jsonb;
  field_key text;
begin
  if tg_op = 'DELETE' then
    entity := old.id;
    old_payload := public.audit_redact_row(to_jsonb(old));
    payload := jsonb_build_object('old', old_payload, 'new', null, 'changed_at', now());
  elsif tg_op = 'INSERT' then
    entity := new.id;
    new_payload := public.audit_redact_row(to_jsonb(new));
    payload := jsonb_build_object('old', null, 'new', new_payload, 'changed_at', now());
  else
    entity := new.id;
    old_payload := public.audit_redact_row(to_jsonb(old));
    new_payload := public.audit_redact_row(to_jsonb(new));

    for field_key in select jsonb_object_keys(coalesce(old_payload, '{}'::jsonb) || coalesce(new_payload, '{}'::jsonb))
    loop
      if (old_payload -> field_key) is distinct from (new_payload -> field_key) then
        old_changes := old_changes || jsonb_build_object(field_key, old_payload -> field_key);
        new_changes := new_changes || jsonb_build_object(field_key, new_payload -> field_key);
      end if;
    end loop;

    payload := jsonb_build_object('old', old_changes, 'new', new_changes, 'changed_at', now());
  end if;

  if public.is_admin() then
    insert into public.audit_logs(actor_id, action, entity_table, entity_id, metadata)
    values (
      auth.uid(),
      tg_op,
      tg_table_name,
      entity,
      payload
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

commit;
