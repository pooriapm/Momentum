# Step 4 — responsive, localization and accessibility evidence

Date: 2026-08-16  
Last live Penpot audit: 2026-08-16, rev **316**  
Status: **Storybook evidence closed** with documented exceptions (Penpot clip wrappers; Forced Colors). Step 5 is **signed 2026-08-18**.  
Follow-up 2026-08-17: production AppChrome/Me/form polish landed in alpha and `Screens/App` phone stories (`TodayMobile`, `MeAndPreferences`) use a CSS 390×844 frame with **one inner scroller**. That does not reopen Step 4. Step 5 signature: [STEP-5-FREEZE.md](./STEP-5-FREEZE.md).  
Penpot file: `Momentum — Product Design System` (`3be9e5e1-190f-8090-8008-7628f4bfdd92`)  
Page: `10 · Prototype + Handoff`  
Storybook: `Patterns/Responsive and accessibility evidence` plus existing locale/theme globals  
Authority: Inventory, `docs/design/HANDOFF.md`, `docs/design/accessibility.md`, `docs/design/localization.md`  
Production code was not treated as a source and was not edited.

Step 4 is representative, not a 132 × locale × theme × viewport matrix. Compact **390×844** already exists for all 132 IDs. Medium 768 and Expanded 1440 pairings remain. Penpot Compact-320/375 boards are leftover **clip wrappers** around 390 content; they are **not** accepted as 320 reflow or 375 above-fold evidence. Accepted 320/375 proof is Storybook.

## Checksums

| Check | Result |
| --- | --- |
| Compact 390 unique inventory IDs | **132 / 132** (unchanged from Steps 2–3) |
| Storybook `momentumEvidence` IDs | **132 / 132** |
| Toolbar locale × appearance | FA/EN × Light/Dark on every spec story |
| Compact 320 overflow | **Storybook closed:** `Compact320WeekdaysWrap` / `Compact320TodayOverflow` at viewport `compact320`; weekdays wrap to 2 columns at `max-width: 30rem`. Penpot wrappers remain leftover clips — **not Penpot evidence** |
| Compact 375 above-fold | **Storybook closed:** `Compact375TodayAboveFold` is a 375×667 overflow-hidden fold specimen; Start workout stays above the dock. Penpot wrapper remains a leftover clip — **not Penpot evidence** |
| Medium 768 | `PUB-02`, `ONB-18`, `PLAN-04`, `PROG-02` |
| Expanded 1440 | `TODAY-01` EN Dark, `PLAN-01` FA Light, `AUTH-07` EN Dark |
| 44px targets | Actions 342×50; tab hotspots 85–90×64; expanded nav 224×44; Storybook `min-height: 2.75rem` |
| 200% zoom | Storybook `.mo-spec-zoom-200` |
| Long copy | `LongPersianReflow` and `LongEnglishReflow` (+35%) at 320 |
| Dynamic Type | `DynamicTypeScale200` (font-size 200% at compact 320) |
| Chart alternative | `PROG-02` Medium + `ProgressTextAlternative` / `ProgressTableAlternative` |
| Reduced transparency / motion | Penpot a11y boards + `LiquidGlassMotion` fallbacks |
| Forced Colors | Owner exception — **not Pass** |

## Width matrix

| Width | Role | Penpot | Storybook |
| --- | --- | --- | --- |
| 320 | Compact overflow minimum | Leftover clip wrappers on page 10; **not Penpot evidence** | viewport `compact320`; weekdays wrap to 2 columns at `max-width: 30rem` — **closed** |
| 375×667 | Today above-fold | Leftover clip wrapper; dock clipping is **not** fold evidence | `.mo-spec-fold-375` specimen — **closed** |
| 390×844 | Compact reference | All 132 compact boards | viewport `compact390` |
| 768×1024 | Medium | Landing, weekdays, grocery, chart | viewport `medium768` |
| 1440×1024 | Expanded + sidebar | Today, Plan, Auth sign-up | viewport `expanded1440` + `.mo-spec--sidebar` |

FA/EN × Light/Dark are not duplicated on every width. Pairings used:

- Compact 390: mixed locales/appearances already on the 132 boards.
- Compact 320/375 Penpot pairings exist only as leftover clip wrappers (see evidence gap below).
- Medium: FA Light landing and weekdays, FA Dark grocery, EN Light chart.
- Expanded: EN Dark Today, FA Light Plan, EN Dark Auth.

## Penpot Compact-320/375 clip wrappers — open evidence gap

Live geometry on `10 · Prototype + Handoff` at rev **222**. Owner decision 2026-08-15: **do not rename, resize, squeeze, or reflow these wrappers**. They stay as leftover clip artifacts.

Canonical compact screens remain **390×844**. These four boards are not Compact-390 evidence boards.

| ID | Live name | Wrapper | Inner | Overflow | Clip |
| --- | --- | --- | --- | --- | --- |
| `e9f247a8-6850-8080-8008-7ca9a4989f97` | `TODAY-01 · Today · Active day · EN · Light · Compact-320` | 320×844 | 390×844 at local 0,0 | +70 X | yes |
| `e9f247a8-6850-8080-8008-7ca9a51a1b18` | `PUB-02 · Public · Compact landing · FA · Light · Compact-320` | 320×844 | 390×844 at local 0,0 | +70 X | yes |
| `e9f247a8-6850-8080-8008-7ca9a5316b4b` | `ONB-18 · Onboarding · Weekdays · FA · Dark · Compact-320` | 320×844 | 390×844 at local 0,0 | +70 X | yes |
| `e9f247a8-6850-8080-8008-7ca9a54450d4` | `TODAY-01 · Today · Active day · EN · Light · Compact-375` | 375×667 | 390×844 at local 0,0 | +15 X / +177 Y | yes |

Do not treat clipped inner 390 content as 320 reflow. Do not treat a clipped dock as 375 above-fold proof. Product still requires real 320 CSS px reflow and a 375×667 Today above-fold check from Storybook or implementation.

## 375×667 above-fold

`TODAY-01 · Today · Active day · EN · Light · Compact-375` still exists as a **375×667 clip frame** around a Compact 390 inner board. Measured clip geometry:

| Shape | Page Y | Local Y | Height | vs fold (667) |
| --- | --- | --- | --- | --- |
| Action / Continue | 5592 | **552** | 50 | bottom at **602** — inside the clip rectangle |
| Bottom navigation | 5806 | 766 | 64 | below the clip rectangle; dock is cut |

That measurement is a clip artifact, not a reflow result. It is **not accepted** as Today above-fold evidence. Accepted proof is Storybook `Compact375TodayAboveFold`: a 375×667 overflow-hidden stage with compact chrome, next-action card, and dock inside the fold.

## 44px targets and keyboard

| Control | Measured / specified | Pass? |
| --- | --- | --- |
| Compact primary Action | 342×50 | Yes |
| Compact tab hotspot | 85–90×64 | Yes |
| Compact tab **label** glyphs | ~15px text on Me docks | Labels are not the hit target; hotspots underneath pass |
| Expanded sidebar nav | 224×44 | Yes |
| Storybook buttons / segments / calendar cells | `min-height: 2.75rem` (44px) | Yes (segments were 2.55rem / ~41px before this step) |
| Keyboard focus | `.mo-spec :focus-visible` 3px brand outline | Storybook only |

Penpot has no keyboard or Escape trigger. Overlay dismiss remains outside-click (`closeWhenClickOutside`) from Step 3.

## 200% zoom, long Persian, calendars, charts

- Storybook `Zoom200TodayReflow` uses `zoom: 2` on a 50% wrapper so the layout must reflow instead of scrolling on two axes.
- `LongPersianReflow` at 320 uses unshortened Persian review copy (no LTR/RTL jargon).
- `LongEnglishReflow` at 320 uses English review copy about 35% longer than the default.
- `DynamicTypeScale200` scales rem-based chrome at `font-size: 200%` on compact 320.
- `CalendarDigitsAndUnits` (`ME-03`) shows Jalali + Persian digits vs Gregorian, and kg units. Live picker: `Components/Localized date picker`.
- `Medium768ChartAndTable` shows the same four adherence values as bars and as a table. Week 4 is **partial 18%**, not zero. Matching stories: `ProgressTextAlternative`, `ProgressTableAlternative`.

## Reduced transparency and reduced motion

Penpot (page 10):

- `A11y / Reduced transparency / Overlay fallback` — meal overlay clone, blur hidden, opaque fill.
- `A11y / Reduced motion / Instant rest-press` — rest and press chrome without scale.

Storybook:

- `Visual direction/Liquid Glass motion` → `ReducedTransparencyAndMotionFallbacks`
- `Patterns/Responsive and accessibility evidence` → `ReducedTransparencyAndMotionPairing`
- CSS: `prefers-reduced-transparency` / `prefers-reduced-motion` plus `.mo-spec--force-*` specimens. Sidebar rail is included in the reduced-transparency set.

## Penpot construction notes

Compact source boards are **absolute, not flex** (`flex: false`, `clipContent: true`). Resizing 390→320 therefore **clips**. The Compact-320/375 frames wrap a Compact 390 inner board. That construction explains why Penpot cannot currently prove 320 reflow; it does **not** count as overflow evidence. **Reflow truth is Storybook** (`@media (max-width: 30rem)` and the viewport toolbar) or later implementation.

Four leftover “Intrinsic content region” placeholders were **renamed, not deleted**:

- `Retired placeholder / Public Medium`
- `Retired placeholder / Onboarding Medium`
- `Retired placeholder / App Expanded`
- `Retired placeholder / Plan Expanded`

Do not treat those as product evidence.

Glass chrome on composed Medium/Expanded boards: Light `#FFFAFC` @ 76% + blur 22; Dark `#2D2229` @ 78%; stroke `border.glass`; canvas Light `#FAF7F4` / Dark `#161114`.

## Owner exceptions (not silently “fixed”)

1. **Penpot compact does not reflow.** The four Compact-320/375 wrappers remain clip artifacts by owner decision. They are leftover clips, not 320 reflow or 375 fold proof. Storybook CSS is the accepted 320/375 source until compact boards are rebuilt with auto-layout (out of this audit scope). Do not squeeze, clip, or rename them into fake Compact-390 evidence.
2. **No Penpot keyboard / Escape.** Storybook `:focus-visible` is the keyboard evidence. Escape stand-in remains outside-click.
3. **Forced-colors / Windows high contrast** is not implemented in spec CSS. Owner exception deferred; increased contrast stays a behavior inside Light/Dark, not a third theme. Do not mark this Pass.
4. **Tab label shapes** on Me docks are small text. Hit targets are the Hotspot rectangles.

## Storybook files in this step

- `.storybook/preview.tsx` — viewports `compact320`, `compact375`, `compact390`, `medium768`, `expanded1440`
- `src/stories/product/product-spec.css` — 44px segments/calendar cells, sidebar rail, 200% zoom, 375 fold specimen, Dynamic Type 2.0, allergen chips, target specimen
- `src/stories/product/ResponsiveA11y.stories.tsx` — width, fold specimen, grocery, zoom, Dynamic Type 2.0, targets, long Persian, long English, calendar/units, preference pairing

## What this step did not do

No production edits. No second Penpot file. No 132×locale×theme×viewport explosion. Forced-colors left open. Penpot Compact-320/375 wrappers were **not** renamed or resized.

## Remaining program

1. **Step 4 Storybook evidence is closed.** Penpot Compact-320/375 wrappers stay leftover clip artifacts by owner decision. Forced Colors remains an owner exception and is **not Pass**.
2. **Step 5 is signed 2026-08-18.** See [STEP-5-FREEZE.md](./STEP-5-FREEZE.md). Rewrite is authorized; Forced Colors and the Penpot clip wrappers stay exceptions.
