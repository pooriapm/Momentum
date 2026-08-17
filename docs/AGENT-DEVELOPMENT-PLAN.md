# Momentum — next-agent development plan

Date: 2026-08-17  
Owner: Pooria  
Audience: coding agents starting the production build  
Status: **kickoff authorized. Design Step 5 signed 2026-08-18** ([design/STEP-5-FREEZE.md](./design/STEP-5-FREEZE.md)). Work in the slices below. Do not treat this as a blank-slate rewrite of chrome/Me/forms already landed.

## فارسی — شروع کار

این فایل دستور کار ایجنت بعدی است. قرارداد محصول عوض نشده (D1–D13، چهار تب، بدون مربی). از **فاز 0** شروع کن، بعد **یک اسلایس از فاز 1**. چند ساب‌ایجنت را فقط وقتی موازی کن که فایل‌های overlapping ننویسند.

تصمیم‌های UI همین چت را حفظ کن: فیلد ۴۸px، منوی شیشه با اسکرول داخلی، کروم compact چسبیده با minimize اپلی، یک اسکرول‌بار، صفحهٔ منِ مینیمال بدون Private، نصب فقط اگر PWA نصب نشده.

## 0. Read this first

| Order | File | Why |
| --- | --- | --- |
| 1 | This file | Slices, sub-agents, stop rules |
| 2 | [design/HANDOFF.md](./design/HANDOFF.md) | Step 4 closed; 2026-08-17 UI table; no Core/Pro/coach |
| 3 | [IMPLEMENTATION-BLUEPRINT.md](./IMPLEMENTATION-BLUEPRINT.md) | Routes, cycle rules, Me hub |
| 4 | [product/PHASE-0-PRODUCT-CONTRACT.md](./product/PHASE-0-PRODUCT-CONTRACT.md) | D1–D13 |
| 5 | [product/SCREEN-STATE-INVENTORY.md](./product/SCREEN-STATE-INVENTORY.md) | 132 IDs |
| 6 | [TRACEABILITY.md](./TRACEABILITY.md) | Join key |

Precedence when artifacts disagree: Phase 0 → PRD/Blueprint → inventory + current Storybook → API/data/security → roadmap → alpha code. Alpha that contradicts D1–D13 is **drift to replace**, except the 2026-08-17 UI decisions in the HANDOFF table (keep those).

## 1. Locked in this chat (do not reopen)

| Area | Keep |
| --- | --- |
| Fields | `--size-field` / 48px single-line; textarea ≥ 2× |
| Glass menus | Outer `overflow: hidden`; inner `__scroller` only |
| Compact chrome | Overlay top bar + dock; Apple minimize on scroll-down; restore on scroll-up; listen to nearest scroll parent |
| Scroll | One Y scroller (`.app-workspace`). No `overflow-x: hidden` that creates a second bar |
| Storybook phone | CSS 390×844 (`.mo-app-story--phone`). No viewport addon. Stories: `TodayMobile`, `MeAndPreferences` |
| Me (ME-01) | Identity + short list. No Private badge / data-promise card. Install hidden if `display-mode: standalone` or iOS standalone |
| Type | Workout detail + shopping use `--font-app` |
| Check-in | Red-flag fieldset matches other fields (Vazirmatn, full-width stack) |
| Product | Iran is a served version (FA+IRR). No geo-block UI. No annual SKU. No coach |

## 2. How to split sub-agents

Use **one parent agent** as orchestrator. Launch children only for a named slice.

| Role | Cursor `subagent_type` | Owns | Must not touch |
| --- | --- | --- | --- |
| Orchestrator | parent | this plan, PRs, conflicts | random drive-by refactors |
| Explorer | `explore` | find files, map drift | production edits |
| Slice implementer | `generalPurpose` | one inventory family or one subsystem | another family’s routes |
| Shell/CI | `shell` | `npm test`, `npm run lint`, `npm run build`, git | product copy |
| Design research | `explore` + Penpot MCP | tokens, Storybook titles | backend |

**Parallelism rules**

- Max **three** implementers at once, and only if their file sets do not overlap.
- Never two agents on `src/styles/orbit.css`, `AppFrame.tsx`, `catalog.ts`, or `supabase/functions/_shared/` in the same turn.
- Children do not commit unless the user asked. Parent does not `git push` unless asked.
- Each child returns: files changed, IDs covered, tests run, leftover risks.

**Prompt a child with:** slice id, inventory IDs, allowed paths, forbidden paths, this chat’s locked UI table, and “read HANDOFF + Blueprint first”.

## 3. Phases

Do not skip to AI generation (Phase 4) before entitlement, RLS, and the deterministic loop exist.

### Phase 0 — Orient (orchestrator only)

**Goal:** map drift vs contract. No feature work.

- Inventory live routes vs Blueprint §3.
- List remaining Core/Pro, coach, `region_blocked`, weekly `generate-plan`, `analyze-body-composition` surfaces.
- Confirm Storybook `Screens/App` phone chrome still has one scroller.

**Exit:** a short drift list in the PR/description. Then start Phase 1.

### Phase 1 — Foundation (parallel OK)

| Slice | Agent | Paths (typical) | Done when |
| --- | --- | --- | --- |
| 1A Auth/session | implementer | `src/platform/auth`, auth pages, session tests | Sign-up/in/verify/recover/sign-out match AUTH IDs; no secrets in client |
| 1B Data/RLS | implementer | `supabase/migrations`, `docs/security/rls.md` | Owner-bound tables; user-A/user-B tests |
| 1C i18n + chrome | implementer | `src/platform/i18n`, `AppFrame`, `orbit.css` chrome only | FA/EN shells; compact chrome contract unchanged |
| 1D Config/geo | implementer | `geo-context`, signup `product_region` | Sticky `ir`/`intl`; no geo-block wall |

**Exit:** authenticated bilingual shell, RLS green, region sticky, chrome still one scroller.

### Phase 2 — Deterministic product (parallel by destination)

No provider calls. Catalog and logs only.

| Slice | IDs | Agent focus |
| --- | --- | --- |
| 2A Today + daily execution | TODAY-*, EXEC-* | Next action, meal/workout, quiet daily check-in |
| 2B Plan | PLAN-* | Day/week/nutrition/training/shopping; substitution from catalog |
| 2C Progress | PROG-01–06 | Chart + text + table; bold weekly report; no AI |
| 2D Me | ME-01–09 | Keep minimal hub; settings + account export/delete; install-if-needed |

**Exit:** FLOW-03 and FLOW-04 work online with a fixture plan. Offline/stale states exist where inventory requires them.

### Phase 3 — Onboarding and lifecycle (mostly serial)

| Slice | IDs | Notes |
| --- | --- | --- |
| 3A Onboarding | ONB-* | Order Basics → Health → Consent → Goal → Food → Training → Body → Review |
| 3B Entitlement | LIFE-* except generation UX polish | Gift reserve, one membership, payment method before first provider call |
| 3C Wait/ready | LIFE wait/timeout/retry | One monthly wait screen; 3-minute timeout; retry reads job, never second call |

**Exit:** FLOW-02 happy path to Today with a **stub** import (no live model required).

### Phase 4 — One monthly generation (gated)

Only after 3B/3C. **One** combined workout+nutrition job per cycle. Catalog `momentum-core@v2` is a gate. Failures preserve the last valid plan. Iran remains a served version; provider allowlists are ops, not a user wall.

Do not add coach, chat, or body-report AI.

### Phase 5 — Thin payments then hardening

5a with generation: SetupIntent / $0, cycle-2 charge, cancel.  
5b later: tax, dunning.  
Then public-beta ops from [OPERATIONS.md](./OPERATIONS.md).

## 4. Suggested first sprint (this week)

Orchestrator runs Phase 0, then **one** of:

1. **1B Data/RLS** if migrations/tests are the gap, or
2. **2D Me remainder** (settings ME-02–04, account ME-06/07, sign-out ME-09) while keeping the new hub, or
3. **2A Today** if the owner wants daily use next.

Do not start Phase 4 in the first sprint.

## 5. Verification

Before handing a slice back:

```bash
npm run lint
npm test
npm run build
```

Storybook checks for compact chrome: `Screens/App/TodayMobile` and `Screens/App/MeAndPreferences` — one scrollbar, dock/top bar stay put, minimize on inner scroll.

## 6. Stop and ask the owner

- New route or a 133rd semantic ID
- Second AI call, coach, or chat
- Geo-block UI or hiding the Iranian version
- Annual SKU or Core/Pro ladder
- Changing field height, glass-menu scroll, or compact minimize behavior
- Force-push, `--no-verify`, or committing secrets
