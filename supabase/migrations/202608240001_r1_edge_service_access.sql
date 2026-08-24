-- R1: grant the Edge runtime only the table access used by the target functions.
-- Browser roles remain governed by their existing grants and RLS policies.

grant select on table
  public.profiles,
  public.onboarding_drafts,
  public.goals,
  public.dietary_preferences,
  public.health_context,
  public.body_composition_measurements,
  public.training_schedule_items,
  public.product_prices,
  public.subscriptions,
  public.entitlements,
  public.usage_ledger,
  public.ai_generation_jobs,
  public.plans,
  public.plan_versions,
  public.daily_checkins,
  public.daily_meal_status,
  public.extra_food_logs,
  public.weekly_checkins,
  public.workout_sessions,
  public.workout_exercise_logs,
  public.workout_set_logs,
  public.ai_safety_reports,
  public.gift_reservations,
  public.monthly_plan_periods,
  public.monthly_plan_snapshots,
  public.next_cycle_inputs,
  public.export_requests,
  public.deletion_requests,
  public.catalog_releases,
  public.allergen_catalog,
  public.ingredient_catalog,
  public.ingredient_allergens,
  public.food_catalog,
  public.food_catalog_ingredients,
  public.equipment_catalog,
  public.exercise_catalog,
  public.exercise_equipment,
  public.exercise_substitutions
to service_role;

grant insert, update on table
  public.ai_generation_jobs,
  public.monthly_plan_periods
to service_role;

comment on table public.ai_generation_jobs is
  'Service-authored generation state. Edge access is explicitly granted; browser writes remain forbidden.';
comment on table public.monthly_plan_periods is
  'Service-authored monthly lifecycle state. Edge access is explicitly granted; browser writes remain forbidden.';
