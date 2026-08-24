import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { ModalShell } from './ModalShell'

function Fixture() {
  const [open, setOpen] = useState(false)
  return <>
    <button onClick={() => setOpen(true)} type="button">Open dialog</button>
    {open ? (
      <ModalShell labelId="dialog-title" onClose={() => setOpen(false)}>
        <h2 id="dialog-title">Accessible dialog</h2>
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </ModalShell>
    ) : null}
  </>
}

describe('ModalShell keyboard contract', () => {
  it('traps focus, closes on Escape, and restores the opener', () => {
    render(<Fixture />)
    const opener = screen.getByRole('button', { name: 'Open dialog' })
    opener.focus()
    fireEvent.click(opener)

    const dialog = screen.getByRole('dialog', { name: 'Accessible dialog' })
    expect(dialog).toHaveFocus()
    const first = screen.getByRole('button', { name: 'First action' })
    const last = screen.getByRole('button', { name: 'Last action' })
    last.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
})
