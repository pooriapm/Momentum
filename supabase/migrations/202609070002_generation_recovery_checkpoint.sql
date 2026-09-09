-- Durable checkpoint for validated provider output. The application verifies
-- the content and context hashes before reuse.
alter table public.ai_generation_jobs
  add column if not exists saved_generation jsonb;

comment on column public.ai_generation_jobs.saved_generation is
  'Validated generation checkpoint; hashes are verified before import.';
