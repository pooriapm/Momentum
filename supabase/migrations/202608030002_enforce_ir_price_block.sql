-- Defense in depth: Iran remains outside the AI launch surface until a reviewed
-- provider/legal decision explicitly replaces this migration.
update public.product_prices
set active = false
where market = 'ir';

alter table public.product_prices
  add constraint product_prices_ir_ai_disabled
  check (market <> 'ir' or active = false)
  not valid;

alter table public.product_prices
  validate constraint product_prices_ir_ai_disabled;
