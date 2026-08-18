# Accessibility

Momentum targets WCAG 2.2 AA for web and equivalent platform guidance for iOS
and Android. Health, pricing, consent, and account-deletion paths receive the
same accessibility bar as the daily product.

## Perceivable

### Contrast

- Normal text: at least 4.5:1.
- Large text: at least 3:1.
- Component boundaries, focus indicators, icons carrying meaning, and chart
  marks: at least 3:1 against adjacent colors.
- Disabled controls may have lower contrast only when their state and reason are
  otherwise clear and no essential information is hidden.
- Glass contrast is tested against the worst expected composited background.
- Clear glass requires a bounded backdrop and local dimming/contrast treatment;
  otherwise it resolves to Regular/Prominent or the opaque fallback.
- Press/drag refraction is clipped to the active control and never distorts its
  label, icon, focus ring, value, or accessible state.

Increased Contrast strengthens tokenized boundaries inside Light or Dark. It is
an accessibility behavior, not a separate theme or token mode. Increasing opacity
alone is insufficient if foreground contrast remains low.

### Text and zoom

- Essential text is at least 14px; body text defaults to 16px.
- Web supports 200% zoom and reflow at 320 CSS px without two-dimensional scroll
  except for inherently spatial content such as charts/tables.
- iOS supports accessibility Dynamic Type sizes.
- Android supports font scale 2.0.
- Text containers grow vertically; fixed-height cards with readable text are
  prohibited.
- Truncation is allowed only for redundant metadata and exposes the full value.

### Noncolor communication

Completion, warning, selected, chart series, and plan changes combine color with
text, icon, pattern, or shape. Subjective ratings never rely only on emoji.

Images and body-composition uploads include purpose-appropriate alternatives.
Decorative aura, brand flourishes, and skeleton pieces are hidden from assistive
technology.

## Operable

### Targets and input

- Minimum web/iOS target: 44x44 CSS points.
- Default Android target: 48x48 dp.
- Adjacent compact targets have sufficient spacing and do not overlap.
- All pointer interactions have keyboard, switch-control, and voice-control
  equivalents where supported.
- Drag is never the only way to reorder or upload.

### Keyboard and focus

- Focus order follows reading and task order.
- Every interactive element has a visible focus indicator not obscured by sticky
  chrome.
- Skip-to-content is available in public and authenticated web shells.
- Route changes move focus to an appropriate page heading and announce the title.
- Dialogs trap focus, Escape-dismiss when safe, and restore focus.
- Tabs and radio groups use standard roving-focus keyboard behavior.
- No keyboard trap is permitted in calendar, chart, or upload controls.

### Time and motion

There are no essential time limits in onboarding, check-in, or payment review.
Authentication codes disclose expiry and provide resend without
discarding entered data.

Reduced Motion follows `motion.md`. Auto-updating content does not steal focus or
scroll position. Monthly generation status is announced as grouped state changes,
not as streaming model output.

With Reduced Motion, Liquid Glass removes contact-following optical travel,
geometry compression, shape blending, and source-linked morphing; a brief
opacity/tint change may communicate the same state. With Reduced Transparency,
all glass roles use the opaque fallback and keep identical targets, names,
focus order, and destinations.

## Understandable

- Buttons use verbs describing outcomes: “Save preferences” or “View updated
  plan,” not a vague “Continue.” Monthly generated plans are validated and
  imported automatically; no copy implies a separate acceptance gate.
- Health and pricing terms use plain language with expandable detail.
- Inputs state expected unit and format.
- Errors identify the field, problem, and recovery action.
- Required vs optional is explicit before submission.
- Destructive actions state scope, retention consequences, and reversibility.
- AI uncertainty and data provenance are visible where they affect decisions.

Momentum must not shame users for missed meals, weight fluctuation, low adherence,
or interrupted streaks. Progress language describes trends and choices rather
than moral success/failure.

## Robust semantics

### Page and navigation

- One primary `h1`/native page title per screen.
- Landmarks identify header, navigation, main, aside, and footer where applicable.
- Current navigation destination exposes selected/current state.
- Loading and sync status are announced once at the relevant region.

### Forms

Labels are programmatically associated. Hints and errors are referenced by the
control. Error summary links to invalid fields for long forms. Values remain
after validation failure.

### Monthly plan generation

Generation and automatic import states are announced once per meaningful state
change. The covered month, subscription gate, failure recovery, and preserved
previous plan are available as text, not color alone.

### Charts

Every chart provides:

- accessible title and date range;
- a concise trend summary;
- exact values in an accessible table/list;
- keyboard-accessible point exploration if interactive;
- series labels beyond color;
- no required interpretation based on animation.

### Calendar

Calendar exposes grid semantics, full localized dates, selected/today states,
and event summaries. A list alternative is available at large text sizes and to
users who prefer it.

## User preferences

Momentum supports:

- light, dark, and system appearance;
- reduced motion;
- reduced transparency;
- increased contrast;
- larger text/platform text scaling;
- optional haptics and sound independently;
- chart simplification and data-table preference where feasible.

Platform settings initialize these preferences. Explicit in-app overrides are
stored per account and must not force a less accessible mode than a current
system requirement.

## Verification matrix

Required before a component/screen is complete:

1. automated semantic and contrast checks;
2. keyboard-only web operation;
3. VoiceOver on iOS/Safari;
4. TalkBack on Android/Chrome;
5. 200% web zoom, largest iOS accessibility size, Android font scale 2.0;
6. Light/Dark, including increased-contrast behavior within each appearance;
7. reduced motion and reduced transparency;
8. Persian and English;
9. color-vision simulation for charts and statuses;
10. error, empty, loading, offline, and stale-data states.

Automated checks do not replace manual assistive-technology testing.
