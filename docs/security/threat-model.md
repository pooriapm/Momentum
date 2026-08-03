# Momentum public-platform threat model

## Scope and assets

Protected assets include authentication sessions, profile and health context,
body-composition reports, plans and logs, coach conversations, OpenAI/service
keys, entitlement/quota state and future payment identifiers.

Trust boundaries:

1. browser/native client to Supabase Auth/Data API;
2. client to Edge Functions;
3. Edge Functions using the service role to PostgreSQL/Storage;
4. Edge Functions sending minimized context to OpenAI;
5. future payment providers and webhooks.

The client, imported files, user free text, model output, geo headers and payment
redirect parameters are untrusted.

## Threats and controls

| Threat | Primary controls | Residual risk / follow-up |
| --- | --- | --- |
| Cross-account reads/writes | RLS on every table, owner-bound FKs, private bucket policies, two-user tests | A service-role coding error can bypass RLS; keep functions small and filtered |
| Stolen credentials/tokens | TLS, short access-token lifetime, refresh rotation, secure platform storage, logout cache clearing | XSS can access SPA tokens; add CSP and consider an HttpOnly-cookie BFF if zero local credentials is required |
| OpenAI/service key exposure | Secrets only in Edge env, no `VITE_` variables, redacted logs, rotation procedure | Supabase project/admin compromise remains high impact |
| Prompt injection from profile/chat | Context serialized as data, explicit untrusted-data rule, no model-controlled DB tools, strict output schema | Model can still generate unsafe advice; safety evals and monitoring required |
| Model data exfiltration | Server-selected user context, no email/name, `store=false`, hashed safety ID | Provider processing remains a third-party disclosure requiring consent/policy |
| Unsafe health advice | No diagnosis/prescription, safety level, bounded context/output, clinical review and disclaimers | Natural-language guardrails are not a medical device certification |
| Quota/cost abuse | Confirmed email, per-user rate limits, request-bound atomic reservations, global circuit breaker, output caps, fail-closed master/feature switches | Add CAPTCHA/device/payment abuse controls and a model-price monetary cap |
| IDOR on meal selection/completion | Server RPC derives user, validates active plan/date/slot/option atomically | Other mutations must use the same authoritative pattern |
| Replay/double billing | Idempotency keys, unique constraints, job/usage state, reconciliation | Provider/DB split failures need scheduled repair |
| Malicious report upload | Private bucket, owner prefix, MIME/size allowlist, server-only download, confidence/evidence schema, trusted confirmation RPC | Add malware scanning, magic-byte validation and EXIF stripping before OCR |
| Geo/jurisdiction manipulation | IP/manual country is hint-only; AI requires service-only billing-country verification and allowlist; IR is hard-denied | Payment/admin verification operations need audit and periodic review |
| Consent/version bypass | Protected timestamp+version columns, transactional completion, required-version checks on every AI route | Add a re-consent UI and revocation/export workflows |
| SQL/RLS privilege escalation | Revoked table/RPC grants, pinned function search paths, parameter validation | Review every future `SECURITY DEFINER` function |
| Sensitive telemetry leakage | No prompt/body/error-detail logging, minimal audit metadata | Configure provider/Sentry/platform retention and scrub rules explicitly |
| Data loss/deletion failure | PostgreSQL constraints, backups/PITR, cascade map, export/delete runbook | Storage and third-party deletion require orchestrated jobs and verification |

## Security release gates

- Public v1 should be 18+ unless a guardian-consent and minor-safety program is
  deliberately implemented.
- Complete a privacy impact assessment for health data and cross-border OpenAI
  processing.
- Configure Content Security Policy, rate limiting, bot protection and auth email
  abuse controls.
- Keep all AI switches false until trusted country verification, current consent
  versions and monitoring are configured; test the global circuit breaker.
- Add malware scanning and retention deletion for body reports before accepting
  public uploads.
- Exercise service-key/OpenAI-key rotation and account compromise response.
- Verify backups and restoration in a separate project.
- Build account export and deletion that covers Auth, PostgreSQL, Storage and any
  provider-retained identifiers.

## Logging policy

Allowed: route, request ID, hashed user safety identifier, status, duration,
model/prompt version, token counts and coarse error code.

Forbidden: Authorization headers, email/name, raw IP, body reports, medical
context, prompts, model output, chat content, service keys and provider error
bodies that may echo input.
