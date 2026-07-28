import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MealSlot } from '../../types/domain'
import { MealOptionPicker } from './MealOptionPicker'

const meal: MealSlot = {
  id: 'lunch',
  type: 'lunch',
  title: 'ناهار',
  xp: 10,
  required: true,
  defaultOptionId: 'lunch-a',
  options: [
    {
      id: 'lunch-a',
      title: 'گزینه اول',
      ingredients: [{ name: 'ماده اول', amount: 1, unit: 'serving' }],
      nutrition: { calories: 500, protein: 35, carbs: 50, fat: 15 },
    },
    {
      id: 'lunch-b',
      title: 'گزینه دوم',
      ingredients: [{ name: 'ماده دوم', amount: 1, unit: 'serving' }],
      nutrition: { calories: 420, protein: 42, carbs: 40, fat: 12 },
    },
  ],
}

describe('MealOptionPicker', () => {
  it('shows every imported option and reports the selected one', () => {
    const onSelect = vi.fn()
    render(
      <MealOptionPicker
        meal={meal}
        onSelect={onSelect}
        selectedOptionId="lunch-a"
      />,
    )

    const firstOption = screen.getByRole('radio', { name: /گزینه اول/ })
    const secondOption = screen.getByRole('radio', { name: /گزینه دوم/ })

    expect(firstOption).toHaveAttribute('aria-checked', 'true')
    expect(secondOption).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(secondOption)
    expect(onSelect).toHaveBeenCalledWith('lunch-b')
  })

  it('locks selection after the meal is logged', () => {
    render(
      <MealOptionPicker
        disabled
        meal={meal}
        onSelect={vi.fn()}
        selectedOptionId="lunch-b"
      />,
    )

    expect(screen.getByRole('radio', { name: /گزینه اول/ })).toBeDisabled()
    expect(screen.getByText('در لاگ روزانه ثبت شده')).toBeInTheDocument()
  })
})
