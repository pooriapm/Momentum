# ADR 0001: Supabase platform with portable API contracts

- Status: accepted for the public-platform migration
- Date: 2026-07-31

## Context

Momentum is currently a static React PWA whose complete business state is a
single local browser object. Public launch requires accounts, multi-device
consistency, protected health data, server-side AI, regional pricing and a path
to native iOS/Android clients.

## Decision

Use Supabase for PostgreSQL, Auth, private object Storage and Edge Functions.
Keep the current React/Vite application as the web presentation layer during
the migration. All privileged behavior is exposed through versionable HTTPS
functions rather than browser-only modules or framework-specific server
actions.

The boundary is:

```text
Web PWA / future native apps
  -> Supabase Auth access token
  -> RLS-protected reads and low-risk self-service writes
  -> Edge Functions for AI, entitlement, billing and authoritative mutations
  -> PostgreSQL + private Storage
  -> OpenAI Responses API (server only)
```

Business and health data are not persisted in web storage. Query caches must be
memory-only and cleared on logout. Static PWA assets may remain cacheable; API
responses must be network-only.

## Why

- PostgreSQL supplies transactions, constraints, range exclusion and mature
  backup/restore behavior.
- Supabase Auth and RLS keep the identity boundary close to the data.
- Edge Functions keep OpenAI and service-role credentials off clients.
- Standard HTTPS plus shared JSON contracts support web and future Expo/native
  clients without coupling them to React components.
- Immutable JSONB plan versions fit model-generated nested content while daily
  activity, entitlements and usage remain relational and queryable.

## Consequences

- Offline business-data editing is intentionally unavailable under the current
  privacy requirement.
- The service role is a high-value credential and must exist only in hosted
  function secrets.
- RLS tests and database migrations become release gates.
- AI calls require job/idempotency/usage reconciliation because the provider
  and PostgreSQL cannot share one transaction.
- AI is fail-closed behind master/feature switches, confirmed email, current
  versioned consents, entitlement, adult/safety checks and service-verified
  billing jurisdiction. IP and self-declared country remain hints only.
- A later native app should share domain/API schemas and design-token source,
  but not DOM, `File`, download or localStorage modules.

## Rejected alternatives

- Continue local-first storage: cannot provide reliable accounts or multi-device
  state and leaves health data recovery to the browser.
- Put OpenAI calls in the client: exposes keys, bypasses quotas and leaks prompt
  construction.
- Normalize every ingredient/recipe immediately: makes AI schema evolution and
  immutable history unnecessarily expensive. Canonical foods can be added as a
  separate curated catalog later.
- Store only one mutable plan JSON: destroys auditability and makes logs change
  meaning when a plan is regenerated.
