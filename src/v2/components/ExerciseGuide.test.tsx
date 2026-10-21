import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { WorkoutBlock } from '../data/types'
import { WorkoutDetailSheet } from './WorkoutDetailSheet'

vi.mock('../data/exercise-library', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/exercise-library')>()
  return {
    ...actual,
    loadExerciseLibrary: vi.fn(async () => new actual.ExerciseIndex({
      version: 1,
      categories: {},
      exercises: [{ id: 'goblet-squat', fa: 'اسکات گابلت', en: 'Goblet squat', cat: 'kettlebell', muscles: 'ران، باسن', steps: ['وزنه را جلوی سینه نگه دار.', 'پایین برو.'], anim: null, eq: [], aka: [], tip: 'کمر صاف بماند.' }],
    })),
    loadEnglishGuides: vi.fn(async () => ({ 'goblet-squat': { muscles: 'Thighs, Glutes', steps: ['Hold the weight at your chest.', 'Squat down.'], tip: 'Keep your back flat.' } })),
  }
})

const workout = {
  id: 'w',
  name: { fa: 'پایین‌تنه', en: 'Lower body' },
  focus: { fa: 'قدرت', en: 'Strength' },
  durationMinutes: 30,
  exercises: 2,
  exerciseItems: [],
  intensity: 'moderate',
  exerciseDetails: [
    { key: 'a', exerciseId: 'exercise:goblet-squat@v2', name: { fa: 'اسکات گابلت', en: 'Goblet squat' }, sets: 3, reps: '10', restSeconds: 60, substitution: null },
    { key: 'b', name: { fa: 'حرکت ناشناخته', en: 'Mystery move' }, sets: 2, reps: '8', restSeconds: 45, substitution: null },
  ],
} as WorkoutBlock

function renderSheet(locale: 'fa' | 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><WorkoutDetailSheet locale={locale} onClose={() => undefined} workout={workout} /></QueryClientProvider>)
}

describe('exercise guide in workout details', () => {
  it('opens the steps and tip in English', async () => {
    renderSheet('en')
    const [first] = screen.getAllByRole('button', { name: 'How to' })
    fireEvent.click(first!)
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(await screen.findByText('Hold the weight at your chest.')).toBeInTheDocument()
    expect(screen.getByText('Keep your back flat.')).toBeInTheDocument()
    expect(screen.getByText('Thighs, Glutes')).toBeInTheDocument()
  })

  it('uses the Persian library text and says when there is no guide', async () => {
    renderSheet('fa')
    const buttons = screen.getAllByRole('button', { name: 'آموزش' })
    fireEvent.click(buttons[0]!)
    expect(await screen.findByText('وزنه را جلوی سینه نگه دار.')).toBeInTheDocument()
    fireEvent.click(buttons[1]!)
    expect(await screen.findByText('برای این حرکت هنوز راهنمایی نداریم.')).toBeInTheDocument()
    expect(screen.queryByText('وزنه را جلوی سینه نگه دار.')).not.toBeInTheDocument()
  })
})

