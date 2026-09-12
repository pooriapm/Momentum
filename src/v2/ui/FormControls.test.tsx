import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { Select } from './FormControls'

it('supports arrow navigation, skips disabled options, and returns focus on selection or Escape', () => {
  const onChange = vi.fn()
  render(<Select label="Location" value="home" onChange={onChange}>
    <option value="home">Home</option>
    <option value="gym" disabled>Gym</option>
    <option value="outdoor">Outdoors</option>
  </Select>)
  const trigger = screen.getByRole('combobox', { name: 'Location' })
  fireEvent.click(trigger)
  expect(screen.getByRole('option', { name: 'Home' })).toHaveFocus()
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' })
  const outdoors = screen.getByRole('option', { name: 'Outdoors' })
  expect(outdoors).toHaveFocus()
  fireEvent.click(outdoors)
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'outdoor' } }))
  expect(trigger).toHaveFocus()
  expect(trigger).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(trigger)
  fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})
