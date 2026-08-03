# Materials and Glass Usage

## Layer model

Momentum Orbit uses three visual layers:

1. **Environment:** canvas, restrained aura, media, and chart backgrounds;
2. **Content:** plans, meals, forms, metrics, messages, and explanations;
3. **Function:** navigation, toolbars, floating composer, popovers, and temporary
   controls.

Momentum Glass belongs to the Function layer. This preserves a clear hierarchy
and prevents translucent cards from reducing readability in a data-dense health
product.

## Momentum Glass variants

### Regular

Default for bottom navigation, sidebar, top toolbar, popover, and floating coach
composer. It uses controlled blur, adaptive tint, subtle border, and elevation.
Foreground content must retain AA contrast across expected backgrounds.

### Clear

Allowed only over intentionally composed, visually rich landing media when:

- underlying media is important;
- a dimming layer protects contrast;
- foreground content is short, bold, and nonessential to health decisions.

Clear glass must not be used in the authenticated app, forms, dialogs, charts,
pricing cards, or coach recommendations.

### Opaque fallback

Used when transparency is reduced, backdrop filtering is unavailable, contrast
cannot be guaranteed, print is active, battery/performance policy disables blur,
or a native accessibility setting requests it.

Fallback is a first-class material token, not an ad-hoc background override.

## Permitted uses

- public header over the landing hero;
- authenticated bottom bar, rail, or sidebar;
- compact sticky page toolbar;
- coach composer floating above the message timeline;
- contextual popover or menu;
- transient segmented/slider thumb while interacting;
- temporary toast when it does not contain long text.

## Prohibited uses

- default content cards;
- nested glass inside glass;
- forms or onboarding question panels;
- body-composition values and source review;
- plan, meal, recipe, grocery, or workout cards;
- charts, tables, and long coach messages;
- pricing/feature comparison;
- full-page backgrounds;
- danger and consent confirmations where contrast is critical.

When glass overlaps glass during a transition, the older layer must first resolve
to content or fade behind a scrim. Multiple unrelated floating glass capsules are
not a substitute for information architecture.

## Optical behavior

The web reference uses the `material.chrome` token. Implementations should:

- clip blur to the component shape;
- apply blur to content behind, not to children;
- use one subtle highlight border;
- keep tint saturation restrained;
- increase separation shadow when content scrolls beneath chrome;
- avoid animated refraction, noise, or cursor-following light in app workflows;
- render a solid color before blur is available to prevent a flash of unreadable
  content.

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
- generation progress or coach identity;
- data visualization where a legend remains explicit.

Gradients must not sit directly behind long text, input values, or charts. Do not
animate full-screen gradients continuously.

## Color application

Indigo identifies primary action and active navigation. Violet identifies coach
context, not every AI-generated string. Coral highlights energy or an item that
needs attention. Teal confirms completion or healthy system state. Warning and
danger colors retain their semantic meanings.

Tinting every control removes hierarchy. A screen should normally expose one
indigo primary action and no more than one competing coral action in the current
viewport.

## Accessibility and performance

- Text must be measured against the composited result, not merely the fill token.
- Reduced Transparency switches glass to `opaqueFallback` and removes background
  dependency.
- Increased Contrast uses high-contrast mode values, stronger borders, and no
  subtle tint-only selected state.
- Reduced Motion disables elastic deformation and material morphing.
- Low-end web devices may use opaque fallback based on capability testing.
- Backdrop blur must never be required for understanding hierarchy or state.
