# Semantic Token Contract

`tokens.json` is the reference source for Momentum Orbit values. Build systems
may transform it, but generated CSS, Swift, Kotlin, or asset files must not be
edited as an alternative source of truth.

## Token object

Every leaf token has this shape:

```json
{
  "type": "color",
  "value": {
    "light": "{color.primitive.neutral.0}",
    "dark": "{color.primitive.neutral.900}"
  },
  "description": "Default content surface"
}
```

Required keys:

- `type`: one of the supported types below;
- `value`: a scalar, alias, structured value, or complete mode map;
- `description`: required for semantic and component tokens.

An alias is a full token path wrapped in braces, such as
`{color.semantic.action.primary}`. Aliases must resolve to a token of the same
type. Circular and unresolved aliases are invalid.

## Modes

The canonical modes are:

- `light`;
- `dark`.

A primitive token normally has a scalar value. A semantic color or material
must define every canonical mode. A generator must fail rather than silently
fall back when a mode is missing.

Reduced transparency is a user capability, not a color mode. Material tokens
therefore include both their normal parameters and an `opaqueFallback`.
Reduced motion is also a capability, not a mode; it resolves interaction and
morph behavior to the stable final state. The theme list remains exactly Light
and Dark.

## Supported types

| Type | JSON value | Platform mapping |
| --- | --- | --- |
| `color` | hex in `#RRGGBB` or `#RRGGBBAA` | CSS color, SwiftUI Color, Compose Color |
| `dimension` | number in density-independent points | px/rem transform, CGFloat, dp |
| `duration` | integer milliseconds | ms, seconds, milliseconds |
| `number` | unitless number | number/CGFloat/Float |
| `fontFamily` | ordered string array | CSS stack or native family selection |
| `fontWeight` | integer 100–900 | CSS/Swift/Kotlin font weight |
| `typography` | `{size,lineHeight,weight,...}` | CSS type class, Swift font role, Compose typography |
| `cubicBezier` | four-number array | timing function |
| `shadow` | `{x,y,blur,spread,color}` | platform shadow abstraction |
| `material` | material structure described below | platform material adapter |

Dimensions in the JSON are logical design points. Web generators may emit px
for component geometry and rem for typography according to the target build
policy. Native generators use points/dp without changing the source value.

## Material structure

```json
{
  "fill": "{color.semantic.surface.glassRegular}",
  "blur": 22,
  "saturation": 1.16,
  "border": "{color.semantic.border.glass}",
  "shadow": "{shadow.2}",
  "opaqueFallback": "{color.semantic.surface.glassFallback}"
}
```

`blur` is advisory for native system materials. Native implementations should
choose the closest semantic platform material and use these values only for
custom rendering. `material.glassRegular`, `material.glassProminent`, and
`material.glassClear` must all resolve to `material.glassFallback` when Reduced Transparency is active,
backdrop filtering is unsupported, composited contrast is unknown, or the
performance policy disables blur. Increased Contrast strengthens the border
and selected-state treatment inside Light or Dark; it is not a token mode.

The material value describes the stable optical base. Interaction is a separate
semantic layer so a design tool or platform renderer can substitute its native
shader without changing the material token. The approved cross-platform signals are:

- `color.semantic.surface.glassInteractionPrimary`: localized Deep Plum
  selection/contact response;
- `color.semantic.surface.glassInteractionEnergy`: brief localized Apricot
  highlight;
- `motion.duration.glassPress`, `glassRelease`, and `glassMorph`;
- `motion.spring.glassResponse` and `glassDampingFraction`.

Those colors never replace a control's stable semantic foreground or encode state
alone. Their animated region is clipped to the active control. Clear glass also
requires a controlled backdrop and a local dimming/contrast treatment, following
Apple's [`Glass.clear`](https://developer.apple.com/documentation/swiftui/glass/clear)
legibility guidance.

## Naming

Paths follow `category.layer.role.state`:

- primitive: `color.primitive.plum.700`;
- semantic: `color.semantic.action.primaryPressed`;
- foundation: `radius.card`, `motion.duration.standard`;
- interaction: `motion.duration.glassPress`,
  `color.semantic.surface.glassInteractionPrimary`;
- component: `component.button.height.md`.

Names describe purpose, never appearance. Do not add names like `greenText`,
`darkCard`, `leftPadding`, or `iosBlue`.

State suffixes are limited to `default`, `hover`, `pressed`, `selected`,
`disabled`, `focus`, and `danger` unless a component specification defines a
domain state.

The retired `indigo`, `violet`, `coral`, `teal`, and `red` primitive families
must not be reintroduced as compatibility aliases. The schema 3 migration is an
intentional visual reset: consumers migrate to semantic roles, not old palette
names.

## Consumption rules

Feature code must use semantic or component tokens. Primitive tokens may be
referenced only by semantic tokens, design tooling, brand assets, and controlled
data-visualization palettes.

Component tokens should alias semantic/foundation tokens rather than repeat raw
values. A platform may substitute a system behavior only if it preserves the
semantic intent in both supported themes.

### Target naming

| Source | CSS | Swift | Kotlin |
| --- | --- | --- | --- |
| `color.semantic.text.primary` | `--mo-color-text-primary` | `MOColor.textPrimary` | `MoColor.TextPrimary` |
| `space.4` | `--mo-space-4` | `MOSpace.s4` | `MoSpace.S4` |
| `radius.card` | `--mo-radius-card` | `MORadius.card` | `MoRadius.Card` |
| `motion.duration.standard` | `--mo-motion-standard` | `MOMotion.standard` | `MoMotion.Standard` |

## Validation requirements

A token build must fail when:

- JSON is invalid;
- a leaf omits `type` or `value`;
- a semantic/component token omits `description`;
- an alias is unresolved, circular, or type-incompatible;
- a semantic color/material omits a canonical mode;
- a duration is negative;
- spacing, radius, or component dimensions are negative;
- opacity or other bounded numbers fall outside their documented range;
- a semantic text/background pairing in the contrast manifest falls below its
  required threshold.

Token output must be deterministic. Generated files should contain the source
schema version and checksum so web and native clients can verify parity.

## Versioning

- patch: primitive value correction with no semantic or API change;
- minor: additive token or mode;
- major: rename, deletion, type change, semantic intent change, or changed unit
  interpretation.

Deprecated tokens remain aliases for one minor release and include a replacement
path in generated documentation.
