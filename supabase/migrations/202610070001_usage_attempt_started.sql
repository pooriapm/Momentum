begin;

-- Generation records a durable attempt before the provider is called.
-- The ledger uses outcome 'started' for that row; the original check rejected it.
do $$
declare
  v_name text;
begin
  select con.conname into v_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'ai_usage_attempts'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%accepted%';

  if v_name is not null then
    execute format('alter table public.ai_usage_attempts drop constraint %I', v_name);
  end if;
end $$;

alter table public.ai_usage_attempts
  add constraint ai_usage_attempts_outcome_check
  check (outcome in (
    'started',
    'accepted',
    'validation_failed',
    'persistence_failed',
    'provider_failed',
    'repair_applied',
    'canceled'
  ));

commit;
