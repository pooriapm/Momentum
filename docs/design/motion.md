# Motion

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

Default easing is a smooth deceleration. Exit uses a faster acceleration.
Spring behavior is allowed for direct-manipulation release and one-shot coach
generation completion, never for text layout or repeated decoration.

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
- cursor/gyroscope-driven refraction in task screens;
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
- glass tint and shadow may change without morphing geometry;
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
