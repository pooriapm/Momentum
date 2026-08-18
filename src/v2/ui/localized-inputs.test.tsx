import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CountryCombobox } from './CountryCombobox'
import { NumberStepper, Select } from './FormControls'
import { LocalizedDatePicker } from './LocalizedDatePicker'
import { LocalizedTimePicker } from './LocalizedTimePicker'
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

  it('opens a 24-hour glass time picker with hours and minutes only', () => {
    const onChange = vi.fn()
    render(<LocalizedTimePicker label="ساعت معمول شروع تمرین" locale="fa" onChange={onChange} value="18:30" />)

    expect(screen.getByText('۱۸:۳۰')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /ساعت معمول شروع تمرین/ }))
    expect(screen.getByRole('dialog', { name: 'انتخاب‌گر ساعت' })).toBeInTheDocument()
    expect(screen.queryByText('AM')).not.toBeInTheDocument()
    expect(screen.queryByText('PM')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: toPersianDigits('17') }))
    expect(onChange).toHaveBeenCalledWith('17:30')
    fireEvent.click(screen.getByRole('option', { name: toPersianDigits('45') }))
    expect(onChange).toHaveBeenCalledWith('17:45')
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

  it('steps an integer with plus and minus inside a closed range', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <NumberStepper
        decreaseLabel="Decrease"
        increaseLabel="Increase"
        label="Options per meal"
        locale="en"
        max={4}
        min={1}
        onChange={onChange}
        value="3"
      />,
    )

    const value = screen.getByRole('spinbutton', { name: 'Options per meal' })
    expect(value).toHaveAttribute('aria-valuenow', '3')
    expect(screen.queryByRole('textbox', { name: 'Options per meal' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onChange).toHaveBeenCalledWith('4')
    rerender(
      <NumberStepper
        decreaseLabel="Decrease"
        increaseLabel="Increase"
        label="Options per meal"
        locale="en"
        max={4}
        min={1}
        onChange={onChange}
        value="4"
      />,
    )
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(onChange).toHaveBeenCalledWith('3')
  })

  it('steps training days from zero up to seven', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <NumberStepper
        decreaseLabel="Decrease"
        fallback={0}
        increaseLabel="Increase"
        label="Training days per week"
        locale="en"
        max={7}
        min={0}
        onChange={onChange}
        value="0"
      />,
    )

    expect(screen.getByRole('spinbutton', { name: 'Training days per week' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onChange).toHaveBeenCalledWith('1')
    rerender(
      <NumberStepper
        decreaseLabel="Decrease"
        fallback={0}
        increaseLabel="Increase"
        label="Training days per week"
        locale="en"
        max={7}
        min={0}
        onChange={onChange}
        value="7"
      />,
    )
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
  })
})
