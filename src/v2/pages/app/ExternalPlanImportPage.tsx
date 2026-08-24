import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clipboard, FileJson2, Import, LockKeyhole, ShieldCheck } from 'lucide-react'
import { type ChangeEvent, useMemo, useState } from 'react'
import { Link, useLocation } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { localizedPath } from '../../router/route-utils'
import { BrandLockup } from '../../ui/OrbitMark'
import { Button, ContentCard, PageSkeleton, StatusPill } from '../../ui/primitives'
import {
  buildExternalPlanPrompt,
  importExternalPlan,
  loadExternalPlanContext,
} from '../../external-plan/external-plan'
import './external-plan-import.css'

function parsePlan(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw)
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not_object')
  return value as Record<string, unknown>
}

export function ExternalPlanImportPage({ locale }: { locale: AppLocale }) {
  const fa = locale === 'fa'
  const [, navigate] = useLocation()
  const contextQuery = useQuery({ queryKey: ['external-plan-context'], queryFn: loadExternalPlanContext })
  const prompt = useMemo(() => contextQuery.data ? buildExternalPlanPrompt(contextQuery.data) : '', [contextQuery.data])
  const [disclosureAccepted, setDisclosureAccepted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [rawPlan, setRawPlan] = useState('')
  const [sourceKind, setSourceKind] = useState<'external_ai' | 'existing_plan'>('external_ai')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [complete, setComplete] = useState(false)
  const preview = useMemo(() => {
    if (!rawPlan.trim()) return null
    try {
      const plan = parsePlan(rawPlan)
      return {
        days: Array.isArray(plan.days) ? plan.days.length : 0,
        locale: String(plan.content_locale ?? ''),
        name: String(plan.plan_name ?? ''),
        plan,
      }
    } catch {
      return null
    }
  }, [rawPlan])

  async function copyPrompt() {
    if (!disclosureAccepted || !prompt) return
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError('')
    if (!file) return
    if (file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')) {
      setError(fa ? 'فقط فایل JSON پذیرفته می‌شود.' : 'Only a JSON file is accepted.')
      return
    }
    if (file.size > 1_500_000) {
      setError(fa ? 'فایل باید کوچک‌تر از ۱.۵ مگابایت باشد.' : 'The file must be smaller than 1.5 MB.')
      return
    }
    setRawPlan(await file.text())
  }

  async function savePlan() {
    setError('')
    if (!preview) {
      setError(fa ? 'فایل JSON معتبر انتخاب کن.' : 'Choose a valid JSON object first.')
      return
    }
    setSaving(true)
    try {
      await importExternalPlan(preview.plan, sourceKind)
      setComplete(true)
    } catch {
      setError(fa ? 'برنامه با قرارداد، کاتالوگ یا محدودیت‌های ایمنی Momentum سازگار نیست. فایل قبلی دست‌نخورده باقی ماند.' : 'The plan does not match Momentum’s contract, catalog, or safety rules. Your previous plan was left untouched.')
    } finally {
      setSaving(false)
    }
  }

  if (contextQuery.isLoading) return <PageSkeleton />

  return (
    <div className="external-plan-page" data-inventory="LIFE-21 LIFE-22 LIFE-23 LIFE-24">
      <header className="external-plan-header glass-chrome">
        <Link href={localizedPath(locale, '/app/today')}><BrandLockup compact /></Link>
        <span><LockKeyhole size={15} />{fa ? 'واردکردن امن برنامه' : 'Secure plan import'}</span>
      </header>
      <main>
        <div className="external-plan-heading">
          <StatusPill tone="energy">{fa ? 'رایگان برای همیشه' : 'Free forever'}</StatusPill>
          <h1>{fa ? 'برنامه‌ات را بساز و وارد کن' : 'Create and import your plan'}</h1>
          <p>{fa ? 'Momentum برای واردکردن، نگهداری و پیگیری این برنامه هزینه اشتراک نمی‌گیرد.' : 'Momentum does not require a subscription to import, store, and track this plan.'}</p>
        </div>

        {contextQuery.isError ? (
          <ContentCard><p>{fa ? 'اطلاعات امن برنامه آماده نشد. دوباره تلاش کن.' : 'Your secure plan context could not be prepared. Try again.'}</p><Button onClick={() => void contextQuery.refetch()}>{fa ? 'تلاش دوباره' : 'Retry'}</Button></ContentCard>
        ) : null}

        {contextQuery.data ? (
          <div className="external-plan-grid">
            <ContentCard className="external-plan-step">
              <span className="external-plan-step__number">1</span>
              <Clipboard size={26} />
              <h2>{fa ? 'پرامپت آماده را کپی کن' : 'Copy the ready prompt'}</h2>
              <p>{fa ? 'آن را در هر ابزار هوش مصنوعی سازگار که خودت انتخاب می‌کنی اجرا کن. Momentum هیچ درخواستی برای آن ابزار ارسال نمی‌کند.' : 'Run it in any compatible AI tool you choose. Momentum never sends a request to that tool.'}</p>
              <label className="external-plan-disclosure">
                <input checked={disclosureAccepted} onChange={(event) => setDisclosureAccepted(event.target.checked)} type="checkbox" />
                <span>{fa ? 'می‌دانم با کپی‌کردن، اطلاعات پروفایل و سلامت داخل پرامپت از Momentum خارج می‌شود و تابع سیاست حریم خصوصی ابزار انتخابی من است.' : 'I understand that copying moves profile and health information outside Momentum, where my chosen provider’s privacy policy applies.'}</span>
              </label>
              <Button disabled={!disclosureAccepted} onClick={() => void copyPrompt()}>{copied ? <CheckCircle2 size={18} /> : <Clipboard size={18} />}{copied ? (fa ? 'کپی شد' : 'Copied') : (fa ? 'کپی پرامپت' : 'Copy prompt')}</Button>
            </ContentCard>

            <ContentCard className="external-plan-step">
              <span className="external-plan-step__number">2</span>
              <FileJson2 size={26} />
              <h2>{fa ? 'فایل JSON را بررسی کن' : 'Preview the JSON file'}</h2>
              <div className="external-plan-source" role="radiogroup" aria-label={fa ? 'منبع برنامه' : 'Plan source'}>
                <button aria-pressed={sourceKind === 'external_ai'} onClick={() => setSourceKind('external_ai')} type="button">{fa ? 'ساخته‌شده با ابزار بیرونی' : 'Created with an external tool'}</button>
                <button aria-pressed={sourceKind === 'existing_plan'} onClick={() => setSourceKind('existing_plan')} type="button">{fa ? 'برنامه موجود' : 'Existing plan'}</button>
              </div>
              <label className="external-plan-file">
                <Import size={22} />
                <span>{fa ? 'انتخاب فایل JSON' : 'Choose JSON file'}</span>
                <input accept="application/json,.json" onChange={(event) => void readFile(event)} type="file" />
              </label>
              {rawPlan && !preview ? <div className="inline-notice inline-notice--error">{fa ? 'این فایل یک JSON object معتبر نیست.' : 'This file is not a valid JSON object.'}</div> : null}
              {preview ? (
                <div className="external-plan-preview">
                  <strong>{preview.name || (fa ? 'بدون نام' : 'Unnamed plan')}</strong>
                  <span>{preview.days} {fa ? 'روز' : 'days'} · {preview.locale || '—'}</span>
                  <small><ShieldCheck size={15} />{fa ? 'اعتبارسنجی نهایی کاتالوگ، آلرژی، واحدها و ایمنی روی سرور انجام می‌شود.' : 'Final catalog, allergen, unit, and safety validation happens on the server.'}</small>
                </div>
              ) : null}
              {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
              {!complete ? <Button disabled={!preview || saving} onClick={() => void savePlan()}>{saving ? (fa ? 'در حال بررسی…' : 'Validating…') : (fa ? 'بررسی و واردکردن' : 'Validate and import')}</Button> : null}
              {complete ? (
                <div className="external-plan-success" role="status">
                  <CheckCircle2 size={28} /><strong>{fa ? 'برنامه با موفقیت وارد شد' : 'Plan imported successfully'}</strong>
                  <p>{fa ? 'برنامه قبلی در تاریخچه حفظ شده است.' : 'Your previous plan remains preserved in history.'}</p>
                  <Button onClick={() => navigate(localizedPath(locale, '/app/today'))}>{fa ? 'رفتن به امروز' : 'Go to Today'}</Button>
                </div>
              ) : null}
            </ContentCard>
          </div>
        ) : null}
      </main>
    </div>
  )
}
