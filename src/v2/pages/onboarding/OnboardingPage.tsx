import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  HeartPulse,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  UploadCloud,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { sanitizeLocalizedNumberInput } from '../../../lib/numbers/localized-number'
import { loadAccountDashboard } from '../../data/repository'
import { localizedPath } from '../../router/route-utils'
import { Input, Select, Textarea } from '../../ui/FormControls'
import { BrandLockup } from '../../ui/OrbitMark'
import { Button, ContentCard, PageSkeleton, StatusPill } from '../../ui/primitives'
import {
  loadOnboardingDraft,
  analyzeBodyComposition,
  completeOnboarding,
  confirmBodyComposition,
  deleteOnboardingDraft,
  discardBodyReport,
  requestPlanGeneration,
  saveOnboardingDraft,
  updateBodyCompositionValues,
  uploadBodyReport,
} from '../../onboarding/repository'
import {
  isFieldVisible,
  onboardingDefaultValues,
  onboardingSections,
  type OnboardingField,
  type OnboardingStepKey,
  validateSection,
} from '../../onboarding/schema'
import { countryName, sortedCountryCodes } from '../../onboarding/countries'
import { useOnlineStatus } from '../../../platform/pwa/network'

interface OnboardingPageProps {
  locale: AppLocale
  step: OnboardingStepKey
}

interface ExtractedMetric {
  column: string
  confidence: number
  evidence: string | null
  key: string
  value: string
}

const bodyMetricSpecs = [
  { key: 'weight', column: 'weight_kg', fa: 'وزن', en: 'Weight', unit: 'kg' },
  { key: 'body_fat', column: 'body_fat_percent', fa: 'درصد چربی', en: 'Body fat', unit: '%' },
  { key: 'fat_mass', column: 'fat_mass_kg', fa: 'توده چربی', en: 'Fat mass', unit: 'kg' },
  { key: 'lean_mass', column: 'lean_mass_kg', fa: 'توده بدون چربی', en: 'Lean mass', unit: 'kg' },
  { key: 'skeletal_muscle_mass', column: 'skeletal_muscle_mass_kg', fa: 'عضله اسکلتی', en: 'Skeletal muscle', unit: 'kg' },
  { key: 'visceral_fat_rating', column: 'visceral_fat_rating', fa: 'چربی احشایی', en: 'Visceral fat', unit: 'score' },
  { key: 'waist', column: 'waist_cm', fa: 'دور کمر', en: 'Waist', unit: 'cm' },
  { key: 'basal_metabolic_rate', column: 'basal_metabolic_rate_kcal', fa: 'سوخت‌وساز پایه', en: 'Basal metabolism', unit: 'kcal/day' },
] as const

function canonicalMetricValue(value: number, unit: string | null) {
  if (unit === 'lb') return Math.round(value * 0.45359237 * 100) / 100
  if (unit === 'in') return Math.round(value * 2.54 * 100) / 100
  return value
}

export function OnboardingPage({ locale, step }: OnboardingPageProps) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [, navigate] = useLocation()
  const { user, status } = useAuth()
  const currentIndex = Math.max(0, onboardingSections.findIndex((section) => section.key === step))
  const section = onboardingSections[currentIndex]
  const [valueEdits, setValueEdits] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [pageNotice, setPageNotice] = useState('')
  const [report, setReport] = useState<File | null>(null)
  const [reportUploaded, setReportUploaded] = useState(false)
  const [bodyExtraction, setBodyExtraction] = useState<{ id: string; metrics: ExtractedMetric[] } | null>(null)
  const flowIdRef = useRef(crypto.randomUUID())

  const draftQuery = useQuery({
    queryKey: ['onboarding-draft', user?.id],
    queryFn: () => loadOnboardingDraft(user!.id),
    enabled: Boolean(user),
  })

  const values = useMemo(
    () => ({ ...onboardingDefaultValues, ...(draftQuery.data?.values ?? {}), ...valueEdits }),
    [draftQuery.data?.values, valueEdits],
  )
  const onboardingFlowId = values.onboardingFlowId || flowIdRef.current
  const missingPrerequisite = useMemo(
    () => onboardingSections
      .slice(0, currentIndex)
      .find((candidate) => Object.keys(validateSection(candidate, values, locale)).length > 0),
    [currentIndex, locale, values],
  )

  useEffect(() => {
    if (!draftQuery.isLoading && !draftQuery.isError && missingPrerequisite) {
      navigate(localizedPath(locale, `/onboarding/${missingPrerequisite.key}`), { replace: true })
    }
  }, [draftQuery.isError, draftQuery.isLoading, locale, missingPrerequisite, navigate])

  const safetyBlocked = useMemo(
    () =>
      values.adultConfirmed === 'no' ||
      values.pregnancyOrBreastfeeding === 'yes' ||
      values.eatingDisorderHistory === 'yes' ||
      values.highRiskCondition === 'yes',
    [values],
  )
  const regionBlocked = values.country === 'IR'
  const visibleFields = section.fields.filter((field) => isFieldVisible(field, values))

  if (status === 'loading' || draftQuery.isLoading) {
    return <PageSkeleton />
  }
  if (!user) {
    return (
      <main className="guard-page">
        <BrandLockup />
        <p>{t('auth.subtitle')}</p>
        <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-in')}>{t('common.signIn')}</Link>
      </main>
    )
  }
  if (draftQuery.isError) {
    return (
      <main className="guard-page">
        <BrandLockup />
        <p>{locale === 'fa' ? 'اطلاعات ذخیره‌شده خوانده نشد؛ برای جلوگیری از بازنویسی با فرم خالی، دوباره تلاش کن.' : 'Saved answers could not be loaded. Retry so an empty form never overwrites them.'}</p>
        <Button onClick={() => void draftQuery.refetch()}>{locale === 'fa' ? 'تلاش دوباره' : 'Retry'}</Button>
      </main>
    )
  }

  function updateValue(field: OnboardingField, value: string) {
    const nextValue = field.kind === 'number' ? sanitizeLocalizedNumberInput(value, field.step !== 1) : value
    setValueEdits((current) => ({ ...current, [field.key]: nextValue }))
    setErrors((current) => {
      const next = { ...current }
      delete next[field.key]
      return next
    })
  }

  async function persist(nextStep: OnboardingStepKey) {
    setSaving(true)
    setPageError('')
    setPageNotice('')
    try {
      await saveOnboardingDraft(user!.id, nextStep, {
        ...values,
        onboardingFlowId,
        locale: locale === 'fa' ? 'fa-IR' : 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      return true
    } catch {
      setPageError(locale === 'fa' ? 'ذخیره انجام نشد. اتصال را بررسی و دوباره تلاش کن.' : 'We could not save this section. Check your connection and try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function next() {
    const nextErrors = validateSection(section, values, locale)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    const nextStep = onboardingSections[Math.min(currentIndex + 1, onboardingSections.length - 1)].key
    if (await persist(nextStep)) {
      navigate(localizedPath(locale, `/onboarding/${nextStep}`))
    }
  }

  async function previous() {
    const previousStep = onboardingSections[Math.max(0, currentIndex - 1)].key
    if (await persist(previousStep)) {
      navigate(localizedPath(locale, `/onboarding/${previousStep}`))
    }
  }

  async function handleReportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPageError('')
    setReportUploaded(false)
    if (!file) return
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setPageError(locale === 'fa' ? 'فایل باید PDF، JPG، PNG یا WebP و کوچک‌تر از ۱۰ مگابایت باشد.' : 'Use a PDF, JPG, PNG, or WebP file under 10 MB.')
      return
    }
    setReport(file)
    setSaving(true)
    try {
      const uploaded = await uploadBodyReport(user!.id, file, values.bodyReportDate)
      const uploadedValues = {
        ...values,
        onboardingFlowId,
        bodyReportId: uploaded.id,
        bodyReportPath: uploaded.path,
        locale: locale === 'fa' ? 'fa-IR' : 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }
      try {
        await saveOnboardingDraft(user!.id, 'body', uploadedValues)
      } catch (error) {
        await discardBodyReport(uploaded.id, uploaded.path)
        throw error
      }
      setValueEdits((current) => ({ ...current, ...uploadedValues }))
      setReportUploaded(true)
    } catch {
      setPageError(locale === 'fa' ? 'آپلود گزارش انجام نشد. دوباره تلاش کن.' : 'The report could not be uploaded. Try again.')
      setReport(null)
    } finally {
      setSaving(false)
    }
  }

  async function generate() {
    setSaving(true)
    setPageError('')
    setPageNotice('')
    try {
      await saveOnboardingDraft(user!.id, 'review', {
        ...values,
        onboardingFlowId,
        locale: locale === 'fa' ? 'fa-IR' : 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      const completion = await completeOnboarding(`${onboardingFlowId}:complete`)
      if (completion.status === 'automation_blocked') {
        setPageError(locale === 'fa' ? 'اطلاعات حساب ذخیره شد، اما برنامه‌ریزی خودکار برای شرایط انتخاب‌شده مناسب نیست. می‌توانی Preview را ببینی یا با متخصص واجد شرایط گفتگو کنی.' : 'Your account was saved, but automated planning is not appropriate for the selected health context. You can view the preview or speak with a qualified professional.')
        return
      }
      const account = await loadAccountDashboard(locale)
      if (account.aiPlanAccess.state !== 'ready') {
        setPageError(aiAccessMessage(account.aiPlanAccess.state, locale))
        return
      }

      if (values.bodyReportId && !bodyExtraction) {
        const analysis = await analyzeBodyComposition(values.bodyReportId, `${onboardingFlowId}:body:${values.bodyReportId}`)
        const metrics = bodyMetricSpecs.flatMap((spec) => {
          const observation = analysis.extraction_result.measurements[spec.key]
          if (!observation || observation.value === null) return []
          return [{
            column: spec.column,
            confidence: observation.confidence,
            evidence: observation.evidence,
            key: spec.key,
            value: String(canonicalMetricValue(observation.value, observation.unit)),
          }]
        })
        if (metrics.length === 0) throw new Error('no_body_metrics')
        setBodyExtraction({ id: analysis.id, metrics })
        setPageNotice(locale === 'fa' ? 'مقادیر خوانا استخراج شد. لطفاً آن‌ها را بررسی و در صورت نیاز اصلاح کن؛ سپس تأیید و ساخت برنامه را بزن.' : 'Readable values were extracted. Review and correct them if needed, then confirm and generate your plan.')
        return
      }

      if (bodyExtraction) {
        const normalized = Object.fromEntries(bodyExtraction.metrics.map((metric) => {
          const value = Number(metric.value)
          if (!Number.isFinite(value) || value < 0) throw new Error('invalid_body_metric')
          return [metric.column, value]
        }))
        await updateBodyCompositionValues(bodyExtraction.id, normalized)
        await confirmBodyComposition(bodyExtraction.id, `${onboardingFlowId}:confirm:${bodyExtraction.id}`)
      }
      await requestPlanGeneration(locale, `${onboardingFlowId}:plan`)
      await deleteOnboardingDraft(user!.id)
      navigate(localizedPath(locale, '/app/today?generating=1'))
    } catch {
      setPageError(locale === 'fa' ? 'ساخت برنامه شروع نشد. چند لحظه دیگر دوباره تلاش کن.' : 'Generation could not start. Try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="onboarding-page">
      <header className="onboarding-header glass-chrome">
        <Link href={localizedPath(locale)}><BrandLockup compact /></Link>
        <span><LockKeyhole size={15} />{locale === 'fa' ? 'ذخیره‌ی امن در حساب' : 'Secure account storage'}</span>
      </header>
      <main className="onboarding-layout">
        <aside className="onboarding-sidebar">
          <p className="orbit-eyebrow"><Sparkles size={15} />Adaptive onboarding</p>
          <h1>{t('onboarding.title')}</h1>
          <p>{t('onboarding.subtitle')}</p>
          <ol>
            {onboardingSections.map((item, index) => (
              <li aria-current={index === currentIndex ? 'step' : undefined} className={index === currentIndex ? 'is-current' : index < currentIndex ? 'is-complete' : ''} key={item.key}>
                <span>{index < currentIndex ? <Check size={15} /> : index + 1}</span>
                <strong>{t(item.titleKey)}</strong>
              </li>
            ))}
          </ol>
        </aside>
        <ContentCard className="onboarding-card">
          <div className="onboarding-card__heading">
            <span>{String(currentIndex + 1).padStart(2, '0')} / {String(onboardingSections.length).padStart(2, '0')}</span>
            <h2>{t(section.titleKey)}</h2>
          </div>
          {visibleFields.length > 0 ? (
            <div className="onboarding-fields">
              {visibleFields.map((field) => (
                <DynamicField
                  error={errors[field.key]}
                  field={field}
                  key={field.key}
                  onChange={(value) => updateValue(field, value)}
                  value={values[field.key] ?? ''}
                />
              ))}
            </div>
          ) : null}
          {section.key === 'body' ? (
            <div className="body-upload-step">
              <span className="body-upload-step__icon"><UploadCloud size={31} /></span>
              <StatusPill tone="neutral">{t('onboarding.bodyOptional')}</StatusPill>
              <h3>{t('onboarding.upload')}</h3>
              <p>{t('onboarding.bodyCopy')}</p>
              <label className={`body-upload ${reportUploaded || values.bodyReportPath ? 'body-upload--success' : ''}`}>
                {reportUploaded || values.bodyReportPath ? <FileCheck2 size={22} /> : <UploadCloud size={22} />}
                <span>{reportUploaded || values.bodyReportPath ? (locale === 'fa' ? 'گزارش امن آپلود شد' : 'Report uploaded securely') : report?.name ?? t('onboarding.upload')}</span>
                <input accept=".pdf,image/jpeg,image/png,image/webp" disabled={saving || !online} onChange={handleReportChange} type="file" />
              </label>
              <small>{locale === 'fa' ? 'استخراج خودکار فقط مقادیر خوانا را پیشنهاد می‌دهد؛ قبل از استفاده باید تأییدشان کنی.' : 'Extraction only proposes clearly readable values; you must verify them before use.'}</small>
            </div>
          ) : null}
          {section.key === 'review' ? (
            <div className="onboarding-review">
              <span className="onboarding-review__mark"><Sparkles size={28} /></span>
              <h3>{t('onboarding.review')}</h3>
              <p>{t('onboarding.reviewCopy')}</p>
              <ReviewGrid locale={locale} values={values} />
              {bodyExtraction ? <BodyExtractionReview extraction={bodyExtraction} locale={locale} onChange={(key, value) => setBodyExtraction((current) => current ? { ...current, metrics: current.metrics.map((metric) => metric.key === key ? { ...metric, value: sanitizeLocalizedNumberInput(value, true) } : metric) } : current)} /> : null}
              {safetyBlocked ? <div className="inline-notice inline-notice--warning"><HeartPulse size={18} />{locale === 'fa' ? 'برای این شرایط، برنامه‌ریزی خودکار مناسب نیست. Momentum فقط اطلاعات عمومی ارائه می‌کند و پیشنهاد می‌کنیم با متخصص واجد شرایط صحبت کنی.' : 'Automated planning is not appropriate for the selected health context. Momentum will only provide general information and recommends a qualified professional.'}</div> : null}
              {regionBlocked ? <div className="inline-notice inline-notice--warning"><ShieldAlert size={18} />{t('onboarding.iranUnavailable')}</div> : null}
              <Button block disabled={!online} loading={saving} onClick={generate}>
                <Sparkles size={18} />{bodyExtraction ? (locale === 'fa' ? 'تأیید گزارش و ساخت برنامه' : 'Confirm report & generate') : t('onboarding.generate')}
              </Button>
              <Link className="orbit-button orbit-button--secondary orbit-button--block" href={localizedPath(locale, '/app/today?preview=1')}>{t('common.preview')}</Link>
            </div>
          ) : null}
          {pageNotice ? <div className="inline-notice inline-notice--success" role="status">{pageNotice}</div> : null}
          {pageError ? <div className="inline-notice inline-notice--error" role="alert">{pageError}</div> : null}
          {section.key !== 'review' ? (
            <div className="onboarding-actions">
              <Button disabled={currentIndex === 0 || !online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button>
              <Button disabled={!online} loading={saving} onClick={next}>{t('common.continue')}<ArrowRight className="directional-icon" size={18} /></Button>
            </div>
          ) : (
            <div className="onboarding-actions"><Button disabled={!online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button></div>
          )}
        </ContentCard>
      </main>
    </div>
  )
}

function DynamicField({ field, value, error, onChange }: { field: OnboardingField; value: string; error?: string; onChange: (value: string) => void }) {
  const { t, i18n } = useTranslation()
  const locale: AppLocale = i18n.resolvedLanguage === 'en' ? 'en' : 'fa'
  if (field.kind === 'select') {
    const options = field.optionSource === 'countries'
      ? sortedCountryCodes(locale).map((code) => ({ value: code, label: countryName(code, locale) }))
      : field.options?.map((option) => ({ value: option.value, label: t(option.labelKey) })) ?? []
    return (
      <Select error={error} label={t(field.labelKey)} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">—</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    )
  }
  if (field.kind === 'checkbox') {
    const policyPath = field.key === 'termsAccepted' ? '/terms' : '/privacy'
    return (
      <label className={`onboarding-checkbox ${error ? 'has-error' : ''}`}>
        <input checked={value === 'yes'} onChange={(event) => onChange(event.target.checked ? 'yes' : '')} type="checkbox" />
        <span><Check size={16} /></span>
        <strong>{t(field.labelKey)}</strong>
        <Link className="onboarding-checkbox__policy" href={localizedPath(locale, policyPath)} onClick={(event) => event.stopPropagation()} target="_blank">{locale === 'fa' ? 'مطالعه متن' : 'Read notice'}</Link>
        {error ? <small>{error}</small> : null}
      </label>
    )
  }
  if (field.kind === 'multiselect') {
    const selected = new Set(value.split(',').filter(Boolean))
    return (
      <fieldset className={`onboarding-multiselect ${error ? 'has-error' : ''}`}>
        <legend>{t(field.labelKey)}</legend>
        <div>
          {field.options?.map((option) => {
            const checked = selected.has(option.value)
            return (
              <label className={checked ? 'is-selected' : ''} key={option.value}>
                <input
                  checked={checked}
                  onChange={() => {
                    const next = new Set(selected)
                    if (checked) next.delete(option.value)
                    else next.add(option.value)
                    onChange([...next].sort().join(','))
                  }}
                  type="checkbox"
                />
                <span>{t(option.labelKey)}</span>
              </label>
            )
          })}
        </div>
        {error ? <small>{error}</small> : null}
      </fieldset>
    )
  }
  if (field.kind === 'textarea') {
    return <Textarea error={error} label={t(field.labelKey)} onChange={(event) => onChange(event.target.value)} rows={3} value={value} />
  }
  return (
    <Input
      error={error}
      inputMode={field.kind === 'number' ? 'decimal' : undefined}
      label={t(field.labelKey)}
      max={field.max}
      min={field.min}
      onChange={(event) => onChange(event.target.value)}
      required={field.required}
      step={field.step}
      type={field.kind === 'number' ? 'text' : field.kind}
      value={value}
    />
  )
}

function BodyExtractionReview({ extraction, locale, onChange }: { extraction: { metrics: ExtractedMetric[] }; locale: AppLocale; onChange: (key: string, value: string) => void }) {
  return (
    <section className="body-extraction-review" aria-labelledby="body-extraction-title">
      <div>
        <h4 id="body-extraction-title">{locale === 'fa' ? 'تأیید مقادیر گزارش' : 'Verify report values'}</h4>
        <p>{locale === 'fa' ? 'فقط داده‌هایی نمایش داده می‌شوند که از گزارش خوانده شده‌اند. مقدار اشتباه را قبل از تأیید اصلاح کن.' : 'Only values read from the report are shown. Correct any mistake before confirming.'}</p>
      </div>
      <div className="body-extraction-review__grid">
        {extraction.metrics.map((metric) => {
          const spec = bodyMetricSpecs.find((item) => item.key === metric.key)!
          return (
            <Input
              hint={`${spec.unit} · ${Math.round(metric.confidence * 100)}%${metric.evidence ? ` · ${metric.evidence}` : ''}`}
              inputMode="decimal"
              key={metric.key}
              label={locale === 'fa' ? spec.fa : spec.en}
              onChange={(event) => onChange(metric.key, event.target.value)}
              required
              type="text"
              value={metric.value}
            />
          )
        })}
      </div>
    </section>
  )
}

function aiAccessMessage(state: 'ready' | 'pending_verification' | 'region_blocked' | 'disabled' | 'safety_blocked', locale: AppLocale) {
  const fa = locale === 'fa'
  if (state === 'region_blocked') return fa ? 'حساب ذخیره شد. قابلیت AI برای این کشور صورتحساب فعلاً عرضه نمی‌شود؛ Preview در دسترس است.' : 'Your account was saved. AI is not currently offered for this billing country; preview remains available.'
  if (state === 'disabled') return fa ? 'حساب ذخیره شد. ساخت برنامه در این محیط فعلاً توسط اپراتور متوقف است.' : 'Your account was saved. Plan generation is currently disabled by the operator.'
  if (state === 'safety_blocked') return fa ? 'برای شرایط ثبت‌شده برنامه‌ریزی خودکار فعال نمی‌شود. با متخصص واجد شرایط گفتگو کن.' : 'Automated planning is not enabled for the recorded health context. Speak with a qualified professional.'
  return fa ? 'حساب ذخیره شد. کشور صورتحساب باید از مسیر قابل‌اعتماد تأیید شود؛ در نسخه آلفا این مرحله مدیریتی است.' : 'Your account was saved. Billing country must be verified through a trusted path; this is admin-only during alpha.'
}

function ReviewGrid({ locale, values }: { locale: AppLocale; values: Record<string, string> }) {
  const items = [
    [locale === 'fa' ? 'هدف' : 'Goal', values.goalType || '—'],
    [locale === 'fa' ? 'وزن فعلی' : 'Current weight', values.weightKg ? `${values.weightKg} kg` : '—'],
    [locale === 'fa' ? 'سبک غذایی' : 'Diet', values.dietStyle || '—'],
    [locale === 'fa' ? 'روز تمرین' : 'Training days', values.trainingDays || '0'],
    [locale === 'fa' ? 'گزارش بدن' : 'Body report', values.bodyReportPath ? '✓' : '—'],
    [locale === 'fa' ? 'منطقه' : 'Region', values.country || '—'],
  ]
  return <dl className="review-grid">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}
