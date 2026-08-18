# Foundations

## Brand character

Momentum should feel calm, capable, optimistic, and personal. It is a dependable
monthly planning tool, not a conversational personality or transformation challenge.

The visual signature combines:

- the approved **Human Strength — Deep Plum + Apricot** brand direction;
- warm neutral content surfaces and semantic colors authored separately for
  Light and Dark appearances;
- restrained accents for plan status, energy, and confirmation;
- large quiet content fields beneath compact floating navigation.

Avoid bodybuilding imagery, aggressive red/black combinations, fluorescent
green dashboards, medical-blue sterility, and gamification that implies moral
failure.

The approved palette anchors, Liquid Glass rules, and precedence contract are
defined in [Visual direction](./visual-direction.md). Older indigo, violet, and
coral examples are superseded and must not guide new design work.

## Color roles

Feature code must consume semantic roles from `tokens.json`; primitive colors
are available only to the token layer.

### Core semantic roles

| Role | Intent |
| --- | --- |
| `background.canvas` | Root application background |
| `background.subtle` | Grouped section background |
| `surface.content` | Default content card and form surface |
| `surface.raised` | Elevated content or selected panel |
| `surface.sunken` | Inputs, wells, and chart plots |
| `surface.glassRegular` | Stable tint for default functional glass |
| `surface.glassProminent` | Stronger-separated hierarchy-critical glass |
| `surface.glassClear` | Minimal-tint glass over a controlled backdrop only |
| `surface.glassInteractionPrimary` | Local Deep Plum press/selection optical response |
| `surface.glassInteractionEnergy` | Brief local Apricot interaction highlight |
| `surface.glassFallback` | Opaque replacement for every glass role |
| `surface.scrim` | Modal background dimming |
| `text.primary` | Primary reading text |
| `text.secondary` | Supporting text |
| `text.tertiary` | Metadata; never critical information |
| `text.inverse` | Text over dark media/scrims |
| `action.primary` | Main action and active navigation state |
| `action.primaryHover` | Pointer hover on the main action |
| `action.primaryPressed` | Pressed main action |
| `action.secondary` | Low-emphasis action and selected-control fill |
| `plan.primary` | Monthly plan identity and generation context |
| `energy.primary` | Nutrition, training energy, and attention |
| `status.success` | Confirmed completion or safe success |
| `status.warning` | Caution or input that needs review |
| `status.danger` | Destructive action, failure, or critical error |
| `status.info` | Neutral informational state |
| `border.subtle` | Content grouping |
| `border.control` | Default field/control separation |
| `border.strong` | High-emphasis and Increased Contrast separation |
| `focus.ring` | Keyboard and assistive focus indicator |

Color must never be the only carrier of state. Pair it with text, iconography,
shape, or position. A calorie deficit, weight change, or missed action is not
automatically a danger state.

All status families include foreground, `Soft` background, and `Border`
tokens. Charts provide six semantic series, but every series must also have a
distinct line pattern or marker. Apricot remains an energy accent and chart
category; it is never a warning substitute or a second default CTA.

## Typography

Persian uses Vazirmatn. English uses the platform system font to retain native
legibility: `system-ui` on web, San Francisco on Apple platforms, and Roboto on
Android. Mixed-language text must preserve the surrounding language's font and
use bidi isolation for embedded values.

| Role | Size / line height | Weight | Typical use |
| --- | --- | --- | --- |
| `display` | 40 / 52 | 800 | Landing hero only |
| `title1` | 32 / 44 | 800 | Major page title |
| `title2` | 24 / 34 | 750 | Section or modal title |
| `title3` | 20 / 30 | 700 | Card-group title |
| `body` | 16 / 26 | 400 | Reading and descriptions |
| `bodyStrong` | 16 / 26 | 650 | Important body text |
| `label` | 14 / 20 | 650 | Controls, tabs, and field labels |
| `caption` | 12 / 18 | 500 | Nonessential metadata |
| `metric` | 28 / 34 | 750 | Primary numeric values |

Web implementations may reduce `display` to 34px on narrow screens. No readable
text may be smaller than 12px. Any content essential to completing a task must
be at least 14px. Numeric metrics should enable tabular numerals.

Text must support at least 200% browser zoom, iOS Dynamic Type accessibility
sizes, and Android font scale 2.0 without clipping or hiding actions.

## Spacing and density

Spacing follows a 4-point base grid. Use semantic composition rather than
inventing values in feature code.

- `space.1` 4: icon/text micro-gap;
- `space.2` 8: tightly related controls;
- `space.3` 12: compact card internals;
- `space.4` 16: default component padding;
- `space.5` 20: comfortable content padding;
- `space.6` 24: section internals;
- `space.8` 32: section separation;
- `space.10` 40 and `space.12` 48: page rhythm;
- `space.16` 64: landing-page rhythm.

Compact density may reduce card padding from 20 to 16, but never reduce target
size or readable type.

## Shape and concentricity

Radii communicate nesting:

- controls: 12px;
- fields and compact cards: 16px;
- standard cards: 20px;
- large panels: 24px;
- navigation glass and major hero frames: 28px;
- pills: fully rounded.

Nested corners should be visually concentric. As a default, an inner radius is
the outer radius minus the inset between them. Avoid placing unrelated rounded
rectangles inside every card.

Functional glass adds one asymmetric optical edge and a localized interaction
response inside this same contour; it does not add nested decorative capsules.
The complete Regular/Prominent/Clear/Fallback anatomy and motion rules live in
[Materials](./materials.md) and [Motion](./motion.md).

## Elevation

Only four elevation levels exist:

| Level | Meaning |
| --- | --- |
| `0` | Canvas and content surfaces |
| `1` | Raised/selected content |
| `2` | Sticky chrome, floating action/control, popover |
| `3` | Dialog, blocking confirmation, critical overlay |

Dark mode relies more on border and tonal separation than large black shadows.
Elevation must not imply interactivity by itself.

## Layout

All layout uses logical `start` and `end` concepts.

- compact: 320–599px, 16px page gutter;
- medium: 600–1023px, 24px gutter;
- expanded: 1024px and above, 32px gutter;
- reading/content maximum: 1120px;
- onboarding/form maximum: 720px;
- focused reading width: 760px.

Mobile uses a four-destination bottom bar. Expanded layouts use a sidebar at
the reading start edge. Medium layouts may use a rail. The
content order must remain equivalent across sizes.

Safe-area insets are additive to component padding. Fixed navigation must never
obscure the last interactive element.

## Iconography and illustration

Icons are line-based, rounded, and optically consistent. Use 20px in standard
controls, 24px for primary navigation, and 16px for inline metadata. An icon-only
action requires an accessible name and at least a 44x44 target.

Directional icons mirror only when they communicate physical or reading
direction: arrows, chevrons, undo/redo, send, and progress. Universal objects,
charts, clocks, media controls, and the Momentum mark do not mirror.

Illustration should use abstract orbital paths, gentle gradients, and human
movement silhouettes without implying a particular body ideal, sex, ethnicity,
or ability.
