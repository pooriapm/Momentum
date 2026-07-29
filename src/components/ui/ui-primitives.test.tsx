import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Field, TextInput } from './FormField'
import { Surface } from './Surface'

describe('UI primitives', () => {
  it('keeps button semantics while applying a reusable variant', () => {
    render(<Button variant="highlight">ساخت پرامپت</Button>)

    const button = screen.getByRole('button', { name: 'ساخت پرامپت' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('--color-highlight')
  })

  it('connects field content and exposes validation errors', () => {
    render(
      <Field error="مقدار معتبر وارد کنید" label="وزن">
        <TextInput aria-label="وزن" hasError />
      </Field>,
    )

    expect(screen.getByRole('textbox', { name: 'وزن' }).className).toContain(
      '--color-danger',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('مقدار معتبر وارد کنید')
  })

  it('can render a semantic surface element', () => {
    render(
      <Surface as="section" variant="accent">
        محتوای بخش
      </Surface>,
    )

    expect(screen.getByText('محتوای بخش').tagName).toBe('SECTION')
  })
})
