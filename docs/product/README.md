# Momentum product documentation

Last reviewed: 2026-08-17

Source of truth for product decisions. Design continuation is
[../design/HANDOFF.md](../design/HANDOFF.md). App rewrite is
[../IMPLEMENTATION-BLUEPRINT.md](../IMPLEMENTATION-BLUEPRINT.md).

## Canonical files

- [PRD](./PRD.md) — bilingual requirements
- [Phase 0 product contract](./PHASE-0-PRODUCT-CONTRACT.md) — D1–D13, funnel, catalog bar, live drift
- [Screen and state inventory](./SCREEN-STATE-INVENTORY.md) — 132 semantic states
- [Monetization](./MONETIZATION.md) — one SKU, first-month gift economics, thin payments
- [Metrics](./METRICS.md)
- [Safety and launch policy](./SAFETY_AND_LAUNCH_POLICY.md)
- [Official source register](./SOURCES.md)

Related: [Roadmap](../ROADMAP.md), [Operations](../OPERATIONS.md),
[Traceability](../TRACEABILITY.md), [Implementation blueprint](../IMPLEMENTATION-BLUEPRINT.md),
[Next-agent plan](../AGENT-DEVELOPMENT-PLAN.md).

## Decision status

| Decision | Status |
| --- | --- |
| Product name remains **Momentum** | Approved |
| Persian and English product experience | Approved |
| Account-based, server-stored product | Approved |
| PostgreSQL through Supabase for MVP | Approved |
| One paid subscription; no Core/Pro | Approved (D4) |
| First monthly plan gifted under a dollar budget | Approved (D1) |
| Public self-serve; not waitlist | Approved (D7) |
| Payment method before first AI call; charge at cycle 2 | Approved (D8) |
| Thin payments are a generation prerequisite | Approved (D9) |
| Catalog `momentum-core@v2` required for public generation | Approved (D10) |
| Early safety gates; governed allergen picker | Approved (D11) |
| Sticky product region: FA+IRR vs EN+USD | Approved (D12) |
| One monthly plan, queued wait with 3-minute timeout, quiet daily / bold weekly | Approved (D13) |
| At most one imported plan per monthly cycle; same-job retry until import | Approved |
| Cycle starts from `ready_at` | Approved |
| No coach/chat or separate body-report AI | Approved (D6) |

## Product region

Anonymous IP chooses the version: Iran → Persian + Rial; otherwise English + USD.
That value is stored on the account as `product_region` and does not change when
IP changes. Both versions include gift, checkout, and monthly generation. There
is no in-product geo-block.
