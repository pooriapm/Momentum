-- R2 measurement policy: values remain canonical SI in storage while display
-- and input units may follow the account country or an explicit user override.

alter table public.profiles drop constraint profiles_unit_system_check;

update public.profiles
set unit_system = 'us_customary'
where unit_system = 'imperial';

alter table public.profiles
  alter column unit_system set default 'auto',
  add constraint profiles_unit_system_check
    check (unit_system in ('auto', 'metric', 'us_customary'));

comment on column public.profiles.unit_system is
  'Display/input preference only: auto, metric, or us_customary. Canonical stored quantities remain SI/metric.';
