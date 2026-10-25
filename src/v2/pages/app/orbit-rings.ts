import type { WorkoutRunStatus } from './today-state'

// One ring per part of the day. A ring only draws an arc for a value it knows:
// unknown data stays visibly unknown instead of turning into zero.
export type OrbitRing =
  | { kind: 'value'; done: number; target: number }
  | { kind: 'rest' }
  | { kind: 'unknown' }

export function mealsRing(eaten: number, planned: number): OrbitRing {
  return planned > 0 ? { kind: 'value', done: eaten, target: planned } : { kind: 'unknown' }
}

export function workoutRing(hasWorkout: boolean, status: WorkoutRunStatus, known: boolean): OrbitRing {
  if (!hasWorkout) return { kind: 'rest' }
  if (!known) return { kind: 'unknown' }
  if (status === 'completed') return { kind: 'value', done: 1, target: 1 }
  if (status === 'in_progress' || status === 'paused') return { kind: 'value', done: 0.5, target: 1 }
  return { kind: 'value', done: 0, target: 1 }
}

export function waterRing(water: { goalMl: number; loggedMl: number } | undefined, loggedMl: number | null): OrbitRing {
  if (!water || water.goalMl <= 0 || loggedMl == null) return { kind: 'unknown' }
  return { kind: 'value', done: loggedMl, target: water.goalMl }
}
