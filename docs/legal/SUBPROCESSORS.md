# Momentum processor and subprocessor register — pre-launch draft

**Status:** candidate inventory, not an approved production register.
**Owner:** `[PRIVACY_OR_SECURITY_OWNER]`
**Contact for change notices:** `[PRIVACY_EMAIL]`
**Last evidence review:** 2026-08-01

No provider below is approved merely because it appears in this file or in an
environment example. Contracts, configured regions, security controls, retention,
international-transfer terms, and the vendor's current subprocessor list must be
reviewed for the actual legal entity and production account.

## Candidate direct processors

| Provider / service | Intended role | Data that may be processed | Current product state | Activation gate |
| --- | --- | --- | --- | --- |
| Supabase (PostgreSQL, Auth, Storage, Edge Functions) | primary account, application data and server-function infrastructure | account identifiers; sensitive wellness context; plans/check-ins; private body reports; operational metadata | Implemented for alpha; production project/region not approved in this document | DPA, region/transfer assessment, plan/backups, MFA/access review, RLS/Storage tests, deletion/restore drill |
| OpenAI API | the user's single combined monthly plan generation | minimized structured monthly wellness snapshot, confirmed body values, optional bounded cycle note, generated output, pseudonymous safety identifier and usage metadata | Server integration is feature-switched off by default | Contract, DPA/data controls, retention mode, safety evals, cost limit, current subprocessors |
| Cloudflare (static hosting/CDN candidate/current alpha host) | serve public web assets and route web traffic | IP/access logs, browser/network metadata and public asset requests; no health payload should be placed in CDN analytics or cache | Deployment may use Workers/Pages; production scope not approved | Contract/privacy/security review, exact products, log/cache retention, regional transfer and security headers |
| Transactional email provider — `[NOT_SELECTED]` | verification, recovery, service notices | email address, template variables, delivery/security metadata | Not approved | Vendor selection, DPA, domain authentication, retention, suppression/export/delete behavior |
| Payment provider / merchant of record — `[NOT_SELECTED]` | future subscription, tax, fraud and refund handling | billing identity, country evidence, transaction/tax references; card details should go directly to the provider | Payment not implemented | Per-market legal/payment approval, DPA, PCI scope, webhook security, refund/cancellation terms, retention |
| Error monitoring / observability — `[NOT_SELECTED]` | reliability, security and incident diagnostics | opaque IDs, traces, categorical errors and redacted technical metadata only | Not approved | Health/free-text denylist, sampling/redaction tests, access/retention limits, DPA and region |
| Customer support — `[NOT_SELECTED]` | respond to verified user requests | account contact and only the minimum case data the user deliberately provides | Not approved | Access model, identity verification, screenshot/redaction policy, DPA, retention and audit |
| Product analytics — `[NOT_SELECTED]` | aggregate product measurement | pseudonymous event name and coarse product state; never raw health values, reports, or generated plan content | Not approved | Consent/lawful-basis decision, event allowlist, DPA, retention, opt-out and deletion behavior |

Source control and development tooling are operational vendors, not intended
repositories for production user data. Production records, prompts, reports,
secrets, or screenshots must never be placed in GitHub, tickets, chat, or CI
artifacts.

## Downstream subprocessors

Momentum must not copy a vendor's full downstream list into this repository and
let it become stale. Before activation and at every notified change, retain a
dated approval record for:

- vendor and legal contracting entity;
- services/products actually enabled;
- purpose and categories of Momentum data;
- processing/storage locations;
- transfer mechanism and DPA/BAA status where applicable;
- downstream subprocessor list URL and evidence date;
- retention/deletion and incident-notification commitments;
- Security, Privacy/Legal, and Engineering decision.

Official candidate sources:

- [Supabase Data Processing Addendum](https://supabase.com/downloads/docs/Supabase%2BDPA%2B260601.pdf)
- [Supabase privacy policy](https://supabase.com/privacy)
- [OpenAI subprocessor list](https://openai.com/policies/sub-processor-list/)
- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)

## Change procedure

1. Product owner proposes a new provider or material scope change.
2. Engineering documents exact fields, endpoints, regions, cache/log behavior,
   and whether the provider can receive health or free-text data.
3. Security completes due diligence; Privacy/Legal approves contracts, lawful
   basis, notices, transfer and retention.
4. Data-minimization and deletion tests pass in staging.
5. The effective user notice and consent are updated before data starts flowing.
6. The decision record, contract date, configured region, owner, and next review
   date are added to the private compliance register.

Emergency provider replacement may stop processing immediately, but it cannot
silently begin sending sensitive data to an unreviewed vendor.
