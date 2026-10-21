begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(25);

insert into auth.users(
  id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
) values
  ('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a', 'shopping-a@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false),
  ('4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b', 'shopping-b@example.com', statement_timestamp(),
    '{}'::jsonb, '{"locale":"en-US","country_code":"US"}'::jsonb,
    statement_timestamp(), statement_timestamp(), false, false);

update public.profiles
set timezone = 'UTC'
where user_id in (
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  '4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b'
);

set constraints all deferred;
insert into public.plans(
  id, user_id, name, status, valid_from, valid_to, locale, active_version_id
) values (
  '4c4c4c4c-4c4c-44c4-84c4-4c4c4c4c4c4c',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  'Shopping plan',
  'active',
  (statement_timestamp() at time zone 'UTC')::date,
  (statement_timestamp() at time zone 'UTC')::date + 29,
  'en-US',
  '4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d'
);
insert into public.plan_versions(
  id, plan_id, user_id, version, schema_version, source, content, content_sha256
) values (
  '4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d',
  '4c4c4c4c-4c4c-44c4-84c4-4c4c4c4c4c4c',
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  1,
  '1.0.0',
  'admin',
  jsonb_build_object(
    'plan_name', 'Shopping plan',
    'default_targets', '{}'::jsonb,
    -- Plan versions must hold exactly 30 day entries (plan_versions_thirty_day_content).
    'days', (select jsonb_agg(jsonb_build_object('day_index', i) order by i) from generate_series(0, 29) as i)
  ),
  repeat('b', 64)
);

create temporary table shopping_today on commit drop as
select (statement_timestamp() at time zone 'UTC')::date as local_date;

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.record_shopping_purchase(uuid,text,text,numeric,text,date,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.undo_shopping_purchase(uuid,uuid,text,text)',
    'execute'
  )
  and not has_function_privilege(
    'authenticated',
    'public.list_shopping_purchases(uuid)',
    'execute'
  ),
  'authenticated clients cannot call shopping purchase RPCs directly'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.shopping_purchases', 'INSERT')
  and not has_table_privilege('authenticated', 'public.shopping_purchases', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.shopping_purchases', 'DELETE')
  and not has_table_privilege('service_role', 'public.shopping_purchases', 'INSERT')
  and not has_table_privilege('service_role', 'public.shopping_purchases', 'DELETE'),
  'shopping purchases reject direct client and service writes'
);

select extensions.is(
  public.list_shopping_purchases('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a'),
  '[]'::jsonb,
  'no purchases yet'
);

select extensions.is(
  public.list_shopping_purchases('4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b'),
  '[]'::jsonb,
  'user without a plan gets an empty list'
);

create temporary table first_purchase on commit drop as
select public.record_shopping_purchase(
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  'ingredient:ingredient:rice@v2', 'g', 500, 'week',
  (select local_date from shopping_today),
  'shop-key-1', repeat('a', 64)
) as payload;

select extensions.is(
  (select payload ->> 'item_key' from first_purchase),
  'ingredient:ingredient:rice@v2',
  'record returns the item key'
);
select extensions.is(
  (select (payload ->> 'amount')::numeric from first_purchase),
  500::numeric,
  'record returns the amount'
);
select extensions.is(
  (select payload ->> 'scope' from first_purchase),
  'week',
  'record returns the scope'
);
select extensions.is(
  (select count(*)::integer from public.shopping_purchases
   where user_id = '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a'
     and plan_version_id = '4d4d4d4d-4d4d-44d4-84d4-4d4d4d4d4d4d'),
  1,
  'record attaches the active plan version'
);

select extensions.is(
  public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'ingredient:ingredient:rice@v2', 'g', 500, 'week',
    (select local_date from shopping_today),
    'shop-key-1', repeat('a', 64)
  ),
  (select payload from first_purchase),
  'idempotent replay returns the same row'
);
select extensions.is(
  (select count(*)::integer from public.shopping_purchases
   where user_id = '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a'),
  1,
  'replay does not insert a second row'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'ingredient:ingredient:rice@v2', 'g', 900, 'week',
    (select local_date from shopping_today),
    'shop-key-1', repeat('b', 64)
  )$$,
  'P0001',
  'idempotency_key_reused',
  'same key with different input is rejected'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'name:برنج', 'g', 200, 'plan',
    (select local_date - 1 from shopping_today),
    'shop-key-2', repeat('c', 64)
  )$$,
  'P0001',
  'purchase_date_not_current',
  'a purchase must be on the current profile-local date'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b',
    'name:rice', 'g', 200, 'plan',
    (select local_date from shopping_today),
    'shop-key-3', repeat('c', 64)
  )$$,
  'P0002',
  'active_plan_not_found',
  'a purchase requires an active plan'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'rice', 'g', 200, 'plan',
    (select local_date from shopping_today),
    'shop-key-4', repeat('c', 64)
  )$$,
  '22023',
  'invalid_shopping_purchase_arguments',
  'item key needs an ingredient: or name: prefix'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'name:rice', 'kg', 200, 'plan',
    (select local_date from shopping_today),
    'shop-key-5', repeat('c', 64)
  )$$,
  '22023',
  'invalid_shopping_purchase_arguments',
  'unit must be a catalog unit'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'name:rice', 'g', 0, 'plan',
    (select local_date from shopping_today),
    'shop-key-6', repeat('c', 64)
  )$$,
  '22023',
  'invalid_shopping_purchase_arguments',
  'amount must be positive'
);

select extensions.throws_ok(
  $$select public.record_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    'name:rice', 'g', 100001, 'month',
    (select local_date from shopping_today),
    'shop-key-7', repeat('c', 64)
  )$$,
  '22023',
  'invalid_shopping_purchase_arguments',
  'amount and scope are bounded'
);

select public.record_shopping_purchase(
  '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
  'name:برنج', 'piece', 2.5, 'plan',
  (select local_date from shopping_today),
  'shop-key-8', repeat('d', 64)
);

select extensions.is(
  jsonb_array_length(public.list_shopping_purchases('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a')),
  2,
  'owner lists both purchases for the active plan version'
);
select extensions.is(
  public.list_shopping_purchases('4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b'),
  '[]'::jsonb,
  'another user does not see the owner purchases'
);

select extensions.throws_ok(
  format(
    $$select public.undo_shopping_purchase(
      '4b4b4b4b-4b4b-44b4-84b4-4b4b4b4b4b4b', %L::uuid, 'undo-key-b', repeat('e', 64)
    )$$,
    (select payload ->> 'id' from first_purchase)
  ),
  'P0002',
  'shopping_purchase_not_found',
  'another user cannot undo the owner purchase'
);

select extensions.is(
  public.undo_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    (select (payload ->> 'id')::uuid from first_purchase),
    'undo-key-1', repeat('e', 64)
  ),
  jsonb_build_object('id', (select payload ->> 'id' from first_purchase)),
  'owner undoes the purchase'
);
select extensions.is(
  public.undo_shopping_purchase(
    '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a',
    (select (payload ->> 'id')::uuid from first_purchase),
    'undo-key-1', repeat('e', 64)
  ),
  jsonb_build_object('id', (select payload ->> 'id' from first_purchase)),
  'undo replay returns the same response after the row is gone'
);
select extensions.throws_ok(
  format(
    $$select public.undo_shopping_purchase(
      '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a', %L::uuid, 'undo-key-2', repeat('f', 64)
    )$$,
    (select payload ->> 'id' from first_purchase)
  ),
  'P0002',
  'shopping_purchase_not_found',
  'undoing an already-removed purchase with a new key is not found'
);
select extensions.is(
  jsonb_array_length(public.list_shopping_purchases('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a')),
  1,
  'undo removes the purchase from the list'
);

select public.purge_account_owned_rows('4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a');
select extensions.is(
  (select count(*)::integer from public.shopping_purchases
   where user_id = '4a4a4a4a-4a4a-44a4-84a4-4a4a4a4a4a4a'),
  0,
  'account purge removes shopping purchases'
);

select * from extensions.finish();
rollback;
