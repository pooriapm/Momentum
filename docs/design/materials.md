# Materials and Glass Usage

Version: 1.1

Status: founder-approved expressive Liquid Glass contract

Last reviewed: 2026-08-13

This material specification is governed by the founder-approved
[Human Strength visual direction](./visual-direction.md). Liquid Glass is an
Apple-aligned functional hierarchy, not a decorative blur applied to content.

## Layer model

Momentum Orbit uses three visual layers:

1. **Environment:** canvas, restrained aura, media, and chart backgrounds;
2. **Content:** plans, meals, forms, metrics, messages, and explanations;
3. **Function:** navigation, toolbars, popovers, and temporary
   controls.

Momentum Glass belongs to the Function layer. This preserves a clear hierarchy
and prevents translucent cards from reducing readability in a data-dense health
product.

## Momentum Glass variants

These are semantic Momentum roles. They adapt Apple's system materials rather
than attempting to reproduce a fixed screenshot. Apple describes Liquid Glass
as a dynamic material that reflects surrounding color and light and responds to
touch and pointer input; standard platform controls also adapt for overlap and
focus. See [Apple's Liquid Glass overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass),
[adoption guidance](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass),
and [custom-view guidance](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views).

### Regular

Default for bottom navigation, sidebar, top toolbar, and popover. It uses
controlled blur, adaptive tint, subtle border, and elevation.
Foreground content must retain AA contrast across expected backgrounds.

### Prominent

Reserved for one hierarchy-critical floating control or a
platform-conventional action surface when Regular does not provide enough
separation. It uses a more opaque adaptive tint, slightly stronger blur, a
stronger asymmetric optical edge, and restrained elevation. It must not compete
with the screen's primary Plum action or become a content card.

Prominent may carry a controlled Deep Plum tint for the single highest-priority
functional action. Apricot may appear as a brief interaction highlight, never
as a second persistent primary-action fill. Prominent describes hierarchy, not
"more blur everywhere."

### Clear

Reserved for a very small floating control over a deliberately bounded hero,
media, or aura field when Regular would obscure too much of that environment.
Clear is nearly untinted and therefore has the strictest contrast gate. It must
have a known backdrop plus a local dimming or edge treatment; it is never placed
over arbitrary scrolling text, charts, forms, or health values. Apple's
[`Glass.clear`](https://developer.apple.com/documentation/swiftui/glass/clear)
guidance likewise requires an underlying treatment when needed for legibility.

### Opaque fallback

Used when transparency is reduced, backdrop filtering is unavailable, contrast
cannot be guaranteed, print is active, battery/performance policy disables blur,
or a native accessibility setting requests it.

Fallback is a first-class material token, not an ad-hoc background override.

## Material anatomy

Every non-fallback Momentum Glass component visibly contains the following
layers. Omitting the response layer produces ordinary frosted glass and fails
this contract.

1. **Concentric shape:** one clipped continuous contour whose radius relates to
   its container and the device/surface corners.
2. **Backdrop sample:** bounded blur and restrained saturation of the content
   behind the component; child text and icons remain crisp.
3. **Adaptive tint:** a neutral base at rest, with Deep Plum reserved for
   selection/prominence and Apricot for a short human-energy highlight.
4. **Optical boundary:** one asymmetric specular edge/highlight plus a quiet
   opposite edge; it is not a uniform white outline.
5. **Depth separation:** a restrained contact shadow or scroll-edge treatment
   that strengthens only when content moves beneath the chrome.
6. **Semantic foreground:** stable, high-contrast text/iconography unaffected by
   the backdrop shader.
7. **Interaction response:** a localized highlight/refraction shift and slight
   shape compression, blend, or morph tied directly to press, drag, focus, or a
   source-linked transition.

Penpot represents this anatomy with named layers and adjacent Rest, Pressed,
Drag/Selected, and Morph destination frames. Storybook must render the same
anatomy and make the state sequence executable.

## Permitted uses

- public header over the landing hero;
- authenticated bottom bar, rail, or sidebar;
- compact sticky page toolbar;
- contextual popover or menu;
- transient segmented/slider thumb while interacting;
- source-linked action sheet or compact half sheet;
- temporary toast when it does not contain long text.

## Prohibited uses

- default content cards;
- unrelated or independently moving glass nested inside glass;
- forms or onboarding question panels;
- body-composition values and source review;
- plan, meal, recipe, grocery, or workout cards;
- charts, tables, and long-form plan explanations;
- pricing/feature comparison;
- full-page backgrounds;
- danger and consent confirmations where contrast is critical.

Related glass shapes may briefly blend or morph inside one coordinated container
during a source-linked transition. At rest they must resolve into one coherent
group or separate shapes with enough spacing; unrelated floating capsules may
not overlap or substitute for information architecture. Apple's
[`GlassEffectContainer`](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
uses the same container concept for rendering and shape morphing.

Apple's [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
adds layout rules that Momentum follows on web as approximations:

- navigation and toolbars **float** above content; they are not full-bleed opaque bars;
- related toolbar items share one glass capsule; unrelated items are separated;
- half sheets are **inset** so the environment peeks around them, then become
  more opaque if they grow to a full-height task;
- action sheets originate from their source control;
- forms, health values, and consent stay on opaque content material even when
  the sheet *shell* is glass;
- Liquid Glass is used sparingly. Extra custom glass controls compete with
  content and are rejected.

## Optical behavior

The web reference uses `material.glassRegular` by default,
`material.glassProminent` only for the restricted hierarchy above, and
`material.glassClear` only with a controlled backdrop.
`material.glassFallback` is the mandatory non-translucent replacement.
Implementations should:

- clip blur to the component shape;
- apply blur to content behind, not to children;
- use a directional specular highlight rather than a flat frosted outline;
- keep tint saturation restrained;
- increase separation shadow when content scrolls beneath chrome;
- let the contact point locally shift highlight/refraction during press or drag;
- let related shapes blend/morph only during a source-linked transition;
- keep the material optically stable at rest: no idle shimmer, animated noise,
  autonomous refraction, or whole-screen cursor-following light;
- render a solid color before blur is available to prevent a flash of unreadable
  content;
- use concentric rounded corners that nest inside their container;
- apply `interactive` press only to functional glass, never to content cards.

### Interaction response contract

| Moment | Visible response | Boundary |
| --- | --- | --- |
| Rest | Stable backdrop sample, asymmetric edge light, quiet depth | No autonomous movement |
| Hover/focus | Small local lift and boundary/tint clarification | Does not move layout; keyboard focus ring remains explicit |
| Press | Highlight bends toward contact, refraction/tint intensifies locally, geometry compresses at most 1.5% | Begins within `glassPress`; label/icon stays crisp and centered |
| Drag | Response follows the active thumb/contact point inside that control | Stops at control bounds; never tracks the pointer across the page |
| Release | Shape and highlight settle with the glass spring | No rebound that suggests a second action |
| Open/close | Source control morphs or expands toward its own menu/popover/sheet and returns by the same path | Only when source and destination are semantically related |
| Scroll under chrome | Edge separation increases as content crosses beneath | No continuous full-screen distortion |

Use `motion.duration.glassPress`, `glassRelease`, and `glassMorph` with
`motion.spring.glassResponse` / `glassDampingFraction`. Apple recommends
interactive glass for controls and coordinated containers for custom morphs;
Momentum's numeric values are our cross-platform approximation, not Apple
platform constants.

Native platforms should prefer their system-provided adaptive material for
navigation and controls, while retaining Momentum tint, foreground semantics,
shape, and accessibility behavior.

## Content materials

`surface.content` is the default. `surface.raised` is reserved for selected,
editable, or elevated content. `surface.sunken` is used by fields and plotting
areas. A border, tonal shift, or elevation should communicate grouping; rarely
all three at once.

Content surfaces do not blur the background. A translucent content fill may be
used only when it remains effectively opaque against the fixed canvas and passes
all contrast tests.

## Aura and gradients

Aura is an environment effect, never information. Use at most two low-opacity
radial gradients per screen. The authenticated app should use less aura than the
landing page.

Gradients are allowed for:

- landing illustration fields;
- a restrained primary CTA sheen;
- monthly generation progress;
- data visualization where a legend remains explicit.

Gradients must not sit directly behind long text, input values, or charts. Do not
animate full-screen gradients continuously.

## Color application

The approved Human Strength palette assigns Deep Plum to brand/action identity
and Apricot to restrained human-energy moments. Complete semantic roles for
active navigation, monthly plan state, confirmation, warning, danger, focus,
and charts must be validated in both Light and Dark before component rollout.

Tinting every control removes hierarchy. A screen should normally expose one
Plum primary action. Apricot is not a competing default CTA and must not replace
warning or danger semantics.

## Accessibility and performance

- Text must be measured against the composited result, not merely the fill token.
- Reduced Transparency switches glass to `opaqueFallback` and removes background
  dependency.
- Increased Contrast strengthens boundaries within the active Light or Dark
  appearance and removes subtle tint-only selected states; it is not a separate mode.
- Reduced Motion disables elastic deformation, contact-tracking refraction, and
  material morphing; a short opacity/tint state change may remain.
- Low-end web devices may use opaque fallback based on capability testing.
- Backdrop blur must never be required for understanding hierarchy or state.

## Artifact acceptance

Liquid Glass is accepted only when all of the following are visible and tested:

- Penpot provides Regular, Prominent, Clear, and Fallback masters in both Light
  and Dark, plus a four-frame interaction sequence for Press → Drag/Selected →
  Release and a source-linked Open → Close sequence;
- at least the public header, authenticated navigation, one contextual popover,
  one slider/segmented interaction, and one source-linked sheet use instances of
  those masters rather than hand-drawn blur rectangles;
- Storybook exposes live Rest/Hover/Focus/Pressed/Dragging/Morphing states and
  preference controls for Reduced Motion and Reduced Transparency;
- Persian and English labels remain centered, unclipped, and readable at maximum
  supported text scale in both appearances;
- no content/form/health surface becomes translucent, and Clear never ships
  without its bounded-backdrop and contrast evidence;
- the resting screenshot still shows glass depth, while the interaction recording
  shows localized refraction and connected morphing comparable in character to
  the approved preview.
