#!/usr/bin/env bash
# Local restore-drill for Momentum.
# Does not touch production. Default mode never requires Docker to succeed.
# Modes:
#   dry-run       checklist only
#   execute       local dump dry-run (non-destructive)
#   local-restore isolated wipe/rebuild + post-checks (destructive to local only)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MODE="${1:-dry-run}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
RPO_HOURS="${RPO_HOURS:-24}"
RTO_HOURS="${RTO_HOURS:-8}"
DRILL_CADENCE="${DRILL_CADENCE:-before launch, then at least quarterly}"
EVIDENCE_DIR="${ROOT}/artifacts/restore-drills"
EVIDENCE_FILE="${EVIDENCE_DIR}/restore-drill-$(date -u +%Y%m%dT%H%M%SZ).json"
DUMP_OUTCOME="skipped"
DUMP_REASON="default mode does not dump"
RESTORE_OUTCOME="skipped"
RESTORE_REASON="not requested"
ROW_CHECKS="skipped"
HOSTED_STATUS="blocked_no_staging"

mkdir -p "${EVIDENCE_DIR}"

if [[ -f "${ROOT}/supabase/environments.json" ]]; then
  STAGING_STATUS="$(node -e "const e=require('./supabase/environments.json'); process.stdout.write(e.staging?.status||'unknown')")"
  if [[ "${STAGING_STATUS}" == "active" ]]; then
    HOSTED_STATUS="pending_hosted_rehearsal"
  fi
fi

cat <<EOF
Momentum local restore drill
============================
Started (UTC): ${STARTED_AT}
Mode: ${MODE}
Environment: local / synthetic only. Never dump production. Never dump
secrets, PHI, prompts, or model output into tickets or this repo.

RPO placeholder: ${RPO_HOURS} hours for ordinary product records
RTO placeholder: ${RTO_HOURS} hours for early public beta
Cadence placeholder: ${DRILL_CADENCE}

These numbers are launch hypotheses, not provider guarantees and not an
owner signature. Paid-transaction RPO must be shorter if checkout ships.
Hosted restore remains blocked until an isolated staging project exists
and a dated hosted rehearsal is recorded.

Local rehearsal notes
---------------------
1. Backup file (local dry-run; isolated Postgres from \`npx supabase start\`):
     npx supabase db dump --local --dry-run
     npx supabase db dump --local -f /tmp/momentum-restore-drill.sql

2. Wipe-and-rebuild the *local* database (destructive to local only):
     bash scripts/ops/restore-drill.sh local-restore
   This runs db reset, reapplies migrations/seed, then checks RLS helpers
   and that deleted-account revive paths stay blocked.

3. Hosted restore requires provisioned staging and owner approval.

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

write_evidence() {
  local hosted_status="$1"
  cat > "${EVIDENCE_FILE}" <<JSON
{
  "schemaVersion": "1.0.0",
  "startedAt": "${STARTED_AT}",
  "finishedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "mode": "${MODE}",
  "environment": "local",
  "dumpOutcome": "${DUMP_OUTCOME}",
  "dumpReason": "${DUMP_REASON}",
  "restoreOutcome": "${RESTORE_OUTCOME}",
  "restoreReason": "${RESTORE_REASON}",
  "rowChecks": "${ROW_CHECKS}",
  "rpoHours": ${RPO_HOURS},
  "rtoHours": ${RTO_HOURS},
  "cadence": "${DRILL_CADENCE}",
  "hostedRestoreStatus": "${hosted_status}",
  "evidenceFile": "${EVIDENCE_FILE#${ROOT}/}",
  "neverProductionDump": true,
  "claimsProvenRestore": $([ "${MODE}" = "local-restore" ] && [ "${RESTORE_OUTCOME}" = "ran" ] && echo true || echo false)
}
JSON
  echo
  echo "Evidence written: ${EVIDENCE_FILE#${ROOT}/}"
}

if [[ "$MODE" == "dry-run" ]]; then
  echo
  echo "Dry-run complete. Dump outcome: skipped (default mode does not dump)."
  echo "Commands that would run for a local rehearsal:"
  echo "  npx supabase status"
  echo "  npx supabase db dump --local --dry-run"
  echo "  bash scripts/ops/restore-drill.sh local-restore"
  echo
  echo "Re-run with: bash scripts/ops/restore-drill.sh execute"
  write_evidence "${HOSTED_STATUS}"
  exit 0
fi

require_local_supabase() {
  if ! command -v docker >/dev/null 2>&1; then
    DUMP_OUTCOME="skipped"
    DUMP_REASON="Docker is not installed"
    echo "Dump outcome: skipped (Docker is not installed). CI pgTAP remains npx supabase test db."
    write_evidence "${HOSTED_STATUS}"
    exit 0
  fi
  if ! docker info >/dev/null 2>&1; then
    DUMP_OUTCOME="skipped"
    DUMP_REASON="Docker is not running"
    echo "Dump outcome: skipped (Docker is not running). CI pgTAP remains npx supabase test db."
    write_evidence "${HOSTED_STATUS}"
    exit 0
  fi
  if ! npx supabase status >/dev/null 2>&1; then
    DUMP_OUTCOME="skipped"
    DUMP_REASON="local Supabase is not running"
    echo "Dump outcome: skipped (local Supabase is not running). Start it with npx supabase start to rehearse."
    write_evidence "${HOSTED_STATUS}"
    exit 0
  fi
}

if [[ "$MODE" == "execute" ]]; then
  echo
  echo "Execute mode: attempting a local dump dry-run (still non-destructive; never production)."
  echo "This mode is NOT a proven restore. Use local-restore for wipe/rebuild evidence."
  require_local_supabase
  npx supabase db dump --local --dry-run
  DUMP_OUTCOME="ran"
  DUMP_REASON="local dump dry-run finished"
  RESTORE_OUTCOME="skipped"
  RESTORE_REASON="execute mode is dump dry-run only"
  echo "Dump outcome: ran (local dump dry-run finished). Do not claim hosted or proven restore from this mode."
  write_evidence "${HOSTED_STATUS}"
  exit 0
fi

if [[ "$MODE" != "local-restore" ]]; then
  echo "Unknown mode: ${MODE}. Use dry-run | execute | local-restore" >&2
  exit 1
fi

echo
echo "local-restore mode: destructive to the *local* database only. Never production."
require_local_supabase

npx supabase db dump --local --dry-run
DUMP_OUTCOME="ran"
DUMP_REASON="local dump dry-run finished before reset"

npx supabase db reset --local
RESTORE_OUTCOME="ran"
RESTORE_REASON="local db reset reapplied migrations and seed"

if npx supabase test db >/dev/null 2>&1; then
  ROW_CHECKS="pgTAP_passed"
else
  ROW_CHECKS="pgTAP_failed"
  echo "pgTAP checks failed after local restore." >&2
  write_evidence "${HOSTED_STATUS}"
  exit 1
fi

echo "Local restore rehearsal finished. Deleted accounts must not revive; pgTAP/RLS suite passed."
write_evidence "${HOSTED_STATUS}"
