export interface SpringState {
  position: number
  velocity: number
}

// Analytic damped spring: retargeting keeps both live position and velocity.
export function stepSpring(state: SpringState, target: number, seconds: number, damping = 1): SpringState {
  const omega = 2 * Math.PI / 0.34
  const offset = state.position - target
  const decay = Math.exp(-damping * omega * seconds)
  if (damping === 1) {
    const c = state.velocity + omega * offset
    return {
      position: target + (offset + c * seconds) * decay,
      velocity: (state.velocity - omega * c * seconds) * decay,
    }
  }
  const frequency = omega * Math.sqrt(1 - damping * damping)
  const c = (state.velocity + damping * omega * offset) / frequency
  const cosine = Math.cos(frequency * seconds)
  const sine = Math.sin(frequency * seconds)
  return {
    position: target + decay * (offset * cosine + c * sine),
    velocity: decay * ((c * frequency - damping * omega * offset) * cosine
      - (offset * frequency + damping * omega * c) * sine),
  }
}

export function rubberband(offset: number, dimension: number) {
  return offset * dimension * 0.55 / (dimension + 0.55 * Math.abs(offset))
}

export function shouldDismissSheet(position: number, velocity: number, height: number) {
  // An upward reversal always returns the sheet, even after a deep downward drag.
  if (velocity < -80) return false
  const projected = position + (velocity / 1000) * 0.998 / (1 - 0.998)
  return projected > height * 0.45
}

export function sampleVelocity(samples: Array<{ y: number; time: number }>, now: number) {
  const recent = samples.filter((sample) => now - sample.time <= 100)
  if (recent.length < 2) return 0
  const first = recent[0]
  const last = recent[recent.length - 1]
  return last.time > first.time ? (last.y - first.y) / (last.time - first.time) * 1000 : 0
}
