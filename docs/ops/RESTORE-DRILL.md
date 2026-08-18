# Restore drill

Local dry-run (no production, no owner signature): [`scripts/ops/restore-drill.sh`](../../scripts/ops/restore-drill.sh).

```bash
bash scripts/ops/restore-drill.sh
```

RPO/RTO values in that script are placeholders. Database contract tests (pgTAP) are gated in CI by `npx supabase test db` in [`.github/workflows/quality.yml`](../../.github/workflows/quality.yml). Unit tests and this dry-run do not require Docker.
