import { Check, ChevronDown, MapPin, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { countryName, sortedCountryCodes } from '../onboarding/countries'

interface CountryComboboxProps {
  defaultOpen?: boolean
  error?: string
  label: string
  locale: AppLocale
  onChange: (value: string) => void
  suggested?: boolean
  value: string
}

function countryFlag(code: string) {
  return code.replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
}

export function CountryCombobox({ defaultOpen = false, error, label, locale, onChange, suggested, value }: CountryComboboxProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [search, setSearch] = useState('')
  const fa = locale === 'fa'
  const results = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(fa ? 'fa' : 'en')
    const matches = sortedCountryCodes(locale).filter((code) => (
      !query
      || code.toLowerCase().includes(query)
      || countryName(code, locale).toLocaleLowerCase(fa ? 'fa' : 'en').includes(query)
    ))
    if (!value || !matches.includes(value)) return matches
    return [value, ...matches.filter((code) => code !== value)]
  }, [fa, locale, search, value])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function choose(code: string) {
    onChange(code)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className={`orbit-field country-combobox ${error ? 'orbit-field--error' : ''}`} ref={rootRef}>
      <label className="orbit-field__label" htmlFor={`${id}-search`}>{label}</label>
      <div className="country-combobox__control">
        <span>{open ? <Search size={18} /> : value ? countryFlag(value) : <MapPin size={18} />}</span>
        <input
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-expanded={open}
          autoComplete="off"
          id={`${id}-search`}
          onChange={(event) => { setSearch(event.target.value); setOpen(true) }}
          onFocus={() => { setSearch(''); setOpen(true) }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
            if (event.key === 'Enter' && results[0]) {
              event.preventDefault()
              choose(results[0])
            }
          }}
          placeholder={fa ? 'نام کشور را جست‌وجو کن…' : 'Search countries…'}
          role="combobox"
          value={open ? search : value ? countryName(value, locale) : ''}
        />
        <button aria-label={fa ? 'نمایش کشورها' : 'Show countries'} onClick={() => { setSearch(''); setOpen((current) => !current) }} type="button"><ChevronDown size={17} /></button>
      </div>
      {suggested && value ? <span className="country-combobox__hint"><MapPin size={13} />{fa ? 'پیشنهاد اولیه براساس موقعیت تقریبی شبکه؛ قابل تغییر است.' : 'Suggested from approximate network location; you can change it.'}</span> : null}
      {open ? (
        <div className="glass-menu country-combobox__menu">
          <div className="glass-menu__scroller" id={`${id}-listbox`} role="listbox">
            {results.length ? results.map((code) => (
              <button aria-selected={code === value} className={`glass-menu__item country-combobox__option ${code === value ? 'is-selected' : ''}`} key={code} onClick={() => choose(code)} role="option" type="button">
                <span>{countryFlag(code)}</span><strong>{countryName(code, locale)}</strong><small>{code}</small>{code === value ? <Check size={16} /> : null}
              </button>
            )) : <p>{fa ? 'کشوری با این عبارت پیدا نشد.' : 'No country matches your search.'}</p>}
          </div>
        </div>
      ) : null}
      {error ? <span className="orbit-field__error" role="alert">{error}</span> : null}
    </div>
  )
}
