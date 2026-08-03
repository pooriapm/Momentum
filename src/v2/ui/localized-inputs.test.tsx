import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountryCombobox } from './CountryCombobox'
import { LocalizedDatePicker } from './LocalizedDatePicker'
import { calendarParts, shiftIsoYears, todayIso } from './localized-date'

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

    expect(screen.getByRole('combobox', { name: 'سال' })).toHaveValue(String(maxBirthYear))
  })

  it('searches localized countries and returns an ISO country code', () => {
    const onChange = vi.fn()
    render(<CountryCombobox label="Country" locale="en" onChange={onChange} value="IR" />)

    const input = screen.getByRole('combobox', { name: 'Country' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'United States' } })
    fireEvent.click(screen.getByRole('option', { name: /United States/ }))
    expect(onChange).toHaveBeenCalledWith('US')
  })
})
