import { Check, ChevronDown, MapPin, Search } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import { countryName, sortedCountryCodes } from '../onboarding/countries'
import { RequiredMark } from './FormControls'
import './country-combobox.css'

interface CountryComboboxProps {
  defaultOpen?: boolean
  error?: string
  label: string
  locale: AppLocale
  onChange: (value: string) => void
  required?: boolean
  suggested?: boolean
  value: string
}

function countryFlag(code: string) {
  return code.replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
}

export function CountryCombobox({ defaultOpen = false, error, label, locale, onChange, required, suggested, value }: CountryComboboxProps) {
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const activeOptionRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(defaultOpen ? 0 : -1)
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

  const activeResult = results[Math.max(0, Math.min(activeIndex, Math.max(0, results.length - 1)))]

  useLayoutEffect(() => {
    if (open) activeOptionRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [activeResult, open])

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
    setActiveIndex(0)
  }

  function closeAndReset() {
    setOpen(false)
    setSearch('')
    setActiveIndex(0)
  }

  return (
    <div
      className={`orbit-field country-combobox ${error ? 'orbit-field--error' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeAndReset()
      }}
      ref={rootRef}
    >
      <div className="orbit-field__label">
        <label htmlFor={`${id}-search`}>{label}</label>
        {required ? <RequiredMark /> : null}
      </div>
      <div className="country-combobox__control">
        <span>{open ? <Search size={18} /> : value ? countryFlag(value) : <MapPin size={18} />}</span>
        <input
          aria-autocomplete="list"
          aria-activedescendant={open && activeResult ? `${id}-option-${activeResult}` : undefined}
          aria-controls={`${id}-listbox`}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          autoComplete="off"
          id={`${id}-search`}
          onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); setOpen(true) }}
          onFocus={() => { setSearch(''); setActiveIndex(-1); setOpen(true) }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              closeAndReset()
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((current) => {
                if (!results.length) return 0
                const direction = event.key === 'ArrowDown' ? 1 : -1
                return (current + direction + results.length) % results.length
              })
            }
            if (event.key === 'Enter' && open && activeResult) {
              event.preventDefault()
              choose(activeResult)
            }
          }}
          placeholder={fa ? 'نام کشور را جست‌وجو کن…' : 'Search countries…'}
          role="combobox"
          value={open ? search : value ? countryName(value, locale) : ''}
        />
        <button aria-label={fa ? 'نمایش کشورها' : 'Show countries'} onClick={() => { setSearch(''); setActiveIndex(0); setOpen((current) => !current) }} type="button"><ChevronDown size={17} /></button>
      </div>
      {suggested && value ? <span className="country-combobox__hint"><MapPin size={13} />{fa ? 'پیشنهاد اولیه براساس موقعیت تقریبی شبکه؛ قابل تغییر است.' : 'Suggested from approximate network location; you can change it.'}</span> : null}
      {open ? (
        <div className="glass-menu country-combobox__menu">
          <div aria-label={fa ? 'کشورها' : 'Countries'} className="glass-menu__scroller" id={`${id}-listbox`} role="listbox">
            {results.length ? results.map((code) => (
              <button aria-selected={code === value} className={`glass-menu__item country-combobox__option ${code === value ? 'is-selected' : ''} ${code === activeResult ? 'is-active' : ''}`} id={`${id}-option-${code}`} key={code} onClick={() => choose(code)} onMouseEnter={() => setActiveIndex(results.indexOf(code))} ref={code === activeResult ? activeOptionRef : undefined} role="option" type="button">
                <span>{countryFlag(code)}</span><strong>{countryName(code, locale)}</strong><small>{code}</small>{code === value ? <Check size={16} /> : null}
              </button>
            )) : <p>{fa ? 'کشوری با این عبارت پیدا نشد.' : 'No country matches your search.'}</p>}
          </div>
        </div>
      ) : null}
      {error ? <span className="orbit-field__error" id={`${id}-error`} role="alert">{error}</span> : null}
    </div>
  )
}
