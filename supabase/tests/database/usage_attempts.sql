begin;
set local role postgres;
set local search_path = extensions, public;

create extension if not exists pgtap with schema extensions;
select extensions.plan(1);

select extensions.ok(
  exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ai_usage_attempts'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%''started''%'
  ),
  'a usage attempt can be recorded before the provider responds'
);

select * from extensions.finish();
rollback;
