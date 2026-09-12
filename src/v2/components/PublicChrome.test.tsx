import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { PublicHeader } from './PublicChrome'

afterEach(() => vi.unstubAllGlobals())

it('keeps mobile keyboard focus in navigation and restores scrolling on Escape', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  const { container } = render(<PublicHeader locale="en" />)
  const opener = screen.getByRole('button', { name: 'Open menu' })
  fireEvent.click(opener)
  expect(document.body.style.overflow).toBe('hidden')
  const brand = container.querySelector<HTMLAnchorElement>('.public-header__brand')!
  opener.focus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(brand).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  expect(opener).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(opener).toHaveAttribute('aria-expanded', 'false')
  expect(document.body.style.overflow).not.toBe('hidden')
  await waitFor(() => expect(opener).toHaveFocus())
})

it('dismisses the mobile overlay and unlocks scrolling when switching to desktop', () => {
  let change = () => {}
  const media = {
    matches: false,
    addEventListener: vi.fn((_event: string, listener: () => void) => { change = listener }),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  render(<PublicHeader locale="en" />)
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
  expect(document.body.style.overflow).toBe('hidden')
  act(() => { media.matches = true; change() })
  expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  expect(document.querySelector('.public-menu-backdrop')).toBeNull()
  expect(document.body.style.overflow).not.toBe('hidden')
  expect(media.removeEventListener).toHaveBeenCalled()
})
