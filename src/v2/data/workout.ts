import { z } from 'zod'
import { requireSupabase } from '../../platform/data/supabase'
import { assertOnline } from '../../platform/pwa/network'
import type { WorkoutBlock } from './types'

const workoutSetSchema = z.object({
  id: z.string().uuid(),
  set_number: z.number().int().min(1).max(20),
  status: z.enum(['planned', 'completed', 'skipped']),
  weight_kg: z.coerce.number().min(0).max(1000).nullable(),
  reps: z.number().int().min(0).max(1000).nullable(),
  rpe: z.coerce.number().min(1).max(10).nullable(),
  rest_seconds: z.number().int().min(0).max(3600).nullable(),
  completed_at: z.string().nullable(),
})

const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  exercise_key: z.string().min(1).max(120),
  exercise_id: z.string().nullable(),
  position: z.number().int().min(0),
  planned_name: z.string().min(1).max(160),
  planned_sets: z.number().int().min(1).max(20),
  planned_reps: z.string().min(1).max(40),
  planned_rest_seconds: z.number().int().min(0).max(3600),
  status: z.enum(['planned', 'in_progress', 'completed', 'skipped']),
  substitute_name: z.string().max(160).nullable(),
  planned_substitute_exercise_id: z.string().nullable(),
  substitute_exercise_id: z.string().nullable(),
  skip_reason: z.string().max(500).nullable(),
  notes: z.string().max(1000).nullable(),
  sets: z.array(workoutSetSchema).max(20),
})

export const workoutSessionSchema = z.object({
  id: z.string().uuid(),
  local_date: z.string(),
  workout_key: z.string().min(1).max(120),
  workout_title: z.string().min(1).max(160),
  status: z.enum(['in_progress', 'paused', 'completed', 'stopped']),
  started_at: z.string(),
  ended_at: z.string().nullable(),
  notes: z.string().max(2000).nullable(),
  pain_reported: z.boolean(),
  pain_area: z.string().max(160).nullable(),
  pain_severity: z.number().int().min(1).max(5).nullable(),
  stop_reason: z.string().max(1000).nullable(),
  exercises: z.array(workoutExerciseSchema).max(100),
})

export type WorkoutSession = z.infer<typeof workoutSessionSchema>

function parseSession(data: unknown) {
  return workoutSessionSchema.parse(data)
}

export function createPreviewWorkoutSession(workout: WorkoutBlock, localDate: string): WorkoutSession {
  return parseSession({
    id: crypto.randomUUID(),
    local_date: localDate,
    workout_key: workout.id,
    workout_title: workout.name.en,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    ended_at: null,
    notes: null,
    pain_reported: false,
    pain_area: null,
    pain_severity: null,
    stop_reason: null,
    exercises: workout.exerciseDetails.map((exercise, position) => ({
      id: crypto.randomUUID(),
      exercise_key: exercise.key,
      exercise_id: exercise.exerciseId ?? null,
      position,
      planned_name: exercise.name.en,
      planned_sets: exercise.sets,
      planned_reps: exercise.reps,
      planned_rest_seconds: exercise.restSeconds,
      status: 'planned',
      substitute_name: null,
      planned_substitute_exercise_id: exercise.substitutionExerciseId ?? null,
      substitute_exercise_id: null,
      skip_reason: null,
      notes: null,
      sets: Array.from({ length: exercise.sets }, (_, index) => ({
        id: crypto.randomUUID(), set_number: index + 1, status: 'planned',
        weight_kg: null, reps: null, rpe: null, rest_seconds: exercise.restSeconds,
        completed_at: null,
      })),
    })),
  })
}

export async function loadWorkoutSession(localDate: string, workoutKey: string) {
  const client = requireSupabase()
  const { data, error } = await client
    .from('workout_sessions')
    .select(`id,local_date,workout_key,workout_title,status,started_at,ended_at,notes,pain_reported,pain_area,pain_severity,stop_reason,
      exercises:workout_exercise_logs(id,exercise_key,exercise_id,position,planned_name,planned_sets,planned_reps,planned_rest_seconds,status,substitute_name,planned_substitute_exercise_id,substitute_exercise_id,skip_reason,notes,
        sets:workout_set_logs(id,set_number,status,weight_kg,reps,rpe,rest_seconds,completed_at))`)
    .eq('local_date', localDate)
    .eq('workout_key', workoutKey)
    .order('position', { referencedTable: 'workout_exercise_logs', ascending: true })
    .maybeSingle()
  if (error) throw error
  return data ? parseSession(data) : null
}

export async function startWorkoutSession(localDate: string, workoutKey: string) {
  assertOnline()
  const client = requireSupabase()
  const { data, error } = await client.rpc('start_workout_session', {
    p_local_date: localDate,
    p_workout_key: workoutKey,
  })
  if (error) throw error
  return parseSession(data)
}

export type WorkoutMutation =
  | { action: 'update_set'; exerciseKey: string; setNumber: number; values: { completed: boolean; weight_kg?: number | null; reps?: number | null; rpe?: number | null; rest_seconds?: number | null } }
  | { action: 'complete_exercise'; exerciseKey: string }
  | { action: 'skip_exercise'; exerciseKey: string; values: { reason: string } }
  | { action: 'substitute_exercise'; exerciseKey: string; values: { exercise_id?: string; name: string } }
  | { action: 'exercise_notes'; exerciseKey: string; values: { notes: string } }
  | { action: 'session_notes'; values: { notes: string } }
  | { action: 'report_pain'; values: { area: string; severity: number } }
  | { action: 'pause' }
  | { action: 'resume' }
  | { action: 'stop'; values: { reason: string } }
  | { action: 'finish' }

export async function mutateWorkoutSession(
  sessionId: string,
  mutation: WorkoutMutation,
  idempotencyKey: string = crypto.randomUUID(),
) {
  assertOnline()
  const exerciseKey = 'exerciseKey' in mutation ? mutation.exerciseKey : null
  const setNumber = 'setNumber' in mutation ? mutation.setNumber : null
  const values = 'values' in mutation ? mutation.values : {}
  const client = requireSupabase()
  const { data, error } = await client.rpc('mutate_workout_session', {
    p_session_id: sessionId,
    p_action: mutation.action,
    p_exercise_key: exerciseKey,
    p_set_number: setNumber,
    p_values: values,
    p_idempotency_key: idempotencyKey,
  })
  if (error) throw error
  return parseSession(data)
}
