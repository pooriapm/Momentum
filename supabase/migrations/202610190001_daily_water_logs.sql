begin;

-- Quick water logging. Water lives in its own table so a water-only day never
-- creates a daily_checkins row (the dashboard treats that row as "today's
-- report is done") and save_daily_checkin / save_daily_water never overwrite
-- each other. Rows are owner-readable and written only through the
-- service-only RPC below.

create table public.daily_water_logs (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  local_date date not null,
  timezone text not null check (char_length(timezone) between 1 and 80),
  water_ml integer not null check (water_ml between 0 and 20000),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (user_id, local_date)
);

create trigger daily_water_logs_set_updated_at
before update on public.daily_water_logs
for each row execute function public.set_updated_at();

alter table public.daily_water_logs enable row level security;
create policy daily_water_logs_select_own on public.daily_water_logs
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.daily_water_logs from public, anon, authenticated;
grant select on public.daily_water_logs to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.daily_water_logs from service_role;
grant select on public.daily_water_logs to service_role;

comment on table public.daily_water_logs is
  'Owner daily water total per profile-local date. Written only through save_daily_water; removed with the account.';

-- ---------------------------------------------------------------------------
-- save_daily_water: sets (not increments) the current day's total.
-- ---------------------------------------------------------------------------
create or replace function public.save_daily_water(
  p_user_id uuid,
  p_local_date date,
  p_timezone text,
  p_water_ml integer,
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
  v_profile_timezone text;
  v_row public.daily_water_logs%rowtype;
  v_response jsonb;
begin
  if p_user_id is null
    or p_local_date is null
    or p_water_ml is null
    or p_water_ml not between 0 and 20000
    or char_length(p_timezone) not between 1 and 80
    or char_length(p_idempotency_key) not between 8 and 128
    or p_request_sha256 !~ '^[a-f0-9]{64}$'
  then
    raise exception 'invalid_daily_water_arguments' using errcode = '22023';
  end if;

  select * into v_existing
  from private.account_mutation_keys
  where user_id = p_user_id
    and action = 'save-daily-water'
    and idempotency_key = p_idempotency_key;
  if v_existing.user_id is not null then
    if v_existing.request_sha256 <> p_request_sha256 then
      raise exception 'idempotency_key_reused' using errcode = 'P0001';
    end if;
    return v_existing.response_payload;
  end if;

  select timezone into v_profile_timezone
  from public.profiles where user_id = p_user_id;
  if v_profile_timezone is null or v_profile_timezone <> p_timezone then
    raise exception 'profile_timezone_mismatch' using errcode = 'P0001';
  end if;
  if p_local_date <> private.current_profile_local_date(p_user_id) then
    raise exception 'checkin_date_not_current' using errcode = 'P0001';
  end if;

  insert into public.daily_water_logs(user_id, local_date, timezone, water_ml)
  values (p_user_id, p_local_date, p_timezone, p_water_ml)
  on conflict (user_id, local_date) do update set
    timezone = excluded.timezone,
    water_ml = excluded.water_ml,
    updated_at = statement_timestamp()
  returning * into v_row;

  v_response := jsonb_build_object(
    'water', jsonb_build_object(
      'local_date', v_row.local_date,
      'water_ml', v_row.water_ml
    )
  );

  insert into private.account_mutation_keys(
    user_id, action, idempotency_key, request_sha256, response_payload
  ) values (
    p_user_id, 'save-daily-water', p_idempotency_key, p_request_sha256, v_response
  );
  return v_response;
exception
  when unique_violation then
    select * into v_existing
    from private.account_mutation_keys
    where user_id = p_user_id
      and action = 'save-daily-water'
      and idempotency_key = p_idempotency_key;
    if v_existing.request_sha256 = p_request_sha256 then
      return v_existing.response_payload;
    end if;
    raise exception 'idempotency_key_reused' using errcode = 'P0001';
end;
$$;

revoke all on function public.save_daily_water(uuid, date, text, integer, text, text)
from public, anon, authenticated;
grant execute on function public.save_daily_water(uuid, date, text, integer, text, text)
to service_role;

-- ---------------------------------------------------------------------------
-- Account deletion also removes water logs.
-- ---------------------------------------------------------------------------
create or replace function public.purge_account_owned_rows(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if p_user_id is null then
    raise exception 'invalid_purge_arguments' using errcode = '22023';
  end if;

  delete from public.workout_set_logs where user_id = p_user_id;
  delete from public.workout_exercise_logs where user_id = p_user_id;
  delete from public.workout_sessions where user_id = p_user_id;
  delete from public.extra_food_logs where user_id = p_user_id;
  delete from public.shopping_purchases where user_id = p_user_id;
  delete from public.daily_meal_status where user_id = p_user_id;
  delete from public.daily_water_logs where user_id = p_user_id;
  delete from public.daily_checkins where user_id = p_user_id;
  delete from public.weekly_checkins where user_id = p_user_id;
  delete from public.next_cycle_inputs where user_id = p_user_id;
  delete from public.monthly_plan_snapshots where user_id = p_user_id;
  delete from public.starter_plan_activations where user_id = p_user_id;
  delete from public.external_plan_imports where user_id = p_user_id;
  delete from public.ai_generation_jobs where user_id = p_user_id;
  delete from public.monthly_plan_periods where user_id = p_user_id;
  delete from public.usage_ledger where user_id = p_user_id;
  delete from public.plan_versions where user_id = p_user_id;
  delete from public.plans where user_id = p_user_id;
  delete from public.gift_reservations where user_id = p_user_id;
  delete from public.ai_safety_reports where user_id = p_user_id;
  delete from public.body_composition_measurements where user_id = p_user_id;
  delete from public.training_schedule_items where user_id = p_user_id;
  delete from public.goals where user_id = p_user_id;
  delete from public.dietary_preferences where user_id = p_user_id;
  delete from public.health_context where user_id = p_user_id;
  delete from public.onboarding_drafts where user_id = p_user_id;
  delete from public.export_requests where user_id = p_user_id;
  delete from public.subscriptions where user_id = p_user_id;
  delete from public.entitlements where user_id = p_user_id;
  delete from private.api_rate_limits where user_id = p_user_id;
  delete from private.account_mutation_keys where user_id = p_user_id;
end;
$$;

commit;
