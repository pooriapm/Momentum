#!/usr/bin/env bash
# Local restore-drill dry-run for Momentum.
# Does not touch production. Default mode never requires Docker to succeed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-dry-run}"
RPO_HOURS="${RPO_HOURS:-24}"
RTO_HOURS="${RTO_HOURS:-8}"
DRILL_CADENCE="${DRILL_CADENCE:-before launch, then at least quarterly}"

cat <<EOF
Momentum local restore drill
============================
Environment: local / synthetic only. Never dump production secrets, PHI,
prompts, or model output into tickets or this repo.

RPO placeholder: ${RPO_HOURS} hours for ordinary product records
RTO placeholder: ${RTO_HOURS} hours for early public beta
Cadence placeholder: ${DRILL_CADENCE}

These numbers are launch hypotheses, not provider guarantees and not an
owner signature. Paid-transaction RPO must be shorter if checkout ships.

Local rehearsal notes
---------------------
1. Backup file (local dry-run; isolated Postgres from \`npx supabase start\`):
     npx supabase db dump --local --dry-run
     npx supabase db dump --local -f /tmp/momentum-restore-drill.sql

2. Wipe-and-rebuild the *local* database (destructive to local only):
     npx supabase db reset --local
   This reapplies migrations and supabase/seed.sql. It is the recovery
   rehearsal when the backup is "schema + seed", not a production PITR.

3. If rehearsing restore from a dump file onto local Postgres, keep the
   file outside the repo and do not commit it. After restore, confirm RLS
   is still enforced before pointing any client at the database.

pgTAP / CI
----------
CI backend job in .github/workflows/quality.yml runs:
  npx supabase test db
That is the pgTAP + RLS gate. Application unit tests and this dry-run do
not require Docker.

Checklist
---------
[ ] Backup source named (provider daily backup vs local dump file)
[ ] Isolated target (local Supabase or a separate project; never production)
[ ] Dump/restore commands recorded with timestamp and operator
[ ] RLS, grants, and service-role isolation still hold after restore
[ ] Edge secrets were not copied into the dump, logs, or tickets
[ ] Consent versions, entitlements, and plan versions are present
[ ] Deletion/tombstone rules still applied (do not revive deleted users)
[ ] RPO/RTO placeholders reviewed before public launch
EOF

if [[ "$MODE" != "execute" ]]; then
  echo
  echo "Dry-run complete. Commands that would run for a local rehearsal:"
  echo "  npx supabase status"
  echo "  npx supabase db dump --local --dry-run"
  echo "  # opt-in destructive local rebuild: npx supabase db reset --local"
  echo
  echo "Re-run with: bash scripts/ops/restore-drill.sh execute"
  exit 0
fi

echo
echo "Execute mode: attempting a local dump dry-run (still non-destructive)."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed; skipping dump. CI pgTAP remains npx supabase test db."
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running; skipping dump. CI pgTAP remains npx supabase test db."
  exit 0
fi

if ! npx supabase status >/dev/null 2>&1; then
  echo "Local Supabase is not running; skipping dump. Start it with npx supabase start to rehearse."
  exit 0
fi

npx supabase db dump --local --dry-run
echo "Local dump dry-run finished. Do not run db reset unless you intend to wipe local data."
