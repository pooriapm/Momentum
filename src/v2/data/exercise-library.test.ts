import { describe, expect, it } from 'vitest'
import english from './exercise-guide-en.json'
import { ExerciseIndex, normalizeExerciseName, type ExerciseLibraryData } from './exercise-library'

const library: ExerciseLibraryData = {
  version: 1,
  categories: { kettlebell: 'کتل‌بل' },
  exercises: [
    { id: 'goblet-squat', fa: 'اسکات گابلت', en: 'Goblet squat', cat: 'kettlebell', muscles: 'ران، باسن', steps: ['الف'], anim: 'squat_goblet', eq: [], aka: ['گابلت اسکات'], tip: null },
    { id: 'lat-pulldown', fa: 'زیربغل سیم‌کش نشسته', en: 'Lat pulldown', cat: 'machine', muscles: 'زیربغل', steps: ['ب'], anim: null, eq: [], aka: [], tip: null },
  ],
}

describe('exercise library lookup', () => {
  const index = new ExerciseIndex(library)

  it('finds a catalog exercise by its slug', () => {
    expect(index.find('exercise:goblet-squat@v2', [])?.id).toBe('goblet-squat')
  })

  it('finds plan names written differently, in either language', () => {
    expect(index.find(undefined, ['كتل بل گابلت اسکات'])?.id).toBe('goblet-squat')
    expect(index.find(undefined, ['زیر بغل سیم کش'])?.id).toBe('lat-pulldown')
    expect(index.find('exercise:unknown@v2', ['', 'Goblet Squat'])?.id).toBe('goblet-squat')
    expect(index.find(undefined, ['پرس سینه'])).toBeUndefined()
  })

  it('normalizes Arabic letters, digits and half-spaces', () => {
    expect(normalizeExerciseName('سیم‌کش ۱۲ ي')).toBe('سیمکش12ی')
  })

  it('has English text for every guide', () => {
    const guides = Object.values(english as Record<string, { muscles: string; steps: string[] }>)
    expect(guides.length).toBeGreaterThan(300)
    expect(guides.every((guide) => guide.muscles && guide.steps.length && guide.steps.every(Boolean))).toBe(true)
  })
})
