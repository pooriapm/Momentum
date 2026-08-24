-- Preserve the deployed function bodies while making empty-array initialization
-- explicit. This removes PL/pgSQL assignment-cast ambiguity without changing
-- behavior, signatures, security-definer settings, grants, or search paths.
do $$
declare
  v_function regprocedure;
  v_definition text;
  v_rewritten text;
begin
  foreach v_function in array array[
    'public.save_daily_checkin(uuid,date,text,jsonb,text,text)'::regprocedure,
    'public.save_weekly_checkin(uuid,date,text,jsonb,text,text)'::regprocedure,
    'public.update_account_settings(uuid,jsonb,text,text)'::regprocedure
  ]
  loop
    v_definition := pg_get_functiondef(v_function);
    v_rewritten := replace(
      v_definition,
      'text[] := ''{}'';',
      'text[] := ARRAY[]::text[];'
    );

    if v_rewritten = v_definition then
      raise exception 'Expected empty text-array initializer not found in %', v_function;
    end if;

    execute v_rewritten;
  end loop;
end;
$$;
