# Momentum — Design Step 5 freeze

Signed: **2026-08-18**  
Signer: **Pooria** (product owner)  
Status: **Signed.** Design is frozen. Production implementation against this freeze is authorized.

This is the owner signature for [HANDOFF.md](./HANDOFF.md) Step 5. It does not certify a public launch, native apps, Forced Colors, or live generation/payments.

## Frozen

- Product contract **D1–D13** in [PHASE-0-PRODUCT-CONTRACT.md](../product/PHASE-0-PRODUCT-CONTRACT.md).
- **132** semantic IDs. Do not add a 133rd without a new owner decision.
- Onboarding order: Basics → Health → Consent → Goal → Food → Training → Body → Review.
- One membership SKU. Gift is the first monthly plan while D1 budget remains, not a 7-day trial. No Core/Pro. No annual SKU. No coach/chat/body-report AI.
- Sticky `product_region` (`ir` = FA+IRR, `intl` = EN+USD). Iran is served. No geo-block UI.
- One combined monthly generation per cycle. Wait: leave allowed, 3-minute timeout, retry reads the same job.
- 2026-08-17 UI table in [HANDOFF.md](./HANDOFF.md): 48px fields, inner glass scroll, compact overlay chrome, one Y scroller, minimal ME-01, Vazirmatn on workout/shopping, check-in field stack.
- Storybook is the executable visual evidence for D7–D13. Penpot file `Momentum — Product Design System` (rev **316** at Step 4 close) is the spatial source.

## Explicit exceptions (not Pass)

These stay open. They do not reopen Steps 1–4 and they do not unsigned this freeze.

| Exception | Rule |
| --- | --- |
| Penpot Compact-320/375 clip wrappers on `10 · Prototype + Handoff` | Do not rename, resize, or treat as 320 reflow proof. Storybook is the 320/375 evidence. |
| Forced Colors | Owner exception. **Not Pass.** Do not mark Pass. Increased contrast stays inside Light/Dark. |
| Native iOS/Android | Specification only. Not in this freeze’s production unlock. |
| Conformance / launch certification | [CONFORMANCE.md](./CONFORMANCE.md) remains not production-certified. Step 5 unlocks rewrite, not store/public launch. |

## Engineering still gated (not a design reopen)

- **Phase 4:** do not implement `generate-monthly-plan` / live OpenAI until that slice is assigned.
- **5a payments:** no live Stripe SetupIntent, cycle-2 charge, or webhooks until that slice is assigned.
- Catalog `momentum-core@v2` remains the generation gate when Phase 4 starts.

## What this unlocks

Coding agents may change production code in sequenced slices from [AGENT-DEVELOPMENT-PLAN.md](../AGENT-DEVELOPMENT-PLAN.md). Do not treat further product work as “alpha drift pending freeze.”

Do not reset the 2026-08-17 chrome, Me hub, field height, or glass-menu work. Do not copy D1–D13 drift (7-day trial, Core/Pro, weekly `generate-plan`, `analyze-body-composition`, coach, `region_blocked` UI).

First-sprint slices 1A–3C already landed under the 2026-08-17 kickoff; this signature matches that authorization after the fact and is the freeze going forward.
