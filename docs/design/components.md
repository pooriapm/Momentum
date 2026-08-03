# Component Specifications

Every component supports light/dark and FA/RTL/EN/LTR, exposes an accessible
name where required, and uses semantic state rather than visual-only state.

## Global chrome

### AppChrome

AppChrome composes the platform navigation container, account state, and global
actions. It uses `material.chrome` and elevation 2.

- Compact: floating five-item bottom navigation plus a restrained top bar.
- Medium: navigation rail at inline-start.
- Expanded: sidebar at inline-start and optional page toolbar.
- The current destination uses icon, label, tint, and `aria-current`/native
  selected semantics.
- Navigation labels remain visible; icon-only primary navigation is prohibited.
- Safe-area padding is additive to the 12px internal padding.
- A scroll-edge state may strengthen tint/shadow but must not resize controls.

Primary items are Today, Plan, Coach, Progress, and Me. Their order is semantic
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

### IconButton

The visible icon may be 20–24px; the target must be at least 44x44px. An
accessible name is mandatory. Tooltip appears on hover/focus on pointer devices
but is not the accessible-name mechanism.

### ActionChip

ActionChip is used for coach prompt suggestions, active filters, and reversible
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

Minimum height 48px. Focus uses the `focus.ring` token in addition to border
change. Long health and preference responses use TextArea with an optional
character guidance, not a punitive hard counter unless storage requires it.

### Select, RadioGroup, Checkbox, Switch

- Use RadioGroup when 2–5 mutually exclusive options benefit from visibility.
- Use Select for longer, familiar option lists.
- Use Checkbox for independent choices.
- Use Switch only for an immediate setting; use Checkbox for consent.
- Labels and hit targets are interactive together.

### ScaleField

Used for energy, hunger, mood, soreness, and confidence. Endpoints require words,
not only numbers or emoji. The control exposes the selected value and meaning to
assistive technology. For daily check-in, unanswered remains distinct from a
neutral midpoint.

### UploadField

Supports camera, file browser, drag/drop where available, progress, retry, remove,
and privacy explanation. It validates type/size before upload and never marks an
upload complete until server confirmation.

Body-composition review is a separate `ExtractionReview` component showing
source, extracted value, unit, confidence/readability, and editable confirmation.

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
short coach observation, and one primary next action. It must fit above the fold
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

## Coach components

### CoachMessage

Variants: user, coach, system status, and safety boundary. Coach messages are
content surfaces, not glass bubbles. Long structured content uses headings and
lists. Timestamp is metadata and does not compete with the message.

### CoachComposer

Uses regular glass because it is floating functional chrome. Contains growing
text input, attachment action, send/stop action, and optional context chip.
Send is disabled only when content is empty or submission is unsafe. Keyboard,
voice-control, and screen-reader ordering matches visual order.

### CoachRecommendation

Displays recommendation, rationale, expected impact, evidence/input summary, and
actions. Types are `explanation`, `suggestion`, and `planChange`. Only
`planChange` may mutate a plan, and only after `PlanChangePreview` confirmation.

### PlanChangePreview

Shows before/after values, reason, affected dates, and cost/safety implications.
Accept and Reject are explicit. Batch changes summarize the whole change before
showing optional details.

### GenerationStatus

Maps durable backend states to clear messages. Use indeterminate progress unless
the backend supplies meaningful progress. It supports close-and-return and never
encourages repeated paid retries.

## Feedback and overlays

### Dialog and Sheet

Dialog traps focus, labels itself, supports Escape where dismissal is safe,
restores focus, locks background interaction, and keeps actions reachable at
large text sizes. Sheet is used for compact contextual tasks; complex onboarding
and account deletion use full pages or dialogs.

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

Shows plan name, localized price and billing period, audience, included limits,
primary CTA, renewal/cancellation note, and tax caveat where relevant. A
recommended plan uses a text badge and border, not size or color alone.

Iranian and international prices share the same component and entitlement
comparison. Region affects price data, currency formatting, and payment methods;
it does not silently change language or feature quality.

### EntitlementGate

Explains why a feature is unavailable, the current plan, required plan, and
alternative. It must not discard user input. Generation gates identify whether
the action consumes a quota before confirmation.
