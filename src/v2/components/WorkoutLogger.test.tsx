import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { WorkoutBlock } from '../data/types'
import { WorkoutLogger } from './WorkoutLogger'

const workout: WorkoutBlock = {
  id: 'plan-day-0', name: { fa: 'قدرت', en: 'Strength' }, focus: { fa: 'پا', en: 'Legs' },
  durationMinutes: 30, exercises: 1, exerciseItems: [{ fa: 'اسکوات', en: 'Squat' }], intensity: 'moderate',
  exerciseDetails: [{ key: 'squat', name: { fa: 'اسکوات', en: 'Squat' }, sets: 2, reps: '8', restSeconds: 90, substitution: null }],
}

describe('WorkoutLogger preview loop', () => {
  it('starts in memory and records a complete set', async () => {
    render(<WorkoutLogger enabled locale="en" localDate="2026-08-09" preview workout={workout} />)
    fireEvent.click(screen.getByRole('button', { name: /start workout/i }))
    const firstSet = screen.getByText('Set 1').closest('.workout-set-row')
    expect(firstSet).not.toBeNull()
    const controls = within(firstSet as HTMLElement)
    fireEvent.change(controls.getByLabelText('kg'), { target: { value: '42.5' } })
    fireEvent.change(controls.getByLabelText('reps'), { target: { value: '8' } })
    fireEvent.change(controls.getByLabelText('RPE'), { target: { value: '7.5' } })
    fireEvent.click(controls.getByRole('button', { name: /log set/i }))
    expect(await controls.findByRole('button', { name: /undo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete exercise/i })).toBeEnabled()
  })

  it('automatically stops on severe pain', async () => {
    render(<WorkoutLogger enabled locale="en" localDate="2026-08-09" preview workout={workout} />)
    fireEvent.click(screen.getByRole('button', { name: /start workout/i }))
    fireEvent.change(screen.getByLabelText('Pain area'), { target: { value: 'left knee' } })
    fireEvent.change(screen.getByLabelText('Severity 1–5'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: /log pain/i }))
    expect(await screen.findByText('Workout stopped')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /finish workout/i })).not.toBeInTheDocument()
  })
})

