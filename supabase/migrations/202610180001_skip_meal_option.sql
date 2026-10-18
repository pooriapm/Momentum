begin;

-- Same-day meal skip. A slot moves between three states on the current
-- profile-local day:
--   planned   -> completed (complete-meal) | skipped (skip-meal)
--   skipped   -> completed (complete-meal) | planned (undo-meal)
--   completed -> planned   (undo-meal); skip-meal is rejected until undone
-- select-meal on a skipped slot swaps the option and keeps it skipped, the
-- same way it keeps a planned slot planned. Progress, adherence and metrics
-- only count status = 'completed', so a skipped meal reads as "not eaten".

-- ---------------------------------------------------------------------------
-- 1. skip_meal_option (owner + current local_date + active plan option)
-- ---------------------------------------------------------------------------
create or replace function public.skip_meal_option(
  p_user_id uuid,
  p_local_date date,
  p_slot_key text,
  p_option_key text,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_resolved record;
  v_status public.daily_meal_status%rowtype;
  v_response jsonb;
begin
  if p_user_id is null
    or p_local_date is null
    or p_slot_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or p_option_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_skip_meal_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'skip-meal'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'meal_date_not_current' using errcode = 'P0001';
  end if;

  select * into v_resolved
  from private.resolve_active_meal_option(
    p_user_id,
    p_local_date,
    p_slot_key,
    p_option_key
  );

  select * into v_status
  from public.daily_meal_status
  where user_id = p_user_id
    and local_date = p_local_date
    and slot_key = p_slot_key
  for update;

  -- A completed meal must be undone before it can be skipped.
  if v_status.id is not null and v_status.status = 'completed' then
    raise exception 'completed_meal_locked' using errcode = 'P0001';
  end if;

  insert into public.daily_meal_status(
    user_id,
    local_date,
    plan_version_id,
    slot_key,
    option_key,
    status,
    completed_at,
    option_title_snapshot,
    nutrition_snapshot
  ) values (
    p_user_id,
    p_local_date,
    v_resolved.plan_version_id,
    p_slot_key,
    p_option_key,
    'skipped',
    null,
    v_resolved.option_title,
    v_resolved.nutrition
  )
  on conflict (user_id, local_date, slot_key) do update
  set
    plan_version_id = excluded.plan_version_id,
    option_key = excluded.option_key,
    status = 'skipped',
    completed_at = null,
    option_title_snapshot = excluded.option_title_snapshot,
    nutrition_snapshot = excluded.nutrition_snapshot,
    updated_at = statement_timestamp()
  returning * into v_status;

  v_response := jsonb_build_object(
    'id', v_status.id,
    'local_date', v_status.local_date,
    'plan_version_id', v_status.plan_version_id,
    'slot_key', v_status.slot_key,
    'option_key', v_status.option_key,
    'status', v_status.status,
    'completed_at', v_status.completed_at,
    'option_title', v_status.option_title_snapshot,
    'nutrition', v_status.nutrition_snapshot,
    'updated_at', v_status.updated_at
  );

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'skip-meal',
    p_idempotency_key,
    p_request_sha256,
    v_response
  );

  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'skip-meal'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.skip_meal_option(uuid, date, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.skip_meal_option(uuid, date, text, text, text, text)
to service_role;

-- ---------------------------------------------------------------------------
-- 2. undo_meal_option also reverts skipped -> planned
-- ---------------------------------------------------------------------------
create or replace function public.undo_meal_option(
  p_user_id uuid,
  p_local_date date,
  p_slot_key text,
  p_option_key text,
  p_idempotency_key text,
  p_request_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_existing private.account_mutation_keys%rowtype;
  v_status public.daily_meal_status%rowtype;
  v_response jsonb;
begin
  if p_user_id is null
    or p_local_date is null
    or p_slot_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or p_option_key !~ '^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,119}$'
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_undo_meal_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'undo-meal'
    and idempotency_key = p_idempotency_key;

  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  -- Lock window: current profile-local day only. Yesterday stays as recorded.
  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'meal_date_not_current' using errcode = 'P0001';
  end if;

  select * into v_status
  from public.daily_meal_status
  where user_id = p_user_id
    and local_date = p_local_date
    and slot_key = p_slot_key
  for update;

  if v_status.id is null then
    raise exception 'meal_not_completed' using errcode = 'P0002';
  end if;

  if v_status.option_key is distinct from p_option_key then
    raise exception 'completed_meal_locked' using errcode = 'P0001';
  end if;

  if v_status.status in ('completed', 'skipped') then
    update public.daily_meal_status
    set
      status = 'planned',
      completed_at = null,
      updated_at = statement_timestamp()
    where id = v_status.id
      and user_id = p_user_id
    returning * into v_status;
  elsif v_status.status <> 'planned' then
    raise exception 'completed_meal_locked' using errcode = 'P0001';
  end if;

  v_response := jsonb_build_object(
    'id', v_status.id,
    'local_date', v_status.local_date,
    'plan_version_id', v_status.plan_version_id,
    'slot_key', v_status.slot_key,
    'option_key', v_status.option_key,
    'status', v_status.status,
    'completed_at', v_status.completed_at,
    'option_title', v_status.option_title_snapshot,
    'nutrition', v_status.nutrition_snapshot,
    'updated_at', v_status.updated_at
  );

  insert into private.account_mutation_keys(
    user_id,
    action,
    idempotency_key,
    request_sha256,
    response_payload
  ) values (
    p_user_id,
    'undo-meal',
    p_idempotency_key,
    p_request_sha256,
    v_response
  );

  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'undo-meal'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.undo_meal_option(uuid, date, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.undo_meal_option(uuid, date, text, text, text, text)
to service_role;

commit;
