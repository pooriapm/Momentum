# Momentum operations runbook

Version: 1.0
Last reviewed: 2026-07-31
Owners: Engineering, Product, Safety, Support, Legal/Privacy
Scope: pre-production through public operation

This runbook defines required operating controls. Exact commands and provider dashboards must be added as implementation stabilizes. Never copy production secrets, health records, or user conversations into this document.

## ۱. خلاصه عملیاتی فارسی

- محیط production از development و preview جداست.
- دیتابیس و Auth سمت سرور است و RLS برای همه داده‌های کاربر اجباری است.
- کلید OpenAI و Supabase service-role هرگز در مرورگر قرار نمی‌گیرند.
- هر درخواست AI ابتدا account، consent، سن، entitlement و کشور مجاز را بررسی می‌کند.
- در قطعی AI، برنامه ذخیره‌شده و ثبت روزانه باید کار کند.
- کنترل هزینه داخلی لازم است؛ هشدار هزینه provider سقف سخت نیست.
- backup بدون restore drill قابل اعتماد محسوب نمی‌شود.
- رخداد ایمنی یا نشت داده می‌تواند نیازمند توقف فوری قابلیت باشد.
- **AI ایران و قیمت ایرانی غیرفعال است.** تغییر این وضعیت فقط با تأیید کتبی provider، حقوقی و امضای Go/No-Go مجاز است؛ هیچ override دستی برای پشتیبانی یا مدیر سیستم وجود ندارد.

## 2. Environment model

| Environment | Purpose | Data policy | AI policy |
| --- | --- | --- | --- |
| Local | Developer work | Synthetic data only | Mock by default; explicit developer project if needed |
| Test/CI | Automated tests | Deterministic fixtures | Mock/recorded contract fixtures; no personal data |
| Preview | Pull-request/review app | Synthetic seeded tenant | AI off by default or isolated capped project |
| Staging | Production-like verification | Synthetic or approved anonymized data | Separate capped provider project and allowlist |
| Production | Approved public markets | Real user data under production policy | Server-only, allowlisted countries, entitlements, circuit breaker |

Requirements:

- separate Supabase/OpenAI projects and credentials by environment;
- production data never copied to local, preview, or CI;
- preview database branches must not clone real auth or health data unless a separately approved anonymization process exists;
- environment identity is visible in logs and deployment metadata;
- production migrations are promoted from the same reviewed artifacts used in staging.

## 3. Required configuration classes

Names below describe configuration contracts; implementation may map them to provider-specific secret names.

### Public client configuration

- application origin and environment name;
- Supabase public URL and publishable key;
- default locale and supported locales;
- public feature status that does not grant server permission;
- public policy/terms version identifiers.

### Server secrets

- Supabase secret/service-role credential;
- OpenAI API credential and project identifier;
- email provider secret;
- observability ingest secret;
- future payment webhook and API secrets;
- cryptographic signing/encryption keys where required.

### Server policy configuration

- AI master kill switch;
- AI plan-generation and coach-channel switches;
- explicit provider-country allowlist;
- model route by task;
- prompt/schema/catalog/safety-rule versions;
- per-plan quotas and rate limits;
- cost circuit-breaker thresholds;
- retention and deletion schedules;
- support/safety escalation destinations.

Iran must not be present in the AI country allowlist. There is no support-agent or user-level override. Changing the allowlist is a reviewed production policy release with Legal and Safety approval.

## 4. Secret management

- Store secrets only in the approved hosting/provider secret store.
- Never expose OpenAI or Supabase secret/service-role keys to client code.
- Never place secrets in repository files, screenshots, tickets, analytics, or chat.
- Use separate, least-privileged credentials per environment and service.
- Rotate on staff access change, suspected exposure, provider notice, or scheduled policy.
- Revoke first and investigate immediately if exposure is suspected.
- Secret scans run in CI and before public release.
- Provider admin credentials require MFA and restricted membership.

## 5. Identity and authorization operations

### Minimum controls

- verified email before AI trial or plan generation;
- secure recovery and session revocation;
- reasonable password/OTP abuse protection;
- server-side session validation for sensitive operations;
- RLS enabled on every exposed user-owned table;
- service-role usage restricted to narrow backend functions;
- privileged admin actions require explicit role and audit event;
- support staff do not impersonate users by default.

### RLS release gate

For each user-owned table, automated tests must prove:

1. anonymous users cannot read/write;
2. user A can access only authorized rows belonging to A;
3. user A cannot access user B by guessed ID, relationship, storage path, RPC, REST, or realtime subscription;
4. deleted/disabled accounts cannot create new sensitive records;
5. service functions validate the subject rather than trusting a client-supplied user ID.

Any cross-user failure is P0 and blocks deployment.

## 6. Data classification and handling

| Class | Examples | Handling |
| --- | --- | --- |
| Public | marketing copy, public exercise descriptions | Normal integrity controls |
| Account | email, auth IDs, subscription state | Encrypted provider storage, limited access |
| Sensitive health/wellness | weight, measurements, allergies, goals, check-ins, plans | RLS, minimization, access audit, no general analytics payload |
| Highly sensitive media/free text | body photos, detailed safety disclosures, conversations | Private storage, strict access, short retention, no support copying |
| Secrets | API/service credentials, signing keys | Secret manager only; never user data stores |

Maintain a live inventory of table/field, purpose, lawful basis/consent, owner, processor, retention, export behavior, and deletion behavior.

## 7. AI request operations

### Required request sequence

1. Authenticate and resolve the canonical user on the server.
2. Verify current consent and age eligibility.
3. Evaluate current country/provider eligibility.
4. Verify subscription/trial entitlement and feature quota.
5. Run deterministic safety screening and input moderation.
6. Assemble the minimum structured context.
7. Reserve an idempotency/usage record before provider execution.
8. Select model and service tier from server configuration.
9. Call the provider with output limit and pseudonymous safety identifier.
10. Parse Structured Output.
11. Run schema, catalog, deterministic, and policy validators.
12. Moderate user-visible output.
13. Commit plan/message and cost usage atomically, or fail closed.
14. Emit privacy-safe metrics and trace IDs.

### Geographic enforcement

- Eligibility is checked on every AI job, not only onboarding or UI display.
- Iran is denied while the blocker is active.
- Conflicting location/billing evidence produces an AI denial and reviewable reason code.
- Do not advise a user to use a VPN or change country to gain access.
- Do not forward an Iranian request through a different account, region, proxy, or provider endpoint without explicit approval.

### Cost controls

- per-user and per-plan quotas enforced before provider call;
- idempotency prevents duplicate charges on retries;
- model router defaults to the lowest-cost model proven to satisfy the task;
- Sol is exception-only and has a separate daily budget;
- output token limits are explicit;
- full history is not replayed; use a structured summary and recent bounded window;
- asynchronous plan recalibration uses Flex/Batch-rate processing when suitable;
- cache writes and reads are measured separately;
- daily project spend velocity and p95 user cost are monitored;
- internal circuit breakers stop generation before a provider spend alert alone would.

### Suggested circuit-breaker states

| State | Trigger | Behavior |
| --- | --- | --- |
| Normal | Within quality/cost baseline | Configured model routes |
| Conserve | Spend velocity or latency warning | Disable nonessential Sol; defer background regeneration |
| Degraded | Provider errors/cost above incident threshold | Disable new plans; keep saved plans/logging; bounded safe message |
| Off | Safety, geography, credential, or data incident | Stop affected AI path immediately |

Safety validation is never disabled to save money.

## 8. Model, prompt, and schema release

Treat model routes, prompts, tools, schemas, catalogs, and safety rules as versioned production artifacts.

### Required promotion flow

1. Record motivation and affected task.
2. Run deterministic contract tests.
3. Run Persian and English quality/safety evals.
4. Compare success, severe failures, tokens, latency, and cost to the current version.
5. Review new data-sharing or retention behavior.
6. Deploy to staging.
7. Canary in an approved supported-country cohort.
8. Monitor and promote or roll back.

Do not perform blind model-string upgrades. Preserve the cost/latency/quality role of each route. A current family may have separate flagship, balanced, and high-volume models.

### Rollback requirements

- previous prompt/schema/model configuration remains available;
- stored plans retain their producing version;
- rollback does not require editing the client;
- in-flight jobs are idempotent and safe to retry or cancel;
- invalid new-schema records cannot become active plans.

## 9. Database migration operations

- All production schema changes use reviewed migrations.
- Prefer additive expand/migrate/contract changes.
- Backfill in bounded batches with progress and retry state.
- RLS, grants, triggers, indexes, and data retention are part of migration review.
- Destructive changes require verified backup and recovery plan.
- Never log row contents during health-data migration.
- Test old and new application versions during rolling deploys.
- Record migration ID, operator, start/end time, row count, and result.

## 10. Backups and recovery

Supabase Pro currently advertises daily backups retained for seven days. Provider backup is necessary but not sufficient for Momentum's recovery objectives.

Required operations:

- monitor backup success;
- document which database and object-storage data each backup covers;
- maintain an approved encrypted off-provider export strategy when risk and scale justify it;
- define RPO/RTO before public launch;
- run restore drills in an isolated environment;
- verify RLS and secrets after restore;
- verify plan versions, consent, entitlement, and deletion state;
- never restore deleted user data to active service without applying deletion tombstones/ledger rules.

Initial hypothesis to approve before launch:

- RPO: 24 hours for ordinary product records, shorter if paid transactions are added;
- RTO: 8 hours for the early public beta;
- restore drill: before launch and at least quarterly.

These are Momentum targets, not provider guarantees.

## 11. Observability

### Service dashboards

- authentication success/failure and abuse;
- API latency/error by route and environment;
- database connections, slow queries, storage, and backup state;
- queue depth, age, retry, and dead-letter jobs;
- AI requests, tokens, model, service tier, cost, latency, validation, and moderation;
- eligibility denial by categorical reason;
- trial/subscription entitlement and quota;
- export/deletion workflow age;
- safety reports and incident state.

### Logging rules

- use opaque IDs and trace IDs;
- redact authorization headers, cookies, tokens, prompts, full model outputs, emails, health values, and signed URLs;
- log categorical validator/safety reason codes, not sensitive source text;
- restrict and audit access to the separate safety evidence store;
- set explicit retention by log class;
- sample successful routine traces where appropriate, never incidents.

### Initial alert categories

- P0: secret leak, cross-user data access, mass unsafe output, blocked-country AI traffic, confirmed health-data disclosure;
- P1: allergen/eligibility validator escape, repeated unsafe plan, deletion failure, backup failure beyond RPO;
- technical: auth spike, provider error, queue age, database saturation, migration failure;
- financial: spend velocity, p95 cost, Sol volume, duplicate generation, quota anomaly.

Thresholds should be calibrated from staging/load tests and recorded in monitoring configuration. Avoid invented precision in this document.

## 12. Release process

### Before deployment

- working tree/release artifact reviewed;
- tests, type checks, lint, build, migrations, and security scans pass;
- release notes identify user, data, AI, pricing, eligibility, and policy effects;
- migration and rollback path reviewed;
- feature/kill-switch state recorded;
- source/policy review current when affected;
- required approvals present.

### Deployment

- deploy additive database changes first;
- deploy backend controls before exposing client UI;
- canary AI or high-risk changes;
- verify synthetic supported-country and blocked-country cases;
- verify auth, saved plan, log, export, and deletion smoke tests;
- monitor errors, cost, safety, and database state.

### After deployment

- record version and configuration;
- confirm no Iran AI request was accepted;
- confirm no unexpected model or Sol traffic;
- sample Persian/English core journeys;
- close or roll back based on defined observation window.

## 13. Incident response

### First response

1. Identify incident lead and severity.
2. Protect people and data; stop the affected path using the narrowest effective kill switch.
3. Preserve minimal necessary evidence and timestamps.
4. Revoke exposed credentials or sessions.
5. Notify internal Safety, Security, Privacy/Legal, Product, and Support owners as applicable.
6. Assess notification duties and provider reporting.
7. Recover from a verified safe state.
8. Communicate known facts without speculation.
9. Complete root cause, regression tests, and corrective actions.

### Special playbooks

#### Unsafe plan or medical-boundary escape

- disable the affected prompt/model/feature;
- identify potentially exposed users without broadening data access;
- have qualified reviewers assess harm and outreach;
- add the case to the bilingual regression suite;
- do not solve only by adding another untested prompt sentence.

#### Cross-user or sensitive-data exposure

- treat as P0;
- stop affected API/table/storage path;
- preserve access logs;
- rotate keys if relevant;
- determine scope, acquisition, encryption, and notification obligations;
- test every adjacent RLS/storage policy before re-enable.

#### AI served to blocked geography, including Iran

- stop the applicable AI path or master switch;
- preserve eligibility decision logs and provider request IDs;
- notify Legal and provider-account owner;
- determine whether provider notice is required;
- fix the server-side policy/bypass and add regression tests;
- do not instruct users to conceal location.

#### Cost runaway

- enter Conserve or Degraded state;
- disable Sol and nonessential regeneration;
- identify duplicate/idempotency, retry, prompt-context, abuse, or routing cause;
- provider spend alert is evidence, not containment;
- keep safety responses, saved plans, privacy access, and logging available.

#### Provider outage

- stop retry storms;
- queue only idempotent jobs within bounded age;
- show saved plans and a transparent degraded message;
- do not replace validated plans with generic unvalidated text;
- reconcile job/usage records after recovery.

## 14. Privacy operations

### Access/export request

- authenticate the requester;
- export user-owned profile, consent, plans, logs, and eligible conversation data in a common machine-readable format;
- exclude other users, secrets, internal security logic, and data prohibited from disclosure;
- record request state and completion without putting exported content in logs.

### Correction

- distinguish editable user facts from immutable audit history;
- a corrected measurement keeps source/audit metadata;
- regenerate a plan only after explicit user request or approved recalibration rule.

### Deletion

- revoke sessions and stop new jobs;
- cancel future subscription entitlement when payments exist;
- delete or anonymize active records according to policy;
- delete private media and provider-side state under the documented process;
- maintain only legally necessary minimal tombstone/audit data;
- document backup expiration and prevent accidental active restoration;
- send completion confirmation.

### Breach readiness

- maintain current processor contacts and contractual reporting windows;
- FTC Health Breach, GDPR, state, HIPAA, and other duties depend on facts and jurisdiction;
- Legal determines notification, but Engineering must surface accurate scope and timing quickly.

## 15. Support operations

Support has bilingual macros for:

- account verification and recovery;
- AI unavailable/degraded;
- unsupported-country explanation;
- Iran-specific unavailability without suggesting circumvention;
- safety boundary and professional referral;
- quota reached;
- export and deletion;
- cancellation/refund after payments launch;
- reporting an unsafe plan or privacy issue.

Support must not:

- provide medical or therapeutic advice;
- manually alter health records without an auditable user-authorized flow;
- bypass eligibility, entitlement, moderation, or country policy;
- ask users to send body photos or health details through ordinary email/chat;
- promise an Iran launch date or claim a workaround.

## 16. Operating cadence

### Daily

- P0/P1 safety/privacy/security review;
- provider availability, error, queue, and spend velocity;
- blocked-country AI traffic must remain zero;
- backup status and critical jobs.

### Weekly

- AI cost and quality by task/model/prompt/locale;
- sampled safety review;
- RLS/security alerts and privileged access;
- support themes and user reports;
- Safe Activation and WCM3;
- dependency and incident action items.

### Monthly

- retention, paid metrics when applicable, contribution margin, refunds;
- deletion/export SLA;
- restore/migration readiness;
- model and catalog drift;
- country allowlist review against official provider source.

### Quarterly

- restore drill;
- privacy/data inventory, subprocessors, access, and retention review;
- professional rule/catalog review;
- red-team and bilingual eval refresh;
- pricing and unit-economics review;
- official source refresh;
- Iran blocker review. Without affirmative written evidence, status remains No-Go.

## 17. Launch-day command authority

Named roles must exist before launch:

- Incident Lead: coordinates severity and containment;
- Engineering On-Call: deploys kill switch/rollback and preserves evidence;
- Safety Lead: assesses user-harm risk and output remediation;
- Privacy/Legal Lead: determines reporting and geographic/legal response;
- Product Lead: decides scope and user experience under constraints;
- Support Lead: delivers approved bilingual communication;
- Provider Account Owner: manages OpenAI/Supabase escalation and credentials.

One person may fill multiple roles in an early team, but the responsibilities and reachable contact path must be explicit.

## 18. Pre-launch operational checklist

- [ ] Production/staging provider projects separated
- [ ] MFA and least-privilege admin access complete
- [ ] Secrets scans and rotation path verified
- [ ] RLS and storage authorization suite passes
- [ ] Country/provider eligibility suite passes; Iran denied
- [ ] AI quota, idempotency, moderation, validators, and circuit breakers pass
- [ ] Persian/English safety and quality evals pass
- [ ] Database migration and rollback rehearsed
- [ ] Backup observed and restore drill passes
- [ ] Export and deletion exercises pass
- [ ] Monitoring, alerts, on-call, and support macros live
- [ ] Legal/privacy/professional launch gates signed
- [ ] Source review date current
- [ ] Public country allowlist recorded
- [ ] Iran AI and Iranian AI pricing confirmed inactive

See [Roadmap](./ROADMAP.md), [Safety and Launch Policy](./product/SAFETY_AND_LAUNCH_POLICY.md), [Metrics](./product/METRICS.md), and [Sources](./product/SOURCES.md).
