# Staging readiness blockers (Package C)

Status: `not_provisioned` in `supabase/environments.json`.

## Required before flipping staging to active

1. Owner approval for a paid Supabase staging project and Cloudflare `momentum-staging` worker.
2. Create staging Supabase project; set `project_ref`, `api_origin`, Auth redirect allowlist, exact-origin CORS, and isolated secrets (Mail sandbox).
3. Apply migrations including `202609030001_account_purge_owned_rows.sql` and `202609030002_body_report_retention.sql` before deploying Edge Functions that depend on them.
4. Deploy Edge Functions + frontend via same-SHA promote (`scripts/ops/promote-frontend.mjs` / `.github/workflows/promote.yml`).
5. Run hosted proofs: RLS A/B/anonymous, Auth lifecycle, export/delete, retention, consent rollout.
6. Update `ops/contract.json` `backup.hostedRestoreStatus` only after a real staging restore drill.

## Explicit non-actions until approved

- Do not create paid cloud resources from this agent session.
- Do not point production scripts at unverified staging refs.
- Do not mark hosted restore as rehearsed/verified without dated evidence under `artifacts/restore-drills/`.
