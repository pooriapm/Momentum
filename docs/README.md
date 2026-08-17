# Momentum documentation

Last reviewed: 2026-08-18

Current application code is **alpha**. Founder-approved behavior lives here.
Do not copy D1–D13 drift (7-day trial, Core/Pro, weekly `generate-plan`,
`analyze-body-composition`, coach, geo-block UI). Keep the 2026-08-17 chrome,
Me hub, and form decisions in [design/HANDOFF.md](./design/HANDOFF.md).

## Two next steps

### 1. Design freeze (Step 5)

**Signed 2026-08-18** by Pooria. Penpot clip wrappers and Forced Colors remain exceptions; they are not Pass. Signature: [design/STEP-5-FREEZE.md](./design/STEP-5-FREEZE.md) · [design/HANDOFF.md](./design/HANDOFF.md) · [design/STEP-4-RESPONSIVE-A11Y.md](./design/STEP-4-RESPONSIVE-A11Y.md)

### 2. Sequenced implementation

Owner opened this on 2026-08-17; Step 5 now matches that unlock. Coding agents follow
[AGENT-DEVELOPMENT-PLAN.md](./AGENT-DEVELOPMENT-PLAN.md). Phase 4 generation and live Stripe stay gated.

Product: [product/PHASE-0-PRODUCT-CONTRACT.md](./product/PHASE-0-PRODUCT-CONTRACT.md) (D1–D13), [product/PRD.md](./product/PRD.md)  
Playbook: [IMPLEMENTATION-BLUEPRINT.md](./IMPLEMENTATION-BLUEPRINT.md)  
Architecture: [architecture/README.md](./architecture/README.md)  
Traceability: [TRACEABILITY.md](./TRACEABILITY.md)  
Sequence: [ROADMAP.md](./ROADMAP.md)

Existing alpha is evidence of what to replace when it contradicts the contract.
Do not reset the 2026-08-17 UI table.

## Canonical set

| Need | Read |
| --- | --- |
| Product decisions D1–D11 | [Phase 0 contract](./product/PHASE-0-PRODUCT-CONTRACT.md) |
| Public requirements | [PRD](./product/PRD.md) |
| 132 screens and routes | [Screen inventory](./product/SCREEN-STATE-INVENTORY.md) |
| Pricing and gift budget | [Monetization](./product/MONETIZATION.md) |
| Safety and product region | [Safety and launch](./product/SAFETY_AND_LAUNCH_POLICY.md), [Country register](./legal/COUNTRY_GO_NO_GO.md) |
| Design continuation | [Design handoff](./design/HANDOFF.md) |
| Rewrite order | [Implementation blueprint](./IMPLEMENTATION-BLUEPRINT.md) |
| Next-agent phases | [Development plan](./AGENT-DEVELOPMENT-PLAN.md) |
| Data and APIs | [Architecture](./architecture/README.md) |
| Ops after rewrite | [Operations](./OPERATIONS.md) |

## Precedence

When artifacts disagree:

1. Phase 0 contract (D1–D11)
2. PRD and Implementation Blueprint
3. Inventory IDs, tokens, current Penpot/Storybook
4. API / data / security contracts
5. Roadmap and operations
6. Existing alpha code (last)

Screen IDs (`PUB-*`, `AUTH-*`, `ONB-*`, `LIFE-*`, `TODAY-*`, `PLAN-*`,
`EXEC-*`, `PROG-*`, `ME-*`) are the join key. A Penpot frame title is not a route.

## Other directories

- [product/](./product/README.md) — PRD, inventory, monetization, metrics, safety, sources
- [design/](./design/README.md) — Orbit system, tokens, components, localization, a11y
- [architecture/](./architecture/README.md) — platform, data, API, AI, migrations
- [security/](./security/threat-model.md) — threat model and RLS
- [legal/](./legal/PRIVACY.md) — privacy, terms, retention, subprocessors, country Go/No-Go
