import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ViewportPortal } from './ViewportPortal'

describe('ViewportPortal', () => {
  it('renders dialogs outside transformed page content and restores scrolling', () => {
    const { unmount } = render(
      <div data-testid="page-content" style={{ transform: 'translateY(0)' }}>
        <ViewportPortal>
          <div aria-label="پنجره آزمایشی" role="dialog" />
        </ViewportPortal>
      </div>,
    )

    const dialog = screen.getByRole('dialog', { name: 'پنجره آزمایشی' })

    expect(dialog.closest('[data-testid="page-content"]')).toBeNull()
    expect(dialog.parentElement).toBe(document.body)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.documentElement.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('')
    expect(document.documentElement.style.overflow).toBe('')
  })
})
