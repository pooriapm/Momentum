begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

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
      select table_name
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'service_role'
        and privilege_type = 'SELECT'
      union
      select table_name
      from information_schema.role_column_grants
      where table_schema = 'public'
        and grantee = 'service_role'
        and privilege_type = 'SELECT'
    )
    select count(*)::integer
    from grants
    join user_tables on user_tables.relname = grants.table_name
  ),
  0,
  'service role reaches user data through explicit RPCs rather than broad table reads'
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
