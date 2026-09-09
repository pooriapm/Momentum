import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ModalShell } from './ModalShell'
import { useModalDismiss } from './use-modal-dismiss'

function Fixture() {
  const [open, setOpen] = useState(false)
  const { modalRef, onClose } = useModalDismiss(() => setOpen(false))
  return <>
    <button onClick={() => setOpen(true)} type="button">Open dialog</button>
    {open ? (
      <ModalShell labelId="dialog-title" onClose={() => setOpen(false)} ref={modalRef}>
        <h2 id="dialog-title">Accessible dialog</h2>
        <button type="button">First action</button>
        <button onClick={onClose} type="button">Last action</button>
      </ModalShell>
    ) : null}
  </>
}

function setMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('ModalShell interaction contract', () => {
  it('traps focus, closes on Escape, and restores the opener with reduced motion', () => {
    setMotion(true)
    render(<Fixture />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Accessible dialog' })
    expect(dialog).toHaveFocus()
    const first = screen.getByRole('button', { name: 'Close sheet' })
    const last = screen.getByRole('button', { name: 'Last action' })
    last.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('keeps the background inert until an animated close finishes', () => {
    vi.useFakeTimers()
    setMotion(false)
    const { container } = render(<Fixture />)
    fireEvent.click(screen.getByText('Open dialog'))
    expect(container.inert).toBe(true)
    act(() => { vi.advanceTimersByTime(1000) })
    fireEvent.click(screen.getByText('Last action'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(container.inert).toBe(true)
    act(() => { vi.advanceTimersByTime(1500) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.inert).toBeFalsy()
  })

  it('does not close from a click inside the sheet', () => {
    setMotion(true)
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open dialog'))
    fireEvent.click(screen.getByText('First action'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(document.querySelector('.modal-backdrop')!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
