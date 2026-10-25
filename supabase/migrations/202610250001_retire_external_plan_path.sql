begin;

-- The bring-your-own-plan path is retired: every plan comes from Momentum.
-- The onboarding draft no longer chooses a plan source, so nothing copies one onto the profile.
drop trigger if exists profiles_capture_plan_source_preference on public.profiles;
drop function if exists private.capture_plan_source_preference();

update public.profiles
set plan_source_preference = 'momentum'
where plan_source_preference <> 'momentum';

alter table public.profiles drop constraint if exists profiles_plan_source_preference_check;
alter table public.profiles
  add constraint profiles_plan_source_preference_check
  check (plan_source_preference = 'momentum');

-- No caller is left; existing import rows stay for account export and purge.
revoke all on function public.persist_external_plan(
  uuid, text, uuid, text, date, date, text, text, text, text, jsonb, text
) from public, anon, authenticated, service_role;

commit;
