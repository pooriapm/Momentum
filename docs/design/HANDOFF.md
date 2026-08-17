# Momentum design handoff contract

Version: 1.5  
Last reviewed: 2026-08-18  
Status: **Step 5 signed 2026-08-18 by Pooria.** Step 4 Storybook evidence remains closed with documented exceptions. Signature: [STEP-5-FREEZE.md](./STEP-5-FREEZE.md). Implementation: [AGENT-DEVELOPMENT-PLAN.md](../AGENT-DEVELOPMENT-PLAN.md).

This is the single design continuation file. Product intent lives in the
[Phase 0 contract](../product/PHASE-0-PRODUCT-CONTRACT.md) and [PRD](../product/PRD.md).
The rewrite playbook is the [Implementation Blueprint](../IMPLEMENTATION-BLUEPRINT.md).
Do not start rewriting the app from this document.

## 0. Where we are

Penpot file: `Momentum — Product Design System`  
File ID: `3be9e5e1-190f-8090-8008-7628f4bfdd92`  
Canonical tokens: [tokens.json](./tokens.json)  
Penpot revision at this review: **316**

| Step | Status |
| --- | --- |
| 1 Visual direction, Liquid Glass, Storybook 132/132 | Complete |
| 2 Visual acceptance of representative screens | Complete |
| 3 Eight prototype flows, inventory BFS 8/8 | Complete. Off-canvas portal copies exist so Penpot graphs can cross pages; they are not extra product states. |
| 4 Responsive, localization, accessibility evidence | **Storybook closed.** Penpot Compact-320/375 clip wrappers and Forced Colors remain documented exceptions. See [STEP-4-RESPONSIVE-A11Y.md](./STEP-4-RESPONSIVE-A11Y.md). |
| 5 Design freeze and production unlock | **Signed 2026-08-18** — [STEP-5-FREEZE.md](./STEP-5-FREEZE.md) |

### Remaining design work

1. Step 5 is signed. Treat production edits as implementation against this freeze, not as a pending-freeze alpha.
2. Implementation sequencing for coding agents is
   [AGENT-DEVELOPMENT-PLAN.md](../AGENT-DEVELOPMENT-PLAN.md). Phase 4 generation and live Stripe remain engineering gates, not a design reopen.
3. Do **not** rename, resize, or reflow the four Penpot Compact-320/375 clip wrappers on page `10 · Prototype + Handoff`; they are leftover clip artifacts, not reflow proof.
4. Do **not** mark Forced Colors Pass.

### Working-tree UI decisions (2026-08-17)

These are founder-directed decisions. They override older chrome and Me-hub copy
in the live tree. They are part of the Step 5 freeze.

| Topic | Decision |
| --- | --- |
| Single-line fields | Height locked to `size.field.height` / `--size-field` (48px) |
| Glass menus | Outer surface owns glass; inner scroller only |
| Compact chrome | Top bar and dock overlay one scroll root; Apple minimize on scroll-down, restore on scroll-up |
| Nested scrollbars | Forbidden; `overflow-x: hidden` on inner pages must not create a second Y scroller |
| Storybook compact | `Screens/App` phone stories are CSS 390×844 frames (no viewport addon). `TodayMobile`, `MeAndPreferences` |
| Me hub (ME-01) | Minimal list. No “Private” badge. Install row only when the PWA is not installed |
| Fonts | Workout detail and shopping list use `--font-app` (Vazirmatn), not Latin-only stacks |
| Check-in red flags | Same field stack/font as other form controls |

Storybook is the executable D7–D13 source: onboarding order Basics → Health → Consent → Goal → Food → Training → Body → Review; catalog allergen chips; payment method before generation; one membership; sticky `product_region` (FA+IRR vs EN+USD) with no geo-block; one monthly wait screen with queue, 3-minute timeout and retry, then daily plan; quiet optional daily check-in; bold optional weekly report; gift users start checkout after the last weekly report. IDs stay 132. D12 Storybook and Penpot copy were aligned 2026-08-16 (PUB-04/05/10, LIFE-06, ME-03). D13 wait/timeout/retry and weekly/gift checkout are in Storybook. Backend drift (`region_blocked`, weekly `generate-plan`, coach, body-extraction AI) was removed in slice 1B (`c563877`).

### Authorization boundary

Step 5 is **signed 2026-08-18** ([STEP-5-FREEZE.md](./STEP-5-FREEZE.md)). Production
code may change in sequenced slices from [AGENT-DEVELOPMENT-PLAN.md](../AGENT-DEVELOPMENT-PLAN.md).

Do **not** reset or broadly reformat the 2026-08-17 chrome, Me hub, field-height,
or glass-menu work. Do **not** copy alpha drift that contradicts D1–D13
(7-day trial, Core/Pro, weekly `generate-plan`, `analyze-body-composition`,
coach, `region_blocked` UI).

Until a slice is assigned from that plan, prefer Penpot, Storybook, tokens, and
docs for design-only questions. Phase 4 and live Stripe stay unassigned.

### Product rules that design and rewrite must share

- One paid subscription; no Free/Core/Pro/Premium ladder.
- Public self-serve: gifted first monthly plan while D1 budget remains, then the one subscription at cycle 2.
- Payment method (`SetupIntent` / $0) before the first provider call; card not charged until cycle 2.
- One combined monthly generation; `ready_at` starts the cycle.
- No coach/chat; no separate body-report AI.
- Catalog `momentum-core@v2` is a generation gate.
- Two product versions from sticky `product_region`: `ir` = FA+IRR, `intl` = EN+USD. IP writes once at signup. No geo-block.
- One monthly plan from one backend prompt; wait screen until ready with queue, 3-minute timeout and retry; daily slice like the live Today/Plan; optional quiet daily check-in; optional bold weekly report; gift→checkout from last weekly report.
- 132 semantic IDs. Do not add a second namespace.

This document tells a designer or implementation agent how to read the visual
artifacts as one complete product. It complements the
[132-state Inventory](../product/SCREEN-STATE-INVENTORY.md),
[Product Flows](./product-flows.md) and [Component Specifications](./components.md).

## 1. Source roles

| Artifact | Authority |
| --- | --- |
| PRD / Phase 0 | Product, business and safety intent |
| Screen and State Inventory | Exact state count, IDs, route parent and required outcome |
| Product Flows | Navigation, transitions and prototype acceptance |
| Penpot | Spatial composition, responsive layouts, component instances and prototype graph |
| Storybook | Executable anatomy, variants, semantic states, locale/theme/width fixtures |
| `tokens.json` | Semantic visual values and Light/Dark modes |
| Architecture docs | Data authority, state machines, failure and side-effect boundary |

No single screenshot is authoritative for behavior. No Storybook specimen is a
complete product flow. No Penpot frame title creates a route or API.

## 2. Clean Penpot structure

The clean file contains only the current Human Strength system and the following
logical sections. Legacy boards, superseded palettes, high-contrast collections,
AI coach/chat screens, Core/Pro tiers and body-AI extraction are absent.

| Section | Required contents |
| --- | --- |
| Cover and index | version, owner, last review, artifact links, state-count/flow summary |
| Foundations | Human Strength Light/Dark, typography, spacing, grid, icon, motion, Regular/Prominent/Clear/Fallback glass, localization/accessibility specimens |
| Component library | all catalog families, real variants, token bindings, auto layout and component-state matrices |
| Public and Auth | `PUB-*` and `AUTH-*` composed route screens and branches |
| Onboarding | `ONB-*` complete resumable journey and conditional form states |
| Product app | Today, Plan, execution, Progress, Me, Settings and Account states |
| Lifecycle | all `LIFE-*` gift/subscription/generation/import/failure states |
| Prototypes and handoff | eight start points, branch map, state index, responsive/locale/theme/accessibility evidence and defect status |

Frames use:

```text
[STATE-ID] · Surface · State · Locale · Appearance · Viewport
```

Examples:

```text
TODAY-01 · Today · Active day · FA · Light · Compact
LIFE-19 · Renewal · Validation failed · EN · Dark · Expanded
```

Coverage panels may reference multiple IDs only when they visibly contain the
complete context/action/recovery for each. A label-only card does not count.

## 3. Penpot construction rules

- All screens use frames/boards at 390, 768 or 1440 reference width and state
  their viewport class. Validate Compact to 320.
- Reusable UI is inserted as a component instance. One-off button/field/nav/card
  drawings fail handoff.
- Layout uses flex/auto layout, semantic gaps and logical padding. Text and icon
  centering is verified at the component root, not corrected per screen.
- Light and Dark use only the Human Strength theme collections. Increased
  contrast is behavior within them, not a third collection.
- Functional navigation/temporary overlays may use Momentum Liquid Glass.
  Forms, content cards, plan rows, alerts and health information are opaque.
- Every glass component is an instance of Regular, Prominent, Clear, or Fallback.
  Clear is allowed only over a controlled backdrop with explicit legibility treatment.
- Every glass frame includes or links to its opaque reduced-transparency fallback
  and reduced-motion stable state.
- Glass is not accepted as a static blur rectangle. Masters include named backdrop,
  tint, optical-edge, depth, foreground, and interaction-response layers.
- Penpot supplies Rest, Pressed, Drag/Selected, Released, and source-linked Morph
  sequence frames. Interaction-only refraction stays local to the active control;
  idle shimmer and page-wide pointer tracking are prohibited.
- Persian and English share component structure. Physical start/end placement,
  weekday/date/unit formats and mixed-text isolation are verified with real copy.
- Directional icons mirror only when meaning is directional. Brand, status,
  media and universal symbols do not mirror automatically.
- Touch/click target is at least 44×44 even when visible icon is 20–24px.
- Prototype connectors target composed state frames; they must not target a
  component-library master or explanatory note as a terminal product screen.

## 4. Storybook information architecture

The exhaustive executable catalog follows this hierarchy:

```text
Foundations/
  Human Strength
  Typography
  Spacing and layout
  Motion and preferences
  Liquid Glass interaction lab
Components/
  Actions
  Forms
  Navigation
  Data display
  Feedback and overlays
  Domain
Patterns/
  Public and auth
  Onboarding
  Daily execution
  Monthly lifecycle
  Account and privacy
Screens/
  Public
  Auth
  Onboarding
  Today
  Plan
  Execution
  Progress
  Me and account
  Lifecycle
Flows/
  Acquisition
  First plan
  App navigation
  Daily use
  Workout
  Weekly progress
  Account control
  FLOW-08 · Renewal/recovery
```

Every semantic-state story records its IDs in searchable story documentation or
metadata. Recommended metadata shape:

```ts
parameters: {
  momentum: {
    stateIds: ['LIFE-19'],
    route: '/[locale]/app/today',
    parent: 'in-page',
    network: 'terminal',
  },
}
```

This metadata is a coverage aid, not a product API. Stories use deterministic
local fixtures and never call Supabase, payment or an AI provider.

## 5. Storybook coverage

For every reusable component:

- anatomy/default;
- valid interaction and domain state matrix;
- Persian/English and Light/Dark globals;
- Compact/Medium/Expanded when composition changes;
- long text, Persian digits, dates, times, units and mixed-script fixtures;
- focus-visible/keyboard and accessible name/state output;
- maximum supported text scale and 200% zoom/reflow;
- reduced motion/transparency and increased-contrast/forced-color behavior;
- live glass press/release, drag, and source-linked morph plus their reduced paths;
- loading/offline/stale/error/success/destructive variants where relevant.

For every one of the 132 screen IDs:

- a deterministic composed screen or state fixture;
- same route parent and next action as Penpot;
- no network dependency;
- associated API/error code or explicit local-only behavior;
- at least Persian/English and Light/Dark coverage;
- relevant width and preference fixtures.

## 6. Product rules visible in design

Every artifact must communicate the same rules:

- one paid subscription, no tier ladder;
- public self-serve gift of the first monthly plan, then the one subscription;
- payment method before the first provider call; card not charged until cycle 2;
- conditional first-plan gift controlled by a server-owned budget reservation;
- one combined workout-and-nutrition provider execution per entitled monthly cycle;
- `ready_at` is the start of the period;
- cycle two+ requires verified active subscription at the boundary;
- generation is not early; leave-and-return is allowed; after 3 minutes the user
  can retry the same queued job; after import there is no extra provider call;
- previous valid plan survives cancellation and all renewal failures;
- one bounded next-cycle note is optional; no action carries prior context forward;
- no coach/chat/persona/message composer/turn quota;
- no separate body-composition AI call;
- onboarding order is Basics → Health → Consent → Goal → Food → Training → Body → Review;
- allergies are a governed picker;
- Iran is a served product version (`ir` = FA+IRR). There is no geo-block UI. Provider allowlists are operations, not a user wall.

## 7. Review passes

### Product pass

Verify state meaning, action, copy, business rule, safety route and destructive
consequence against PRD/Inventory.

### System pass

Verify instance use, variants, tokens, spacing, padding, centering, icon box,
material anatomy/policy, localized optical response, connected morph origin,
naming and no obsolete collection.

### Responsive/localization pass

Verify 320/390/768/1440, both languages, both appearances, long copy, weekdays,
digits, dates, units, mixed text, safe areas and direction-aware navigation.

### Accessibility pass

Verify target size, focus/reading order, names/states, error association,
announcements, chart alternatives, text scaling, reduced motion/transparency and
no color-only meaning.

### Prototype pass

Walk all eight flows, every branch and every Back/Cancel/Close/Escape path. Audit
the graph for orphan frames, dead ends and links to component masters.

### Cross-artifact pass

Generate the 132-ID coverage report and compare Penpot, Storybook, PRD,
Traceability and route manifest. Resolve duplicate/missing IDs and contradictions.

## 8. Handoff record template

Do not mark a row `Pass` without evidence.

| Gate | Required evidence | Result |
| --- | --- | --- |
| 132 semantic states | ID coverage report, no duplicates/missing | **Pass** — inventory 132, Storybook 132, Penpot compact-390 132 unique IDs (Step 3 checksum; IDs unchanged) |
| Eight clickable flows | graph audit and owner walkthrough | **Pass** — Step 3 BFS 8/8 |
| Component system | instance/variant/token-binding audit | **Pass** — Steps 1–2 Human Strength tokens and component boards; no new component system this pass |
| Responsive | shell/task frames + Storybook viewport matrix | **Storybook Pass** — 320 wrap, 375×667 fold specimen, 768, 1440, 200% zoom. Penpot Compact-320/375 wrappers remain clip artifacts |
| Localization | FA/EN copy/format/bidi stress | **Storybook Pass** — toolbar FA/EN, long Persian, English +35%, calendar/digits/units. No user-facing LTR/RTL jargon |
| Appearance/material | Light/Dark Regular/Prominent/Clear/Fallback masters; named anatomy; press/drag/morph recording; opaque and reduced-motion paths | **Pass** — prior Liquid Glass boards plus Storybook reduced transparency/motion pairing |
| Accessibility | automated and manual evidence matrix | **Partial** — 44px targets, keyboard `:focus-visible`, Dynamic Type 2.0, chart alternative. Forced Colors: owner exception, **not Pass** |
| Product invariants | PRD/Inventory/architecture cross-check | **Storybook Pass** for D7–D13 (order, allergen picker, payment method, one SKU, sticky region, monthly wait/timeout/retry, quiet daily, bold weekly, gift checkout). Penpot compact boards remain schematic |
| Owner approval | dated defect closure and explicit production unlock | **Pass** — signed 2026-08-18 by Pooria. Exceptions: Penpot Compact-320/375 clips; Forced Colors not Pass. Unlock is rewrite, not public launch. See [STEP-5-FREEZE.md](./STEP-5-FREEZE.md) |

The record remains honest: completed design intent is not equivalent to verified
artifact coverage, implementation completion or permission to launch.

Storybook composed-state metadata (review evidence, not an API):

```ts
parameters: {
  momentum: {
    stateIds: ['TODAY-07'],
    route: '/[locale]/app/today',
    parent: 'screen',
  },
}
```

Step 3 checksum (2026-08-15): inventory 132, Storybook 132, Penpot compact-390 132 unique IDs, eight named flows pass BFS. Step 4 Storybook evidence closed 2026-08-16 (Penpot clip wrappers and Forced Colors remain exceptions). Step 5 signed 2026-08-18 by Pooria.
