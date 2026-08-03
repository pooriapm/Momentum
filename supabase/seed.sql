-- Preview catalog only. Checkout is intentionally not implemented, and Iran AI
-- products remain launch-blocked. Production promotion requires margin/legal review.
insert into public.product_prices(
  id,
  product_code,
  market,
  currency,
  billing_interval,
  amount_minor,
  included_plan_generations,
  included_coach_messages,
  included_body_composition_extractions,
  active,
  metadata
)
values
  ('10000000-0000-4000-8000-000000000001', 'core', 'global', 'USD', 'month', 1499, 4, 100, 2, true, '{"pricing_stage":"preview","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'core', 'global', 'USD', 'year', 14999, 48, 1200, 24, true, '{"pricing_stage":"preview","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'pro', 'global', 'USD', 'month', 2999, 8, 250, 4, true, '{"pricing_stage":"preview","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000004', 'pro', 'global', 'USD', 'year', 25999, 96, 3000, 48, true, '{"pricing_stage":"preview","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000005', 'core', 'ir', 'IRR', 'month', 4900000, 4, 100, 2, false, '{"display_amount_toman":490000,"pricing_stage":"inactive","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000006', 'core', 'ir', 'IRR', 'year', 39200000, 48, 1200, 24, false, '{"display_amount_toman":3920000,"pricing_stage":"inactive","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000007', 'pro', 'ir', 'IRR', 'month', 8900000, 8, 250, 4, false, '{"display_amount_toman":890000,"pricing_stage":"inactive","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000008', 'pro', 'ir', 'IRR', 'year', 71200000, 96, 3000, 48, false, '{"display_amount_toman":7120000,"pricing_stage":"inactive","tax_included":false}'::jsonb)
on conflict (product_code, market, currency, billing_interval) do update
set
  amount_minor = excluded.amount_minor,
  included_plan_generations = excluded.included_plan_generations,
  included_coach_messages = excluded.included_coach_messages,
  included_body_composition_extractions = excluded.included_body_composition_extractions,
  metadata = excluded.metadata,
  active = excluded.active;
