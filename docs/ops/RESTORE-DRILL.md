# Restore drill

Local dry-run (no production, no owner signature): [`scripts/ops/restore-drill.sh`](../../scripts/ops/restore-drill.sh).

```bash
bash scripts/ops/restore-drill.sh
```

RPO/RTO values in that script are placeholders. Database contract tests (pgTAP) run locally with `npx supabase test db`. Unit tests and this dry-run do not require Docker.
