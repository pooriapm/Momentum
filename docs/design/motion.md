# Motion

Version: 1.2

Status: includes founder-approved expressive Liquid Glass response

Motion communicates continuity, state, and causality. It must not be used to make
a waiting state feel artificially expensive or to keep the interface visually
busy.

## Tokens

| Token | Duration | Use |
| --- | ---: | --- |
| `instant` | 0ms | Reduced-motion replacement and immediate state |
| `fast` | 160ms | Hover, press, focus, small color/opacity change |
| `standard` | 240ms | Disclosure, tab indicator, local state change |
| `emphasis` | 400ms | Screen entry, accepted plan change, success |
| `slow` | 600ms | Rare initial generation illustration only |
| `glassPress` | 140ms | Contact onset: compression and localized optical response |
| `glassRelease` | 320ms | Settle after release or drag end |
| `glassMorph` | 420ms | Source-linked menu, popover, or compact-sheet morph |

Default easing is a smooth deceleration. Exit uses a faster acceleration.
Spring behavior is allowed for direct-manipulation release, source-linked glass
morphs, and one-shot monthly-plan generation completion, never for text layout
or repeated decoration. The glass calibration uses response `0.34` and damping
fraction `0.86`: responsive with no prolonged bounce. These are Momentum
cross-platform values, not Apple API constants.

## Liquid Glass response

Apple defines Liquid Glass as a material that reacts to touch and pointer input
and supports coordinated shape blending/morphing in a container. Momentum uses
that behavior to make functional chrome feel alive, while keeping all content
stable and readable. See [Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass),
[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views),
and [`GlassEffectContainer`](https://developer.apple.com/documentation/swiftui/glasseffectcontainer).

### Apple-approved animation catalog

These are the only Liquid Glass motions Momentum copies. They are causal, not
decorative. Native Apple platforms use system springs; web uses
`glassPress` / `glassRelease` / `glassMorph` with `glassResponse` 0.34 and
`glassDampingFraction` 0.86.

| Apple behavior | When it happens | Momentum mapping |
| --- | --- | --- |
| Interactive glass (`Glass.interactive`) | Press, pointer, or focus on a functional control | Localized highlight + ≤1.5% compression in `glassPress`; spring settle in `glassRelease` |
| Slider/toggle knob becomes glass | While the thumb is held | Thumb enlarges into Regular glass; optical response follows contact inside the control |
| Segmented selection lens | Selection changes | Glass capsule morphs to the selected segment with `glassMorph` |
| Button → menu/popover morph | A control opens its own menu | Source-linked `matchedGeometry` morph; close returns along the same path |
| `GlassEffectContainer` blend | Related glass shapes get closer than container spacing | Shapes merge; reverse spacing separates them |
| `materialize` transition | A distant glass control appears/disappears | Opacity + scale + brief materialize, not a flying leap |
| Inset half sheet | Temporary sheet opens | Sheet is inset so content peeks around it; enter uses `glassMorph` from the source or bottom edge |
| Sheet expand to opaque | Half sheet grows to full height | Material shifts toward Prominent/Fallback so the task stays readable |
| Action sheet from source | Contextual actions | Sheet originates at the control, not the display bottom |
| Tab bar minimize | Compact scroll-down | Floating tab bar recedes, insets, and hides labels; opposite scroll restores it |
| Compact top bar minimize | Compact scroll-down | Same causal pair as the dock: shorter pill, date cluster hides, trailing actions remain |
| Scroll edge effect | Content moves under chrome | Edge dim/blur strengthens; no full-screen distortion |
| Background extension | Sidebar/inspector over a hero | Adjacent content appears to continue under the glass rail |

Do not invent extra Liquid Glass motion. Idle shimmer, gyroscope refraction,
page-wide cursor tracking, and morphing unrelated surfaces are rejected by both
Apple's guidance and this contract.

### Press and release

- On contact, respond immediately; complete visible compression and the local
  highlight/refraction shift within `glassPress`.
- Geometry may compress to 98.5–99% around the contact point. Text, icon baselines,
  and hit-target bounds do not resize or drift.
- Deep Plum can briefly strengthen selection/prominence. Apricot can flash as a
  narrow energy highlight, but neither color sweeps continuously across the control.
- On release, the highlight returns to its stable optical edge and geometry
  settles within `glassRelease` using the glass spring.
- Keyboard activation receives the same causal state sequence without pretending
  to know a pointer location; the response originates from the control center.

### Drag and direct manipulation

- A slider/segmented thumb may become more glass-like while held and its localized
  optical response follows the contact point inside the control.
- The response stops at the control boundary and ends on release/cancel.
- Drag motion remains interruptible; reversal immediately follows the new input.
- Persistent content, values, and labels do not refract or wobble.

### Source-linked morph

- A button may morph into the menu, popover, or compact action sheet it directly
  opened; close returns toward that same source.
- The destination remains spatially anchored to its source. In Persian the
  logical direction mirrors, but the physical source position still wins.
- Related shapes may blend only within one coordinated glass container. Distant
  or unrelated surfaces use a standard transition instead of flying together.
- Use `glassMorph` as an upper target; direct manipulation may interrupt it.
- Penpot prototype frames document the source, midpoint, destination, and return.
  Storybook demonstrates the executable transition rather than only showing the
  first and last screenshots.

### Resting behavior

The material is stable when nobody interacts. No idle shimmer, autonomous light
sweep, breathing, gyroscope refraction, or page-wide pointer tracking is allowed.
Scroll-edge separation may adapt to content crossing beneath fixed chrome because
that change is directly caused by scrolling.

Compact AppChrome minimize is also causal: it tracks the **nearest scroll
parent**, not only `window`. Storybook device frames (`Screens/App` phone
stories) must use one inner scroller so minimize and sticky chrome can run.

## Patterns

### Navigation

Destination change uses a short opacity/translation transition while preserving
the user's spatial orientation. Direction is logical: movement toward a deeper
screen follows inline-end and return follows inline-start. The mapping mirrors in
RTL. Cross-fade is preferred when hierarchy is not directional.

### Disclosure

Accordion and progressive details animate height/opacity only when layout remains
stable. Focus never lands in content before it is exposed. Reduced Motion reveals
content immediately.

### Confirmation

Meal completion, check-in save, and accepted plan change may use a one-shot icon
draw/scale and localized haptic feedback. Motion finishes within `emphasis` and
does not replay on every render.

### AI generation

An indeterminate progress indicator and changing step label may remain active
while a job runs. Avoid fake percentages, spinning brand marks, full-screen
shimmer, or dramatic “thinking” animation. Users can leave and return.

Streaming text should appear in readable chunks. Token-by-token movement must
not continually shift the user's reading position.

### Loading

Skeleton shimmer is optional, low contrast, and limited to a single pass or a
subtle loop. A static placeholder is equally valid. Fast responses should render
directly without enforcing a minimum branded splash duration.

## Prohibited motion

- permanent icon breathing or floating;
- continuously rotating logo in normal navigation;
- cursor/gyroscope-driven refraction outside the active control, and any
  refraction that continues after interaction ends;
- parallax behind form fields or health data;
- confetti for weight loss, calorie deficit, or adherence;
- shake as the only error signal;
- layout movement caused by hover;
- animation that blocks input or delays data access;
- autoplay video with unmuted audio.

## Reduced Motion

When system or in-app Reduced Motion is active:

- durations resolve to `instant` except a brief opacity transition up to 100ms;
- spatial slide, scale, elastic, parallax, orbit, and shimmer are disabled;
- progress indicators remain understandable through label/state changes;
- success is represented by final icon/text state;
- glass uses a stable boundary plus an opacity/tint change up to 100ms; contact
  tracking, elastic compression, refraction travel, blending, and morphing are disabled;
- video/animated illustration requires explicit play.

The web honors `prefers-reduced-motion`. SwiftUI reads
`accessibilityReduceMotion`; Compose reads the relevant platform animator/accessibility
setting through the application motion policy. An account preference may request
less motion but must not override a stricter system setting.

## Performance

Prefer opacity and transform. Avoid animating blur radius, large shadows,
background position, or layout-critical dimensions on low-end hardware. Motion
must remain responsive under realistic dashboard content and concurrent AI
streaming.

No interaction should wait for animation completion before persisting its state.
If rendering drops frames, the implementation degrades to shorter opacity-only
transitions.

## Motion acceptance

- Record press/release, a direct-manipulation control, and one source-linked
  open/close transition in both Light and Dark.
- Verify the same sequences with Persian and English labels; motion direction is
  derived from source geometry and logical navigation, never hard-coded left/right.
- Repeat with Reduced Motion and Reduced Transparency; every state and action
  remains understandable without blur, refraction, compression, or morphing.
- Verify rapid press/cancel/reversal and route interruption. No ghost highlight,
  stuck pressed state, delayed persistence, or duplicated action is permitted.
- Profile the representative navigation and sheet sequence. If it cannot hold
  the product's performance target, use the defined opacity/fallback path.
