-- Account deletion must clear owner rows through a service-only RPC.
-- Service role has no table DELETE grants, so Edge Functions cannot wipe
-- owner or provider rows with PostgREST. This function removes those rows,
-- including usage_ledger and generation jobs, before Auth identity deletion.

begin;

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
  delete from public.daily_meal_status where user_id = p_user_id;
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

comment on function public.purge_account_owned_rows(uuid) is
  'Service-only account deletion helper. Removes owner rows, including RESTRICT-bound provider usage, before Auth identity deletion. Leaves profiles and deletion_requests for the identity cascade.';

revoke all on function public.purge_account_owned_rows(uuid)
from public, anon, authenticated;
grant execute on function public.purge_account_owned_rows(uuid) to service_role;

commit;
