import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { resources } from '../../platform/i18n/catalog'
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

  it('pauses and resumes without dropping progress', async () => {
    render(<WorkoutLogger enabled locale="en" localDate="2026-08-09" preview workout={workout} />)
    fireEvent.click(screen.getByRole('button', { name: /start workout/i }))
    const firstSet = screen.getByText('Set 1').closest('.workout-set-row')
    const controls = within(firstSet as HTMLElement)
    fireEvent.change(controls.getByLabelText('kg'), { target: { value: '40' } })
    fireEvent.change(controls.getByLabelText('reps'), { target: { value: '8' } })
    fireEvent.click(controls.getByRole('button', { name: /log set/i }))
    fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
    expect(screen.getByText(/workout is paused\. progress is kept/i)).toBeInTheDocument()
    expect(controls.getByRole('button', { name: /undo/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /^resume$/i }))
    expect(controls.getByRole('button', { name: /undo/i })).toBeEnabled()
  })

  it('offers adapt or stop after a non-urgent pain log', async () => {
    render(<WorkoutLogger enabled locale="en" localDate="2026-08-09" preview workout={workout} />)
    fireEvent.click(screen.getByRole('button', { name: /start workout/i }))
    fireEvent.change(screen.getByLabelText('Pain area'), { target: { value: 'right shoulder' } })
    fireEvent.change(screen.getByLabelText('Severity 1–5'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: /log pain/i }))
    expect(await screen.findByText(/momentum does not diagnose/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /continue with adaptation/i }))
    expect(screen.getByRole('button', { name: /finish workout/i })).toBeInTheDocument()
  })

  it('collects skip and stop reasons in a dialog instead of window.prompt', async () => {
    const prompt = vi.spyOn(window, 'prompt')
    const copy = resources.en.translation
    render(<WorkoutLogger enabled locale="en" localDate="2026-08-09" preview workout={workout} />)
    fireEvent.click(screen.getByRole('button', { name: /start workout/i }))
    const firstSet = screen.getByText('Set 1').closest('.workout-set-row')
    const controls = within(firstSet as HTMLElement)
    fireEvent.change(controls.getByLabelText('kg'), { target: { value: '40' } })
    fireEvent.change(controls.getByLabelText('reps'), { target: { value: '8' } })
    fireEvent.click(controls.getByRole('button', { name: /log set/i }))
    expect(await controls.findByRole('button', { name: /undo/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }))
    const skipDialog = document.querySelector('[role="dialog"]')
    expect(skipDialog).toBeInstanceOf(HTMLElement)
    expect(skipDialog).toHaveAttribute('aria-modal', 'true')
    expect(skipDialog).toHaveAttribute('aria-labelledby', 'workout-reason-title')
    expect(screen.getByText(copy.app.skipReasonTitle)).toBeInTheDocument()
    expect(within(skipDialog as HTMLElement).getByText(copy.app.skipReasonLabel)).toBeInTheDocument()
    expect((skipDialog as HTMLElement).querySelector('input')).toHaveClass('orbit-input')
    fireEvent.click(within(skipDialog as HTMLElement).getByText(copy.common.cancel).closest('button')!)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(controls.getByRole('button', { name: /undo/i })).toBeEnabled()
    expect(screen.getByText('Open')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /stop workout/i }))
    const stopDialog = document.querySelector('[role="dialog"]')
    expect(stopDialog).toBeInstanceOf(HTMLElement)
    expect(screen.getByText(copy.app.stopReasonTitle)).toBeInTheDocument()
    fireEvent.click(within(stopDialog as HTMLElement).getByText(copy.common.cancel).closest('button')!)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(screen.getByRole('button', { name: /stop workout/i })).toBeInTheDocument()
    expect(screen.queryByText('Workout stopped')).not.toBeInTheDocument()
    expect(prompt).not.toHaveBeenCalled()
    prompt.mockRestore()
  })
})

