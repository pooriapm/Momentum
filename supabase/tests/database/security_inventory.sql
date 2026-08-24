begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity
  ),
  0,
  'every public table has row-level security enabled'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and exists (
        select 1
        from pg_catalog.pg_attribute a
        where a.attrelid = c.oid
          and a.attname = 'user_id'
          and not a.attisdropped
      )
      and not c.relrowsecurity
  ),
  0,
  'every user-owned public table has row-level security enabled'
);

select extensions.is(
  (
    with user_tables as (
      select c.relname
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and exists (
          select 1
          from pg_catalog.pg_attribute a
          where a.attrelid = c.oid
            and a.attname = 'user_id'
            and not a.attisdropped
        )
    ), grants as (
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'anon'
      union
      select table_name, privilege_type
      from information_schema.role_column_grants
      where table_schema = 'public' and grantee = 'anon'
    )
    select count(*)::integer
    from grants
    join user_tables on user_tables.relname = grants.table_name
    where grants.privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'anonymous clients have no table or column privileges on user-owned data'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies p
    where p.schemaname = 'public'
      and (p.roles && array['anon', 'public']::name[])
      and exists (
        select 1
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        where n.nspname = p.schemaname
          and c.relname = p.tablename
          and a.attname = 'user_id'
          and not a.attisdropped
      )
  ),
  0,
  'no user-owned policy grants access to anon or public roles'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.role_table_grants g
    where g.table_schema = 'public'
      and g.grantee = 'authenticated'
      and g.privilege_type = 'SELECT'
      and exists (
        select 1
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        where n.nspname = g.table_schema
          and c.relname = g.table_name
          and a.attname = 'user_id'
          and not a.attisdropped
      )
      and not exists (
        select 1
        from pg_catalog.pg_policies p
        where p.schemaname = g.table_schema
          and p.tablename = g.table_name
          and ('authenticated' = any(p.roles) or 'public' = any(p.roles))
      )
  ),
  0,
  'every authenticated-readable user table has an authenticated RLS policy'
);

select extensions.is(
  (
    select array_agg(table_name order by table_name)::text[]
    from (
      select table_name
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
      union
      select table_name
      from information_schema.role_column_grants
      where table_schema = 'public'
        and grantee = 'authenticated'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    ) writable
  ),
  array[
    'body_composition_measurements',
    'extra_food_logs',
    'health_context',
    'next_cycle_inputs',
    'onboarding_drafts'
  ]::text[],
  'authenticated direct writes are limited to the approved owner-bound allowlist'
);

select extensions.is(
  (
    with sensitive(table_name) as (
      values
        ('subscriptions'),
        ('entitlements'),
        ('usage_ledger'),
        ('ai_generation_jobs'),
        ('plans'),
        ('plan_versions'),
        ('gift_reservations'),
        ('monthly_plan_periods'),
        ('monthly_plan_snapshots'),
        ('daily_checkins'),
        ('weekly_checkins'),
        ('workout_sessions'),
        ('export_requests'),
        ('deletion_requests')
    ), grants as (
      select table_name, privilege_type
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee = 'authenticated'
      union
      select table_name, privilege_type
      from information_schema.role_column_grants
      where table_schema = 'public' and grantee = 'authenticated'
    )
    select count(*)::integer
    from grants
    join sensitive using (table_name)
    where grants.privilege_type in ('INSERT', 'UPDATE', 'DELETE')
  ),
  0,
  'lifecycle, plan, usage, check-in, workout, export, and deletion tables reject direct client writes'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.plan_versions', 'SELECT'),
  'raw immutable plan versions are not client-readable'
);

select extensions.is(
  (
    with required(table_name) as (
      values
        ('profiles'), ('onboarding_drafts'), ('goals'), ('dietary_preferences'),
        ('health_context'), ('body_composition_measurements'), ('training_schedule_items'),
        ('product_prices'), ('subscriptions'), ('entitlements'), ('usage_ledger'),
        ('ai_generation_jobs'), ('plans'), ('plan_versions'), ('daily_checkins'),
        ('daily_meal_status'), ('extra_food_logs'), ('weekly_checkins'),
        ('workout_sessions'), ('workout_exercise_logs'), ('workout_set_logs'),
        ('ai_safety_reports'), ('gift_reservations'), ('monthly_plan_periods'),
        ('monthly_plan_snapshots'), ('next_cycle_inputs'), ('export_requests'),
        ('deletion_requests'), ('catalog_releases'), ('allergen_catalog'),
        ('ingredient_catalog'), ('ingredient_allergens'), ('food_catalog'),
        ('food_catalog_ingredients'), ('equipment_catalog'), ('exercise_catalog'),
        ('exercise_equipment'), ('exercise_substitutions')
    )
    select count(*)::integer
    from required
    where not has_table_privilege(
      'service_role',
      format('public.%I', required.table_name),
      'SELECT'
    )
  ),
  0,
  'service role can read every table required by the reviewed Edge implementation'
);

select extensions.is(
  (
    with allowed(table_name) as (
      values
        ('profiles'), ('onboarding_drafts'), ('goals'), ('dietary_preferences'),
        ('health_context'), ('body_composition_measurements'), ('training_schedule_items'),
        ('product_prices'), ('subscriptions'), ('entitlements'), ('usage_ledger'),
        ('ai_generation_jobs'), ('plans'), ('plan_versions'), ('daily_checkins'),
        ('daily_meal_status'), ('extra_food_logs'), ('weekly_checkins'),
        ('workout_sessions'), ('workout_exercise_logs'), ('workout_set_logs'),
        ('ai_safety_reports'), ('gift_reservations'), ('monthly_plan_periods'),
        ('monthly_plan_snapshots'), ('next_cycle_inputs'), ('export_requests'),
        ('deletion_requests'), ('catalog_releases'), ('allergen_catalog'),
        ('ingredient_catalog'), ('ingredient_allergens'), ('food_catalog'),
        ('food_catalog_ingredients'), ('equipment_catalog'), ('exercise_catalog'),
        ('exercise_equipment'), ('exercise_substitutions')
    )
    select count(*)::integer
    from information_schema.role_table_grants grants
    where grants.table_schema = 'public'
      and grants.grantee = 'service_role'
      and grants.privilege_type = 'SELECT'
      and not exists (
        select 1 from allowed where allowed.table_name = grants.table_name
      )
  ),
  0,
  'service-role public-table reads do not exceed the reviewed Edge allowlist'
);

select extensions.is(
  (
    select array_agg(table_name order by table_name)::text[]
    from (
      select table_name
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'service_role'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
      union
      select table_name
      from information_schema.role_column_grants
      where table_schema = 'public'
        and grantee = 'service_role'
        and privilege_type in ('INSERT', 'UPDATE', 'DELETE')
    ) writable
  ),
  array['ai_generation_jobs', 'monthly_plan_periods']::text[],
  'service-role direct writes are limited to generation job and monthly-period state'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  0,
  'authenticated clients cannot execute private-schema functions'
);

select extensions.is(
  (
    select array_agg(p.proname::text order by p.proname)::text[]
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  array[
    'account_payment_method_status',
    'current_legal_document_versions',
    'mutate_workout_session',
    'start_workout_session',
    'submit_ai_safety_report'
  ]::text[],
  'authenticated RPC execution matches the reviewed public allowlist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prosecdef
      and not exists (
        select 1
        from unnest(coalesce(p.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
  ),
  0,
  'every security-definer function pins its search_path'
);

select * from extensions.finish();
rollback;
