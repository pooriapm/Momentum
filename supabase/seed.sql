-- Preview catalog only. Checkout is intentionally not implemented.
-- Both product versions are served: intl/USD and ir/IRR. Annual SKUs are out of MVP.
insert into public.product_prices(
  id,
  product_code,
  market,
  currency,
  billing_interval,
  amount_minor,
  included_plan_generations,
  active,
  metadata
)
values
  ('10000000-0000-4000-8000-000000000001', 'membership', 'global', 'USD', 'month', 1499, 1, true, '{"pricing_stage":"preview","tax_included":false}'::jsonb),
  ('10000000-0000-4000-8000-000000000005', 'membership', 'ir', 'IRR', 'month', 4900000, 1, true, '{"display_amount_toman":490000,"pricing_stage":"preview","tax_included":false}'::jsonb)
on conflict (product_code, market, currency, billing_interval) do update
set
  amount_minor = excluded.amount_minor,
  included_plan_generations = excluded.included_plan_generations,
  metadata = excluded.metadata,
  active = excluded.active;
