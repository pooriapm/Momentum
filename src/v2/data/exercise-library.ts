import { strFromU8, unzipSync } from 'fflate'
import { z } from 'zod'
import { runtimeConfig } from '../../platform/config/runtime'

/**
 * The exercise library (steps, tips, animations) shared with the Android app. It lives in the
 * public exercise-media bucket: library.zip holds one JSON file, anim/<name>.zip one Lottie
 * animation. The library text is Persian; English text for the website comes from
 * exercise-guide-en.json, keyed by the same ids.
 */

const exerciseSchema = z.object({
  id: z.string(),
  fa: z.string(),
  en: z.string(),
  cat: z.string(),
  muscles: z.string(),
  steps: z.array(z.string()),
  anim: z.string().nullish(),
  eq: z.array(z.string()).default([]),
  aka: z.array(z.string()).default([]),
  tip: z.string().nullish(),
})
export type LibraryExercise = z.infer<typeof exerciseSchema>

const librarySchema = z.object({
  version: z.number(),
  categories: z.record(z.string(), z.string()).default({}),
  exercises: z.array(exerciseSchema).default([]),
})
export type ExerciseLibraryData = z.infer<typeof librarySchema>

export interface EnglishGuide { muscles: string; steps: string[]; tip?: string; eq?: string[] }
export type EnglishGuides = Record<string, EnglishGuide>

export function exerciseMediaUrl(path: string) {
  return `${runtimeConfig.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/exercise-media/v1/${path}`
}

async function fetchZip(path: string) {
  const response = await fetch(exerciseMediaUrl(path))
  if (!response.ok) throw new Error(`exercise media ${response.status}`)
  return unzipSync(new Uint8Array(await response.arrayBuffer()))
}

function firstJson(files: Record<string, Uint8Array>) {
  const name = Object.keys(files).find((file) => file.endsWith('.json'))
  if (!name) throw new Error('exercise media without json')
  return JSON.parse(strFromU8(files[name]!)) as unknown
}

export async function loadExerciseLibrary(): Promise<ExerciseIndex> {
  return new ExerciseIndex(librarySchema.parse(firstJson(await fetchZip('library.zip'))))
}

export async function loadExerciseAnimation(anim: string): Promise<unknown> {
  if (!/^[a-z0-9_-]+$/i.test(anim)) throw new Error('bad animation name')
  return firstJson(await fetchZip(`anim/${anim}.zip`))
}

export async function loadEnglishGuides(): Promise<EnglishGuides> {
  return (await import('./exercise-guide-en.json')).default as EnglishGuides
}

const CATALOG = /^exercise:([a-z0-9._-]+)@v\d+$/
const FILLER = new Set(['با', 'و', 'روی', 'از', 'در', 'به', 'حرکت', 'the', 'with', 'on', 'and'])

/** Lower case, Arabic letters as Persian, digits as ASCII, and no spaces, half-spaces or dashes. */
export function normalizeExerciseName(text: string) {
  let out = ''
  for (const ch of text.toLowerCase()) {
    if (ch === 'ي' || ch === 'ى') out += 'ی'
    else if (ch === 'ك') out += 'ک'
    else if (ch === 'ة') out += 'ه'
    else if (ch === 'أ' || ch === 'إ' || ch === 'آ') out += 'ا'
    else if (ch >= '۰' && ch <= '۹') out += String(ch.charCodeAt(0) - 0x06f0)
    else if (ch >= '٠' && ch <= '٩') out += String(ch.charCodeAt(0) - 0x0660)
    else if (' ‌‏-_.(),،/'.includes(ch)) continue
    else if (ch >= 'ً' && ch <= 'ْ') continue
    else out += ch
  }
  return out
}

function words(name: string) {
  return name
    .split(/[ ‌\-/،,]/)
    .filter((part) => part.trim() && !FILLER.has(part.toLowerCase()))
    .map(normalizeExerciseName)
    .filter((part) => part.length >= 2)
}

/** Lookup by catalog id or by name: plans from the AI name exercises in their own words. */
export class ExerciseIndex {
  private readonly byKey = new Map<string, LibraryExercise>()
  private readonly names: Array<[string[], LibraryExercise]> = []

  readonly data: ExerciseLibraryData

  constructor(data: ExerciseLibraryData) {
    this.data = data
    for (const exercise of data.exercises) {
      this.byKey.set(exercise.id, exercise)
      for (const name of [exercise.fa, exercise.en, ...exercise.aka]) {
        const key = normalizeExerciseName(name)
        if (key.length >= 3 && !this.byKey.has(key)) this.byKey.set(key, exercise)
        const parts = words(name)
        if (parts.length) this.names.push([parts, exercise])
      }
    }
  }

  find(exerciseKey: string | null | undefined, names: string[]): LibraryExercise | undefined {
    if (exerciseKey) {
      const slug = CATALOG.exec(exerciseKey)?.[1] ?? exerciseKey
      const hit = this.byKey.get(slug)
      if (hit) return hit
    }
    for (const name of names) {
      const found = this.findByName(name)
      if (found) return found
    }
    return undefined
  }

  category(key: string) {
    return this.data.categories[key]
  }

  private findByName(name: string) {
    const wanted = normalizeExerciseName(name)
    if (!wanted) return undefined
    const exact = this.byKey.get(wanted)
    if (exact) return exact
    // Word by word, in any order. Most of a name's words must appear; the name covering the
    // most letters wins, a complete one a little more.
    let best: LibraryExercise | undefined
    let bestScore = 0
    for (const [parts, exercise] of this.names) {
      let matched = 0
      let letters = 0
      for (const part of parts) if (wanted.includes(part)) { matched += 1; letters += part.length }
      if (letters < 4 || matched * 10 < parts.length * 6) continue
      const score = letters * 2 + (matched === parts.length ? 3 : 0)
      if (score > bestScore) { bestScore = score; best = exercise }
    }
    return best
  }
}
