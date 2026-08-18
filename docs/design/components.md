# Component Specifications

Every component supports Light/Dark and Persian/English, exposes an accessible
name where required, and uses semantic state rather than visual-only state.

Penpot component names, Storybook titles and implementation exports use the same
semantic name. Screen coverage is tracked by the IDs in
[Screen and State Inventory](../product/SCREEN-STATE-INVENTORY.md); a component
specimen alone never satisfies a screen-state ID.

## Canonical component catalog

Every catalog row needs real Penpot variants/instances, deterministic Storybook
stories, token bindings, responsive rules and interaction/accessibility states.

| Family | Required components |
| --- | --- |
| Brand and public | `BrandMark`, `PublicHeader`, `PublicFooter`, `LocaleMenu`, `FaqDisclosure` |
| Chrome/navigation | `AppChrome`, `PageHeader`, `BottomNav`, `NavigationRail`, `SidebarNav`, `Breadcrumb`, `Tabs`, `SegmentedControl`, `StepProgress` |
| Actions | `Button`, `IconButton`, `ActionChip`, `LinkAction`, `MenuItem` |
| Form controls | `Field`, `TextField`, `TextArea`, `Select`, `Combobox`, `DatePicker`, `RadioGroup`, `Checkbox`, `Switch`, `ScaleField`, `WeekdayPicker`, `DurationField`, `EquipmentField`, `UploadField`, `CompositionReview` |
| Content/data | `ContentCard`, `Section`, `ListRow`, `StatusPill`, `Badge`, `MetricTile`, `DataTable`, `ProgressChart`, `EmptyState` |
| Daily product | `DailyBrief`, `TimelineItem`, `MealCard`, `MealDetail`, `WorkoutCard`, `WorkoutSession`, `ExerciseSet`, `CheckInSheet` |
| Plan/lifecycle | `PlanVersionHeader`, `MonthlyPlanStatus`, `MonthlyPlanSummary`, `FirstPlanGiftGate`, `SubscriptionPlanGate`, `GenerationStatus`, `NextCycleNotice`, `PlanDiff` |
| Feedback/overlay | `InlineAlert`, `Toast`, `Skeleton`, `ProgressStatus`, `Tooltip`, `Popover`, `Menu`, `Dialog`, `Sheet`, `DestructiveConfirmation` |
| Account/privacy | `SettingsGroup`, `SubscriptionStatus`, `ExportStatus`, `DeletionStatus`, `LegalLinkList` |

Required interaction states are `default`, `hover` where available, `pressed`,
`focus-visible`, `disabled`, `loading`, `error` and `success` where semantically
valid. Domain components also expose the explicit states below. Locale, theme and
width are story globals/fixtures, not separate component forks.

## Global chrome

### AppChrome

AppChrome composes the platform navigation container, account state, and global
actions. It uses `material.chrome` and elevation 2.

- Compact: floating four-item bottom navigation plus a restrained top bar,
  both overlayed on one inner scroller.
- Medium: navigation rail at inline-start.
- Expanded: sidebar at inline-start and optional page toolbar.
- The current destination uses icon, label, tint, and `aria-current`/native
  selected semantics.
- At rest, navigation labels remain visible. Icon-only primary navigation is
  prohibited as the default compact state. Apple tab-bar **minimize on
  scroll-down** may hide labels, inset the pill, and shorten the bar; opposite
  scroll restores the resting chrome (`glassMorph` / `glassRelease`).
- Safe-area padding is additive to the 12px internal padding.
- Compact chrome listens to the nearest scroll parent (workspace, device frame,
  or window), not only `window.scrollY`.
- A scroll-edge state may strengthen tint/shadow. Minimize is a separate causal
  scroll-down state, not idle decoration.
- Glass chrome has `rest`, `scroll-edge`, `minimized`, `pressed-control`, and
  `reduced-transparency` states. Reduced Motion keeps the compact geometry
  change without scale/transform. A pressed item may show localized optical
  response; the bar itself does not ripple or refract across unrelated items.

Primary items are Today, Plan, Progress, and Me. Their order is semantic
and does not reverse in code; layout direction places the first item at logical
start.

### PageHeader

Contains eyebrow/breadcrumb when useful, page title, optional subtitle, and at
most two actions. Sticky PageHeader may use regular glass; a static header is a
content element and remains opaque.

## Actions

### Button

Variants: `primary`, `secondary`, `tertiary`, `danger`, and `quiet`.

Sizes:

- `sm`: 40px, only in dense desktop contexts;
- `md`: 48px default;
- `lg`: 56px for onboarding and conversion actions.

States: default, hover where available, pressed, focus, disabled, loading.
Loading preserves the label and width, adds an announced progress state, and
prevents duplicate submission. Disabled controls require nearby explanatory
text when the reason is not self-evident.

Only one `primary` action should exist within a dialog or form step. Destructive
confirmation uses `danger`; cancel never uses danger styling.

`glassRegular`, `glassProminent`, and `glassClear` are functional-material
adaptations, not additional visual variants for every button. An eligible glass
button uses the same semantic action states, keeps its label/icon centered, and
adds the press/release response from [Motion](./motion.md). Prominent glass is
limited to one hierarchy-critical action. Clear requires a controlled backdrop.

### IconButton

The visible icon may be 20–24px; the target must be at least 44x44px. An
accessible name is mandatory. Tooltip appears on hover/focus on pointer devices
but is not the accessible-name mechanism.

### ActionChip

ActionChip is used for active filters and reversible
quick actions. It is not a substitute for a form select. Minimum height is 40px.
Selected state includes a check or other noncolor indication.

## Content containers

### ContentCard

Default opaque container for plans, meals, metrics, pricing, and settings.
Variants: `default`, `raised`, `selected`, `warning`, and `danger`. Glass is not a
variant. Cards are not clickable by default; when the full card is interactive,
it must have one clear action and correct button/link semantics.

### Section

Groups a heading, optional description/action, and related content. Section
spacing replaces repeated nested cards. A screen should generally expose no
more than three nested visual levels.

### EmptyState

Contains an optional illustration/icon, concise title, explanation, and one
primary next action. It must not celebrate an error or blame the user.

## Forms

### Field

Anatomy: persistent label, control, optional hint, validation message, and
optional unit/suffix. Placeholder is an example, never the only label.

All validation:

- runs on submit and on blur after the field has been touched;
- preserves entered data;
- puts the error adjacent to the field and references it semantically;
- states the corrective action;
- accepts Persian, Arabic, and Latin digits where numeric input is expected.

### TextField and TextArea

Single-line height is exactly `size.field.height` (48px, CSS `--size-field`).
Select triggers, Combobox, and DatePicker use the same token so every text-entry
control is one size. TextArea is the only exception: minimum two field-heights.
Focus uses the `focus.ring` token in addition to border change. Long health and
preference responses use TextArea with an optional character guidance, not a
punitive hard counter unless storage requires it.

### Combobox and DatePicker

Combobox supports typed filtering, no-match, suggested value, keyboard
navigation, clear and error. Country suggestion is a hint; it never becomes
authoritative eligibility without user and server confirmation.

DatePicker supports manual entry and picker selection, Persian/Arabic/Latin
digits, locale-calendar presentation and a canonical stored date. Birth date
reports adult-gate errors without deriving authority from a display string.

### Select, RadioGroup, Checkbox, Switch

- Use RadioGroup when 2–5 mutually exclusive options benefit from visibility.
- Use Select for longer, familiar option lists.
- Use Checkbox for independent choices.
- Use Switch only for an immediate setting; use Checkbox for consent.
- Labels and hit targets are interactive together.
- Liquid Glass menus (Select, Combobox, DatePicker) keep the frosted fill on
  the outer surface. Only an inner scroller moves. Never put `overflow: auto`
  on the same node that paints `::before` glass, or the fill disappears after
  scroll.

### ScaleField

Used for energy, hunger, mood, soreness, and confidence. Endpoints require words,
not only numbers or emoji. The control exposes the selected value and meaning to
assistive technology. For daily check-in, unanswered remains distinct from a
neutral midpoint.

### UploadField

Supports camera, file browser, drag/drop where available, progress, retry, remove,
and privacy explanation. It validates type/size before upload and never marks an
upload complete until server confirmation.

Body-composition review is a separate `CompositionReview` component showing
source, manually entered or non-generatively read value, unit, readability, and
editable confirmation. It must never imply that a separate AI analysis occurs.

### WeekdayPicker, DurationField and EquipmentField

- WeekdayPicker exposes seven localized labels and selected semantics. It fits or
  reflows at 320px without clipping Persian or reducing targets below 44×44.
- DurationField uses an approved-value select with an accessible Custom option,
  locale-safe number/unit formatting and a centered disclosure icon.
- EquipmentField is enabled only for relevant training locations. It supports
  typed/searchable equipment and selected tokens without becoming an oversized
  free-text area. Disabled state explains the location dependency.

Together these controls provide `ONB-15`–`ONB-20` evidence; a default specimen
alone is not sufficient.

## Navigation and disclosure

### SegmentedControl

Use for 2–5 peer views such as Week/Nutrition/Training. It uses roving keyboard
focus and selected semantics. Horizontal overflow is allowed only with an
obvious scroll affordance; otherwise use tabs or a select at compact widths.

### Tabs

Tabs change a major region without changing task context. They expose tablist,
tab, and tabpanel semantics and support arrow-key navigation. Route-backed tabs
must preserve deep links.

### Accordion

Use for progressive detail inside meals, recipes, and FAQ. Header is a button
with expanded state; content remains in document order. Do not nest accordions.

### StepProgress

Onboarding shows current step title and broad progress. It must not expose a
misleading percentage when steps branch. Users can navigate back without losing
answers. Completed steps may be revisited; locked future steps are not presented
as disabled controls.

## Momentum domain components

### DailyBrief

The top Today component. It contains greeting, date, current plan phase, one
short deterministic plan-status observation, and one primary next action. It must fit above the fold
with AppChrome on a 375x667 viewport at default text size.

### TimelineItem

Represents a meal, workout, recovery task, or check-in. Anatomy: time window,
type icon/label, title, concise detail, state, and action. States are `upcoming`,
`due`, `completed`, `skipped`, and `adjusted`. Skipped is neutral, not danger.

### MealCard

Collapsed anatomy: meal name, time, chosen option, primary nutrition summary,
completion state, and substitution affordance. Expanded content can reveal
ingredients, provenance, recipe, notes, and alternatives. Completion is a clear
action and remains reversible with confirmation only if downstream calculations
would materially change.

### WorkoutCard

Anatomy parallels MealCard: session type, duration, intensity, equipment,
exercise count, completion, and adaptations. Exercise details use sets/reps/rest
with locale-aware units and accessible table semantics where appropriate.

### MetricTile

Shows label, value/unit, comparison period, and optional compact trend. Color is
supportive only. Tiles link to detail only when a detail view exists. Avoid more
than four in the first Today viewport.

### ProgressChart

Includes title, selected range, legend, plot, concise text interpretation, and
data-table alternative. Touch/pointer selection has keyboard and screen-reader
equivalents. Trends use rolling averages when single-day noise could mislead.

### CheckInSheet

Optimized for completion in under one minute. It asks only scheduled or useful
questions, groups subjective scales before optional numeric details, and saves a
draft. The sheet may expand to full screen at large text sizes.

### WorkoutSession and ExerciseSet

WorkoutSession owns preview, active, paused, pain-caution, urgent-safe-stop,
finished, saving and save-error panels. It preserves logged sets locally during
a recoverable save failure. ExerciseSet supports complete, undo, skip and
governed substitution with locale-safe reps/time/rest. Neither component makes
an AI request. Together they cover `EXEC-04`–`EXEC-10`.

## Monthly plan components

### MonthlyPlanStatus

Shows the covered period, import status, entitlement state, and last successful
generation. It never presents the model as a person and contains no composer.

### MonthlyPlanSummary

Summarizes workout and nutrition coverage, the original onboarding baseline, and
the prior-period outcomes used for renewal. Generated content is read-only after
validation and automatic import.

### SubscriptionPlanGate

Before month two and later, clearly explains whether an active subscription was
verified. An inactive subscription never starts a generation job and keeps the
previous saved plan readable.

### GenerationStatus

Maps durable backend states to clear messages. Use indeterminate progress unless
the backend supplies meaningful progress. It supports close-and-return and never
encourages repeated paid retries. Only one idempotent generation may be reserved
for each entitled monthly period.

Provider, validation and import failures are distinct only where the user action
differs. All say the prior plan is safe, hide raw provider details and omit retry
after provider start. `needs_input` exists only before provider start and links
to the exact editable prerequisite.

### FirstPlanGiftGate and NextCycleNotice

FirstPlanGiftGate displays checking, available, reserving, reserved, unavailable,
gift-exhausted and safety-blocked. The UI never computes budget or claims a gift
before the atomic server reservation succeeds.

NextCycleNotice shows the `ready_at`-derived boundary, structured changes and one
optional note capped at 500 characters (soft guidance from 400). No action carries forward onboarding, current profile,
prior plan and outcomes. It never triggers generation early or creates a second
call.

### PlanVersionHeader and PlanDiff

PlanVersionHeader exposes version, effective interval, source cycle and status.
PlanDiff describes meaningful changes between immutable versions without showing
raw prompts. Both remain available after cancellation or renewal failure.

## Feedback and overlays

### Dialog and Sheet

Dialog traps focus, labels itself, supports Escape where dismissal is safe,
restores focus, locks background interaction, and keeps actions reachable at
large text sizes. Sheet is used for compact contextual tasks; complex onboarding
and account deletion use full pages or dialogs.

### Popover, Menu and Tooltip

These temporary functional layers may use regular/prominent glass with an opaque
fallback. Clear is allowed only for a compact control over a bounded, deliberately
composed backdrop. They have logical placement, collision handling, dismissal,
focus transfer/return and keyboard navigation. Tooltip never supplies the only
accessible name or required instruction.

A menu, popover, or compact action sheet may use a source-linked glass morph when
the initiating control and destination are semantically one interaction. The
source, midpoint, destination, and return states must remain interruptible and
restore focus. Unrelated overlays use a conventional transition. Reduced Motion
uses a brief opacity/tint change; Reduced Transparency uses the opaque material.
See Apple's [custom Liquid Glass guidance](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views).

### DestructiveConfirmation

Used for account deletion and irreversible record actions. It states object,
scope, consequence and recovery, requires explicit confirmation, keeps Cancel
non-destructive and exposes pending/success/failure without duplicate submit.

### Toast and InlineAlert

Toast confirms noncritical outcomes and does not contain required actions. Errors
that block a task stay inline. Screen readers receive polite announcements for
success and assertive announcements only for immediate blocking errors.

### Skeleton and progress

Skeleton geometry resembles final content, stops under reduced motion, and is
not exposed as many individual accessible elements. Content loading region has a
single status label. Do not keep skeletons visible merely to make a fast action
feel more substantial.

## Pricing components

### PricingCard

Shows the single subscription, localized price and billing period, included
monthly-plan entitlement, primary CTA, renewal/cancellation note and tax caveat.
It never presents Core/Pro tiers or a feature-comparison ladder. The first-plan
gift is a conditional campaign disclosure, not a second plan.

Eligible and Iranian-version markets share the same component anatomy. Region
affects default language and list currency only; it does not change gift,
checkout, generation, or feature quality.

### EntitlementGate

Explains why monthly generation is unavailable, the subscription/gift status and
valid alternative. It must not discard user input or hide prior plans. A gate
states that the cycle allowance is used only after successful import; before
import it may show queue retry. It never suggests chat messages or a higher tier.

## Responsive composition rules

- Compact reference is 390px and reflows to 320px; Medium is 768px; Expanded is
  1440px.
- Component width is parent-owned. Buttons are not stretched merely to hide
  alignment or padding defects.
- Icon and label are centered inside their content box. Leading/trailing icon
  slots have equal optical space and at least 8px label separation.
- ContentCard padding uses semantic spacing and consistent logical inline/block
  values. Compact density reduces gaps, not target size or text legibility.
- Navigation changes form without changing destination order or losing focus.
- Sheets may become full-screen at Compact/large text. Dialog actions remain
  reachable and data tables use containment or a semantic stacked alternative.

## Localization contract

- Persian and English use one component tree and logical start/end properties.
- Text alignment follows content semantics; centered action labels remain centered.
- Emails, identifiers, times and mixed measurements use bidi isolation.
- Numeric controls accept Persian, Arabic and Latin digits and normalize only at
  the data boundary.
- Weekday/date/unit labels use localized formatters and long-copy fixtures.
- User-facing copy never contains `RTL` or `LTR`.

## Storybook contract

Every component family has:

1. anatomy/default story;
2. state matrix for all semantically valid interaction/domain states;
3. Persian/English through the shared locale global;
4. Light/Dark through the shared appearance global;
5. Compact/Medium/Expanded stories when composition changes;
6. keyboard/focus, large-text, reduced-motion/transparency evidence;
7. associated screen-state IDs in story parameters/documentation;
8. deterministic local fixtures with no network, Supabase or provider calls.

## Component completion checklist

A component is ready only when Penpot and Storybook agree on:

- semantic name, anatomy and slot order;
- variants and allowed transitions;
- token bindings and opaque/glass material policy;
- exact padding, gap, icon box, target size and text alignment;
- responsive behavior and overflow;
- Persian/English long copy, localized values and direction behavior;
- role/name/value/state, focus order and announcements;
- loading, empty, offline, error, disabled, success and destructive behavior as
  relevant;
- event outputs and side-effect boundary, including no extra provider call.
