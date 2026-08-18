# Momentum data retention and deletion schedule — draft

**Status:** proposed policy for alpha implementation; not a verified production
schedule. Legal/Privacy, Security, Safety, and Engineering approval is required.

The shortest period that still serves a documented product, security, legal, or
financial purpose should win. “Until account deletion” is not permission to
retain data indefinitely after an account becomes inactive. Every period below
needs an automated job, owner, alert, deletion test, and backup reconciliation
before public launch.

## Proposed schedule

| Data class | Proposed active retention | Proposed deletion trigger | Current readiness |
| --- | --- | --- | --- |
| Authentication/account | while account is active | verified account-deletion request; revoke sessions and delete auth identity after workflow completes | Cascade design exists; end-to-end export/deletion proof is a launch gate |
| Onboarding draft | up to 30 days after last update | successful completion or inactivity expiry | Completion deletion is designed; inactivity job must be verified |
| Profile, goals, preferences, safety context | while needed for the active account | account deletion or removal of the applicable optional field/consent | User correction, consent withdrawal, and deletion UX need release verification |
| Raw body-composition report | until extraction is confirmed, rejected, or abandoned; never longer than 30 days by default | confirmation/rejection, explicit delete, abandonment expiry, or account deletion | Private storage exists; automatic object deletion and failure monitoring remain gates |
| Confirmed derived measurements | while account is active or until user deletes them | measurement deletion or account deletion | Export/deletion coverage must be tested |
| Plans, meal/workout selections, check-ins, progress | while account is active | per-record deletion where supported or account deletion | Policy and product decision for user-selective deletion remain open |
| Monthly plan snapshots and generated versions | retained with plan history unless the user deletes the account or an approved expiry policy applies | period expiry policy or account deletion | Final retention period and export scope are not approved |
| AI request/job metadata | 30 days after terminal state; retain only opaque IDs, model/schema versions, token/cost totals and categorical reasons | scheduled expiry | Verify that prompts, health values and raw provider errors never enter routine metadata |
| Idempotency/usage ledger | minimum period needed to prevent replay and reconcile quota/billing; proposed 90 days | expiry after dispute/reconciliation window | Final period depends on payment design and fraud review |
| Security/audit events | proposed 90 days; longer only for a documented incident/legal need | rolling expiry or approved legal hold | Final event inventory and access audit are launch gates |
| Generic analytics | aggregate/de-identify as early as possible; proposed raw-event maximum 30 days | aggregation then raw deletion | No health fields or free text allowed; provider not yet selected |
| Support cases | proposed 12 months after closure unless law/incident requires otherwise | closure-period expiry or verified request | Support provider and redaction process not selected |
| Billing/tax records | not collected yet; future period set by merchant and applicable law | statutory/contractual expiry | Payment launch is blocked until this is specified per market |
| Anonymized deletion receipt | minimal opaque account hash, completion timestamp, policy version and result; proposed 3 years | expiry after audit/claims need | Must be stored outside restorable user records and must not allow reconstruction |

The periods are Momentum hypotheses, not statements about vendor defaults or
legal requirements in every jurisdiction.

## AI-provider retention

Momentum intends to call the OpenAI API with `store: false`; that does not by
itself mean Zero Data Retention. OpenAI's published API data controls state that
abuse-monitoring logs may be retained for up to 30 days by default. Any approved
Zero Data Retention or modified-monitoring configuration must be documented with
evidence for the exact project, models, endpoints, and date. Provider retention
is separate from Momentum's database deletion.

Reference: [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data).

## Backups and deletion

Database-backup retention depends on the selected Supabase plan and production
configuration. Supabase documents daily backup windows by plan and notes that
database backups do not include Storage objects. Momentum must record the
actual production window rather than copy a generic number into the privacy
notice.

Deletion must:

1. revoke active sessions and stop new writes;
2. delete or detach every user-owned database row under an approved cascade;
3. delete every private Storage object and signed-access path;
4. remove queue/dead-letter payloads and processor-side copies where supported;
5. create only the approved anonymized deletion receipt;
6. maintain a tombstone/ledger so a restore cannot silently resurrect an account;
7. prove the result through automated and periodic restore/deletion drills.

If a backup cannot be selectively changed, deleted data may remain inaccessible
until the backup expires, but it must not be restored into active service. The
effective privacy notice must disclose the verified behavior.

References:

- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Momentum operations runbook](../OPERATIONS.md)

## Legal holds and incidents

A documented legal or safety hold may pause deletion only for the minimum data
and duration required by qualified counsel. The hold needs an owner, reason,
scope, start/review/end dates, access restriction, and audit record. Support or
engineering convenience is not a legal hold.

## Required release evidence

- table/field/storage inventory mapped to a row above;
- automated expiry jobs and failure alerts in staging;
- authenticated export that is complete and intelligible;
- account deletion covering Auth, database, Storage, queues and sessions;
- provider deletion/retention configuration captured;
- backup and Storage restore drill with deletion tombstone replay;
- retention text matched across product UI, privacy notice, support scripts and
  incident procedures;
- named policy owner and quarterly review date.
