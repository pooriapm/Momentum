import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MomentumLogo } from './MomentumLogo'

describe('MomentumLogo', () => {
  it('renders an accessible titled brand mark', () => {
    render(<MomentumLogo motion="splash" title="لوگوی Momentum" />)

    const logo = screen.getByRole('img', { name: 'لوگوی Momentum' })
    expect(logo).toHaveClass('momentum-logo--splash')
    expect(logo).toHaveAttribute('viewBox', '0 0 512 512')
  })

  it('stays decorative when no title is provided', () => {
    const { container } = render(<MomentumLogo motion="header" />)

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
