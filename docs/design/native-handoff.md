# Web and Native Handoff

## Shared source and generated outputs

`tokens.json` is platform-neutral. A future build pipeline should generate:

```text
design/generated/momentum-orbit.css
ios/MomentumDesign/Sources/Generated/MOTokens.swift
android/momentum-design/src/main/kotlin/generated/MoTokens.kt
```

Generated artifacts include the token schema version and checksum. Hand-edited
platform overrides live beside, never inside, generated files.

The shared contract covers:

- semantic colors and modes;
- typography roles;
- spacing, radius, target sizes, and component dimensions;
- elevation intent;
- motion duration/easing intent;
- material intent;
- component anatomy, state names, content priority, and accessibility.

It does not require pixel-identical system controls, navigation transitions,
fonts, shadows, or blur algorithms.

## Web mapping

Semantic colors resolve for the active mode to CSS custom properties:

```css
:root {
  --mo-color-text-primary: #14182a;
  --mo-color-action-primary: #4e51d8;
  --mo-space-4: 16px;
  --mo-radius-card: 20px;
  --mo-motion-standard: 240ms;
}

[data-theme="dark"] {
  --mo-color-text-primary: #f7f8fc;
  --mo-color-action-primary: #9699ff;
}
```

Use `@media (prefers-contrast: more)`, `prefers-reduced-motion`, and supported
reduced-transparency capability plus an in-app accessibility attribute. Logical
CSS properties are mandatory for layout.

Web glass maps to `backdrop-filter` only after capability testing. The element
always has its opaque fallback color before blur is applied.

## SwiftUI mapping

Generated tokens expose dynamic semantic values, while handwritten adapters map
materials and type roles:

```swift
enum MOColor {
    static let textPrimary = Color("mo.text.primary", bundle: .module)
    static let actionPrimary = Color("mo.action.primary", bundle: .module)
}

enum MOSpace {
    static let s4: CGFloat = 16
}
```

- Prefer SwiftUI system navigation/material APIs for functional glass.
- Apply Momentum tint and semantic foreground roles above system material.
- Respect `layoutDirection`, `locale`, Dynamic Type, Reduce Motion, Reduce
  Transparency, Increase Contrast, and Differentiate Without Color.
- Use SF Symbols where a semantic match exists; maintain an icon mapping table.
- Use platform sheets, navigation stacks, focus, and haptics unless the component
  contract requires behavior the system component cannot provide.

Native Liquid Glass APIs are an implementation option, not the product identity.
Older OS versions use standard Material/opaque fallback with the same hierarchy.

## Jetpack Compose mapping

Generated values feed a Momentum theme layered on Material 3:

```kotlin
object MoSpace {
    val S4 = 16.dp
}

@Immutable
data class MoColors(
    val textPrimary: Color,
    val actionPrimary: Color,
    val surfaceContent: Color,
)
```

- Map semantic roles into a dedicated `MoColors`, not only `ColorScheme`, when
  Material roles are insufficient.
- Use Material 3 navigation, dialogs, fields, semantics, focus, and ripple/haptic
  conventions.
- Approximate functional glass with a performant blur only when supported;
  otherwise use the opaque fallback.
- Respect `LayoutDirection`, locale, font scale, high contrast where available,
  remove animations, and platform accessibility services.
- Use Material Symbols or custom vector assets through a documented icon map.

## Component parity matrix

Each shared component has a parity record:

| Field | Meaning |
| --- | --- |
| semantic name | Stable component identity |
| anatomy | Required slots and hierarchy |
| variants | Shared visual/behavioral variants |
| states | Enabled, pressed, loading, error, domain states |
| actions | Events and side effects |
| accessibility | Role, name, value, state, focus order |
| responsive | Compact/medium/expanded behavior |
| platform adaptation | Explicitly permitted divergence |
| analytics | Stable user-action event names, never visual events |

A native implementation is not complete when only its default screenshot
matches. It must cover loading, empty, offline, error, large text, RTL, and
accessibility modes.

## Assets

- The Momentum mark is supplied as a master vector with safe area and monochrome
  versions.
- Platform app icons are generated from approved masters, not from screenshots.
- Brand animation uses vector paths or native drawing and has a static final
  frame for Reduced Motion.
- Illustration assets include light/dark suitability and localization notes.
- Raster assets specify 1x/2x/3x or Android density outputs and compression.

Do not embed text in imagery. Directional artwork has an explicit mirroring flag.

## Domain and localization handoff

UI tokens do not localize domain values. APIs send canonical IDs, ISO dates,
IANA time zones, ISO currencies, and canonical units. Each platform shares
translation key names and formatting scenarios, not preformatted English or
Persian strings from the database unless content is intentionally authored.

AI responses store language and structured semantic sections. Clients render
those sections with platform components rather than parsing model-authored
Markdown into arbitrary visual hierarchy.

## Release parity checklist

Before a shared design-system release:

1. validate and checksum tokens;
2. generate all platform outputs;
3. run semantic color contrast manifest;
4. render component-state snapshots in four color modes;
5. render FA/RTL and EN/LTR at compact and expanded widths;
6. test maximum supported text scaling;
7. test reduced motion/transparency and high contrast;
8. compare component parity records;
9. record intentional platform differences;
10. version and publish tokens and component documentation together.
