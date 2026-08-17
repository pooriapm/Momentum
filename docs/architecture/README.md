# Momentum architecture handoff map

Status: target architecture for the signed Step 5 freeze  
Last reviewed: 2026-08-18

This directory explains how the product contracts become server-authoritative
systems. It is the rewrite target, not evidence that the current alpha already
implements them. Start from [../IMPLEMENTATION-BLUEPRINT.md](../IMPLEMENTATION-BLUEPRINT.md).
Design Step 5 is signed: [../design/STEP-5-FREEZE.md](../design/STEP-5-FREEZE.md).

## Reading order

1. [Implementation Blueprint](../IMPLEMENTATION-BLUEPRINT.md) — product/system
   boundaries, build order and definitions of done.
2. [Screen and State Inventory](../product/SCREEN-STATE-INVENTORY.md) — canonical
   UI routes and the 132 semantic states that consume these contracts.
3. [Platform decision](./0001-supabase-platform.md) — accepted MVP platform and
   tradeoffs.
4. [Data model](./data-model.md) — ownership, immutable plans, cycles,
   entitlements, usage and retention.
5. [API contracts](./api-contracts.md) — authoritative reads/mutations,
   idempotency and safe error envelopes.
6. [AI architecture](./ai-architecture.md) — the single monthly provider boundary,
   validation, import and reconciliation.
7. [Migration order](./migration-order.md) — dependency-safe implementation order.
8. [RLS](../security/rls.md), [Threat model](../security/threat-model.md) and
   [Operations](../OPERATIONS.md) — enforcement and release controls.

## System boundary

```text
Penpot/Storybook state ID
  -> canonical UI route or parent overlay
  -> authenticated projection/mutation
  -> owner-bound database/RPC
  -> optional monthly generation boundary
  -> deterministic validation + atomic import
  -> immutable plan version projected to Today/Plan/Progress/Me
```

Penpot and Storybook do not define new API or UI routes. Screen IDs describe
semantic situations; only the route manifest in the Inventory/Blueprint defines
browser paths. Detail views, check-ins, workout execution and lifecycle panels
remain inside their documented parent route.

## Non-negotiable invariants

1. One paid subscription; no Core/Pro tier model. First month is a D1 gift; cycle 2 requires the subscription after a payment method collected before generation (D8).
2. Conditional first-plan gift uses server-owned configuration and an atomic
   conservative budget reservation.
3. A user/period has at most one in-flight generation job and at most one
   successfully imported plan. The response contains the combined monthly workout
   and nutrition plan.
4. `ready_at` is written only after successful validation/import/activation;
   `starts_at = ready_at` and the cycle ends one user-timezone calendar month later.
5. Cycle two+ starts only after active subscription verification at the boundary.
6. Until import succeeds, the same job may retry after a delay; the wait times
   out at 3 minutes with a user retry. After import, replays never invoke a model
   again.
7. Previous valid plans and history survive cancellation and every renewal failure.
8. No coach/chat/messages/on-demand recalibration or separate body-report AI
   endpoint, table, quota or product destination exists.
9. Only confirmed manual/non-generative body values enter the monthly snapshot.
10. Private records are owner-bound and RLS protected; service secrets and
    provider payload details remain server-side.

## UI state to architecture mapping

| Inventory family | Primary architectural contracts |
| --- | --- |
| `PUB-*` | public route manifest, geo version hint, pricing display |
| `AUTH-*` | Auth session, verification/recovery, non-enumerating errors |
| `ONB-*` | owner-bound draft, consent versions, deterministic safety/eligibility, private evidence |
| `LIFE-*` | entitlement, gift reservation, period/job state, validation/import, prior-plan preservation |
| `TODAY-*` | dashboard projection, local-day authority, cached/stale behavior |
| `PLAN-*` | immutable plan/version, catalog IDs, effective interval and history |
| `EXEC-*` | owner-bound meal/workout RPCs, idempotent logs and pain-safe stop |
| `PROG-*` | deterministic aggregates, check-ins, snapshot and next-cycle note |
| `ME-*` | settings, subscription status, export/deletion orchestration and session revocation |

## Stable authority rules

- Client IP sets sticky `product_region` once at signup. Authenticated requests
  use the locked account region. IP is not an AI eligibility gate.
- Client date is at most a same-day assertion. Stored IANA timezone decides local
  day, period boundaries and dashboard mutations.
- The client never computes gift budget, entitlement, remaining provider use,
  active plan overlap, allergen safety or model validation.
- Stable error codes map to localized `InlineAlert`, gate or recovery states. Raw
  provider messages, prompts, health detail and stack traces never reach UI or
  general analytics.

## Implementation-agent rules

- Do not derive schemas from screen copy. Use data/API contracts and versioned
  migrations, then bind the specified UI state.
- Do not add an endpoint because a Storybook story needs a fixture; fixtures are
  local deterministic states.
- Do not add a browser route because a Penpot frame has a unique title.
- Do not call the provider to parse body reports, write observations, handle
  substitutions, complete check-ins or recover a failed cycle.
- If the product contract and current alpha disagree, the product contract wins;
  record the migration instead of preserving deprecated behavior.
- If a real contradiction remains among normative documents, stop that slice and
  request a product decision rather than inventing behavior.

## Architecture handoff completion

Architecture is sufficiently specified for development when:

- every Inventory family maps to an authoritative read/mutation or an explicitly
  local UI state;
- API errors cover all user-recoverable and terminal lifecycle branches;
- data constraints prove ownership, one active plan, one call per period,
  immutable history and atomic gift reservation;
- failure/reconciliation behavior covers provider, validation, import, payment,
  export/deletion, offline/stale and conflict cases;
- migration, RLS, secret, observability, retention, backup/restore and kill-switch
  gates have owners and verification plans;
- Traceability links product, design, architecture and test evidence without an
  imagined route or unsupported capability.

