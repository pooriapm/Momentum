import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountryCombobox } from './CountryCombobox'
import { Select } from './FormControls'
import { LocalizedDatePicker } from './LocalizedDatePicker'
import { calendarParts, shiftIsoYears, todayIso } from './localized-date'
import { toPersianDigits } from '../../lib/dates/jalali'

describe('localized onboarding inputs', () => {
  it('renders a Jalali date in Persian while returning Gregorian ISO', () => {
    const onChange = vi.fn()
    render(<LocalizedDatePicker label="تاریخ تولد" locale="fa" onChange={onChange} purpose="birth" value="1990-03-21" />)

    expect(screen.getByText('۱ فروردین ۱۳۶۹')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /تاریخ تولد/ }))
    expect(screen.getByRole('dialog', { name: 'انتخاب‌گر تاریخ' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '۲ فروردین ۱۳۶۹' }))
    expect(onChange).toHaveBeenCalledWith('1990-03-22')
  })

  it('opens an out-of-range birth date at the nearest allowed year', () => {
    const maxBirthDate = shiftIsoYears(todayIso(), -18)
    const maxBirthYear = calendarParts(maxBirthDate, 'fa').year

    render(<LocalizedDatePicker label="تاریخ تولد" locale="fa" onChange={vi.fn()} purpose="birth" value={todayIso()} />)
    fireEvent.click(screen.getByRole('button', { name: /تاریخ تولد/ }))
    expect(screen.getByRole('combobox', { name: 'سال' })).toHaveTextContent(toPersianDigits(maxBirthYear))
    fireEvent.click(screen.getByRole('combobox', { name: 'سال' }))
    expect(screen.getByRole('option', { name: toPersianDigits(maxBirthYear) })).toBeInTheDocument()
    expect(screen.getAllByRole('option').length).toBeGreaterThan(20)
  })

  it('lists the full ISO country set when opened', () => {
    const { container } = render(<CountryCombobox label="Country" locale="en" onChange={vi.fn()} value="IR" />)

    fireEvent.focus(screen.getByRole('combobox', { name: 'Country' }))
    expect(container.querySelectorAll('[role="option"]').length).toBeGreaterThan(200)
    expect(screen.getByText('Iran')).toBeInTheDocument()
    expect(screen.getByText('Zimbabwe')).toBeInTheDocument()
  }, 15_000)

  it('searches localized countries and returns an ISO country code', () => {
    const onChange = vi.fn()
    render(<CountryCombobox label="Country" locale="en" onChange={onChange} value="IR" />)

    const input = screen.getByRole('combobox', { name: 'Country' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'United States' } })
    fireEvent.click(screen.getByRole('option', { name: /United States/ }))
    expect(onChange).toHaveBeenCalledWith('US')
  })

  it('opens a glass menu and returns the selected value', () => {
    const onChange = vi.fn()
    render(
      <Select label="Goal" onChange={onChange} value="fat_loss">
        <option value="fat_loss">Fat loss</option>
        <option value="muscle_gain">Muscle gain</option>
        <option value="maintenance">Maintain and improve performance</option>
      </Select>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Goal' }))
    fireEvent.click(screen.getByRole('option', { name: /Muscle gain/ }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'muscle_gain' } }))
  })

  it('does not list a blank dash placeholder among select options', () => {
    render(
      <Select defaultOpen label="Adult confirmation" onChange={vi.fn()} value="">
        <option value="">—</option>
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </Select>,
    )

    expect(screen.queryByRole('option', { name: '—' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '-' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['No', 'Yes'])
  })
})
