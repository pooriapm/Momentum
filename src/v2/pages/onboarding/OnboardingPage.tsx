import { useQuery } from '@tanstack/react-query'
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WalletCards,
  WifiOff,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { sanitizeLocalizedNumberInput } from '../../../lib/numbers/localized-number'
import { localizedPath } from '../../router/route-utils'
import { Input, Select, Textarea } from '../../ui/FormControls'
import { CountryCombobox } from '../../ui/CountryCombobox'
import { LocalizedDatePicker } from '../../ui/LocalizedDatePicker'
import { BrandLockup } from '../../ui/OrbitMark'
import { Button, ContentCard, PageSkeleton, StatusPill } from '../../ui/primitives'
import {
  loadOnboardingDraft,
  completeOnboarding,
  deleteOnboardingDraft,
  discardBodyReport,
  saveOnboardingDraft,
  uploadBodyReport,
} from '../../onboarding/repository'
import {
  isFieldVisible,
  onboardingDefaultValues,
  onboardingOptionLabelKey,
  onboardingSections,
  type OnboardingField,
  type OnboardingStepKey,
  UNMAPPED_ALLERGEN,
  validateSection,
  weekdayOptionsForLocale,
} from '../../onboarding/schema'
import {
  canVisitStep,
  earliestIncompleteStep,
  generationBlockedReason,
  healthScreeningOutcome,
  isHealthCollectingStopped,
  nextOnboardingStep,
  prepareCompletionValues,
  previousOnboardingStep,
} from '../../onboarding/onboarding-state'
import { countryName } from '../../onboarding/countries'
import { formatNumber } from '../../lib/format'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { loadPricingContext } from '../../data/pricing'
import './onboarding.css'

interface OnboardingPageProps {
  locale: AppLocale
  step: OnboardingStepKey
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
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle')
  const [reportName, setReportName] = useState('')
  const flowIdRef = useRef(crypto.randomUUID())
  const uploadCancelled = useRef(false)

  const draftQuery = useQuery({
    queryKey: ['onboarding-draft', user?.id],
    queryFn: () => loadOnboardingDraft(user!.id),
    enabled: Boolean(user),
  })

  const geoQuery = useQuery({
    queryKey: ['geo-context', 'onboarding-country'],
    queryFn: () => loadPricingContext(),
    enabled: Boolean(user),
    staleTime: 30 * 60 * 1000,
  })

  const values = useMemo<Record<string, string>>(
    () => ({
      ...onboardingDefaultValues,
      ...(draftQuery.data?.values ?? {}),
      ...valueEdits,
      country: valueEdits.country || draftQuery.data?.values?.country || geoQuery.data?.country || '',
    }),
    [draftQuery.data?.values, geoQuery.data?.country, valueEdits],
  )
  const countrySuggested = Boolean(geoQuery.data?.country && !draftQuery.data?.values?.country && !valueEdits.country)
  const onboardingFlowId = values.onboardingFlowId || flowIdRef.current
  const healthOutcome = healthScreeningOutcome(values)
  const blockedReason = generationBlockedReason(values, locale)
  const resumeStep = earliestIncompleteStep(values, locale)

  useEffect(() => {
    if (!draftQuery.isLoading && !draftQuery.isError && !canVisitStep(step, values, locale)) {
      navigate(localizedPath(locale, `/onboarding/${resumeStep}`), { replace: true })
    }
  }, [draftQuery.isError, draftQuery.isLoading, locale, navigate, resumeStep, step, values])

  const visibleFields = section.fields.filter((field) => {
    if (section.key === 'health' && isHealthCollectingStopped(values) && ['medications', 'medicalNotes', 'supplements'].includes(field.key) && !values[field.key]) {
      return false
    }
    return isFieldVisible(field, values)
  })

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
    setValueEdits((current) => {
      const next = { ...current, [field.key]: nextValue }
      if (field.key === 'trainingDurationPreset' && value !== 'custom') next.trainingDuration = value
      if (field.key === 'bodyFatPercent' || field.key === 'waistCm' || field.key === 'bodySource') next.bodySkipped = ''
      return next
    })
    setErrors((current) => {
      const next = { ...current }
      delete next[field.key]
      return next
    })
  }

  async function persist(nextStep: OnboardingStepKey, extra: Record<string, string> = {}) {
    setSaving(true)
    setPageError('')
    try {
      await saveOnboardingDraft(user!.id, nextStep, {
        ...values,
        ...extra,
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
    if (section.key === 'health' && isHealthCollectingStopped(values)) return
    const nextErrors = validateSection(section, values, locale)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    const nextStep = nextOnboardingStep(section.key)
    if (await persist(nextStep)) navigate(localizedPath(locale, `/onboarding/${nextStep}`))
  }

  async function previous() {
    const previousStep = previousOnboardingStep(section.key)
    if (await persist(previousStep)) navigate(localizedPath(locale, `/onboarding/${previousStep}`))
  }

  async function skipBody() {
    if (await persist('review', { bodySkipped: 'yes' })) {
      setValueEdits((current) => ({ ...current, bodySkipped: 'yes' }))
      navigate(localizedPath(locale, '/onboarding/review'))
    }
  }

  async function handleReportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setPageError('')
    setUploadState('idle')
    if (!file) return
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setUploadState('error')
      setPageError(locale === 'fa' ? 'فایل باید PDF، JPG، PNG یا WebP و کوچک‌تر از ۱۰ مگابایت باشد.' : 'Use a PDF, JPG, PNG, or WebP file under 10 MB.')
      return
    }
    uploadCancelled.current = false
    setReportName(file.name)
    setUploadState('uploading')
    setSaving(true)
    try {
      const uploaded = await uploadBodyReport(user!.id, file, values.bodyReportDate)
      if (uploadCancelled.current) {
        await discardBodyReport(uploaded.id, uploaded.path)
        setUploadState('idle')
        setReportName('')
        return
      }
      const uploadedValues = {
        bodyReportId: uploaded.id,
        bodyReportPath: uploaded.path,
        bodySource: 'report',
        bodySkipped: '',
      }
      try {
        await saveOnboardingDraft(user!.id, 'body', {
          ...values,
          ...uploadedValues,
          onboardingFlowId,
          locale: locale === 'fa' ? 'fa-IR' : 'en-US',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        })
      } catch (error) {
        await discardBodyReport(uploaded.id, uploaded.path)
        throw error
      }
      setValueEdits((current) => ({ ...current, ...uploadedValues }))
      setUploadState('success')
    } catch {
      setUploadState('error')
      setPageError(t('onboarding.uploadError'))
    } finally {
      setSaving(false)
    }
  }

  async function cancelUpload() {
    uploadCancelled.current = true
    setUploadState('idle')
    setReportName('')
    setSaving(false)
  }

  async function removeReport() {
    if (values.bodyReportId && values.bodyReportPath) {
      try {
        await discardBodyReport(values.bodyReportId, values.bodyReportPath)
      } catch {
        /* keep local values even if remote delete fails */
      }
    }
    setValueEdits((current) => ({ ...current, bodyReportId: '', bodyReportPath: '', bodySource: current.bodySource === 'report' ? 'manual' : current.bodySource }))
    setUploadState('idle')
    setReportName('')
    setPageError('')
  }

  async function finishSetup() {
    if (!online) {
      setPageError(t('onboarding.offlineReview'))
      return
    }
    setSaving(true)
    setPageError('')
    try {
      const payload = prepareCompletionValues({
        ...values,
        onboardingFlowId,
        locale: locale === 'fa' ? 'fa-IR' : 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      await saveOnboardingDraft(user!.id, 'review', payload)
      const completion = await completeOnboarding(`${onboardingFlowId}:complete`)
      if (completion.status === 'automation_blocked') {
        setPageError(blockedReason || (locale === 'fa'
          ? 'اطلاعات حساب ذخیره شد، اما برنامه‌ریزی خودکار برای شرایط انتخاب‌شده مناسب نیست.'
          : 'Your account was saved, but automated planning is not appropriate for the selected health context.'))
        return
      }
      await deleteOnboardingDraft(user!.id)
      navigate(localizedPath(locale, '/app/today'))
    } catch {
      setPageError(t('onboarding.saveConflict'))
    } finally {
      setSaving(false)
    }
  }

  const healthStopped = section.key === 'health' && isHealthCollectingStopped(values)
  const showContinue = section.key !== 'review' && !healthStopped

  return (
    <div className="onboarding-page">
      <header className="onboarding-header glass-chrome">
        <Link href={localizedPath(locale)}><BrandLockup compact /></Link>
        <span><LockKeyhole size={15} />{locale === 'fa' ? 'ذخیره‌ی امن در حساب' : 'Secure account storage'}</span>
      </header>
      <main className="onboarding-layout">
        <aside className="onboarding-sidebar">
          <p className="orbit-eyebrow"><Sparkles size={15} />{t('onboarding.setupEyebrow')}</p>
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
          {section.key === 'basics' ? <div className="inline-notice"><ShieldCheck size={18} />{t('onboarding.adultGateCopy')}</div> : null}
          {section.key === 'consent' ? <div className="inline-notice"><LockKeyhole size={18} />{locale === 'fa' ? 'هر رضایت مستقل و نسخه‌دار است. بازکردن یک سند دو مورد دیگر را تغییر نمی‌دهد.' : 'Each consent is independent and versioned. Opening one document never changes the other two.'}</div> : null}
          {section.key === 'food' ? <div className="inline-notice inline-notice--success"><ShieldCheck size={18} />{t('onboarding.allergenCopy')}</div> : null}
          {visibleFields.length > 0 ? (
            <div className="onboarding-fields">
              {visibleFields.map((field) => (
                <DynamicField
                  error={errors[field.key]}
                  field={field}
                  key={field.key}
                  locale={locale}
                  onChange={(value) => updateValue(field, value)}
                  suggested={field.key === 'country' && countrySuggested}
                  value={values[field.key] ?? ''}
                />
              ))}
            </div>
          ) : null}
          {section.key === 'health' ? <HealthOutcome outcome={healthOutcome} /> : null}
          {section.key === 'food' && values.allergies?.includes(UNMAPPED_ALLERGEN) ? (
            <div className="inline-notice inline-notice--warning" role="status">{t('onboarding.allergenOtherBlock')}</div>
          ) : null}
          {section.key === 'training' && values.trainingLocation === 'outdoor' ? (
            <div className="inline-notice">{t('onboarding.outdoorEquipmentHidden')}</div>
          ) : null}
          {section.key === 'training' && values.trainingLocation === 'home' ? (
            <div className="inline-notice">{t('onboarding.homeEquipmentHint')}</div>
          ) : null}
          {section.key === 'training' && values.trainingLocation === 'gym' ? (
            <div className="inline-notice">{t('onboarding.gymEquipmentHint')}</div>
          ) : null}
          {section.key === 'body' ? (
            <BodyStep
              locale={locale}
              onCancelUpload={() => void cancelUpload()}
              onRemove={() => void removeReport()}
              onReportChange={handleReportChange}
              onSkip={() => void skipBody()}
              online={online}
              reportName={reportName}
              saving={saving}
              skipped={values.bodySkipped === 'yes'}
              uploadState={values.bodyReportPath ? 'success' : uploadState}
            />
          ) : null}
          {section.key === 'review' ? (
            <div className="onboarding-review">
              <span className="onboarding-review__mark"><Sparkles size={28} /></span>
              <h3>{t('onboarding.review')}</h3>
              <p>{t('onboarding.reviewCopy')}</p>
              <ReviewGrid locale={locale} values={values} />
              <div className="inline-notice"><WalletCards size={18} />{t('onboarding.reviewPayment')}</div>
              <div className="inline-notice"><LockKeyhole size={18} />{t('onboarding.regionLocked')} · {t('onboarding.entitlementPending')}</div>
              {blockedReason ? <div className="inline-notice inline-notice--warning"><HeartPulse size={18} />{blockedReason}</div> : null}
              {!online ? <div className="inline-notice"><WifiOff size={18} />{t('onboarding.offlineReview')}</div> : null}
              <Button block disabled={!online} loading={saving} onClick={finishSetup}>{t('onboarding.reviewFinish')}</Button>
              <Link className="orbit-button orbit-button--secondary orbit-button--block" href={localizedPath(locale, '/pricing')}>{t('onboarding.paymentMethodLater')}</Link>
              <Link className="orbit-button orbit-button--ghost orbit-button--block" href={localizedPath(locale, '/app/today?preview=1')}>{t('common.preview')}</Link>
            </div>
          ) : null}
          {pageError ? <div className="inline-notice inline-notice--error" role="alert">{pageError}</div> : null}
          {healthStopped ? (
            <div className="onboarding-actions">
              <Button disabled={!online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button>
              <div className="onboarding-actions__stop">
                <Link className="orbit-button orbit-button--secondary" href={localizedPath(locale, '/app/today')}>{t('onboarding.saveAndExit')}</Link>
                <Link className="orbit-button orbit-button--danger" href={localizedPath(locale, '/safety')}>{t('onboarding.safetyGuidance')}</Link>
              </div>
            </div>
          ) : showContinue ? (
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

function HealthOutcome({ outcome }: { outcome: ReturnType<typeof healthScreeningOutcome> }) {
  const { t } = useTranslation()
  if (outcome === 'eligible') {
    return <div className="inline-notice inline-notice--success" role="status"><ShieldCheck size={18} /><span><strong>{t('onboarding.healthEligible')}</strong><br />{t('onboarding.healthEligibleCopy')}</span></div>
  }
  if (outcome === 'blocked') {
    return (
      <div className="onboarding-stop" role="alert">
        <AlertOctagon size={28} />
        <h3>{t('onboarding.healthBlocked')}</h3>
        <p>{t('onboarding.healthBlockedCopy')}</p>
        <p>{t('onboarding.noMedicalClaim')}</p>
      </div>
    )
  }
  if (outcome === 'urgent') {
    return (
      <div className="onboarding-stop onboarding-stop--urgent" role="alert">
        <AlertOctagon size={28} />
        <h3>{t('onboarding.healthUrgent')}</h3>
        <p>{t('onboarding.healthUrgentCopy')}</p>
      </div>
    )
  }
  return null
}

function BodyStep({
  locale,
  skipped,
  uploadState,
  reportName,
  saving,
  online,
  onReportChange,
  onSkip,
  onCancelUpload,
  onRemove,
}: {
  locale: AppLocale
  skipped: boolean
  uploadState: 'idle' | 'uploading' | 'error' | 'success'
  reportName: string
  saving: boolean
  online: boolean
  onReportChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSkip: () => void
  onCancelUpload: () => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="body-upload-step">
      <span className="body-upload-step__icon"><UploadCloud size={31} /></span>
      <StatusPill tone="neutral">{t('onboarding.bodyOptional')}</StatusPill>
      <h3>{t('onboarding.upload')}</h3>
      <p>{t('onboarding.bodyManualCopy')}</p>
      {skipped ? <div className="inline-notice">{t('onboarding.bodySkipConfirm')}</div> : null}
      {uploadState === 'uploading' ? (
        <div className="inline-notice" role="status">
          {t('onboarding.uploadProgress')}
          <Button onClick={onCancelUpload} variant="ghost">{t('onboarding.uploadCancel')}</Button>
        </div>
      ) : null}
      {uploadState === 'error' ? (
        <div className="inline-notice inline-notice--error" role="alert">
          {t('onboarding.uploadError')}
          <Button onClick={onRemove} variant="ghost">{t('onboarding.removeFile')}</Button>
        </div>
      ) : null}
      <label className={`body-upload ${uploadState === 'success' ? 'body-upload--success' : ''}`}>
        {uploadState === 'success' ? <FileCheck2 size={22} /> : <UploadCloud size={22} />}
        <span>{uploadState === 'success' ? (locale === 'fa' ? 'گزارش امن آپلود شد' : 'Report uploaded securely') : reportName || t('onboarding.upload')}</span>
        <input accept=".pdf,image/jpeg,image/png,image/webp" disabled={saving || !online || uploadState === 'uploading'} onChange={onReportChange} type="file" />
      </label>
      <small>{t('onboarding.noMedicalClaim')}</small>
      <div className="onboarding-body-actions">
        {uploadState === 'success' ? <Button onClick={onRemove} variant="ghost">{t('onboarding.removeFile')}</Button> : null}
        <Button onClick={onSkip} variant="secondary">{t('onboarding.skipConfirm')}</Button>
      </div>
    </div>
  )
}

function DynamicField({ field, value, error, onChange, suggested, locale }: { field: OnboardingField; value: string; error?: string; onChange: (value: string) => void; suggested?: boolean; locale: AppLocale }) {
  const { t } = useTranslation()
  if (field.kind === 'date') {
    return <LocalizedDatePicker error={error} label={t(field.labelKey)} locale={locale} onChange={onChange} purpose={field.key === 'birthDate' ? 'birth' : 'report'} value={value} />
  }
  if (field.optionSource === 'countries') {
    return <CountryCombobox error={error} label={t(field.labelKey)} locale={locale} onChange={onChange} suggested={suggested} value={value} />
  }
  if (field.kind === 'select') {
    const options = field.options?.map((option) => ({ value: option.value, label: t(option.labelKey) })) ?? []
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
        <small className="onboarding-checkbox__version">{t('onboarding.consentVersion')}</small>
        <Link className="onboarding-checkbox__policy" href={localizedPath(locale, policyPath)} onClick={(event) => event.stopPropagation()} target="_blank">{locale === 'fa' ? 'مطالعه متن' : 'Read notice'}</Link>
        {error ? <small>{error}</small> : null}
      </label>
    )
  }
  if (field.kind === 'multiselect') {
    const options = field.key === 'trainingWeekdays' ? weekdayOptionsForLocale(locale) : field.options
    const selected = new Set(value.split(',').filter(Boolean))
    return (
      <fieldset className={`onboarding-multiselect ${error ? 'has-error' : ''}`}>
        <legend>{t(field.labelKey)}</legend>
        <div>
          {options?.map((option) => {
            const checked = selected.has(option.value)
            const blocked = option.value === UNMAPPED_ALLERGEN && checked
            return (
              <label className={`${checked ? 'is-selected' : ''} ${blocked ? 'is-blocked' : ''}`} key={option.value}>
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

function ReviewGrid({ locale, values }: { locale: AppLocale; values: Record<string, string> }) {
  const { t } = useTranslation()
  const weight = Number(values.weightKg)

  function optionLabel(fieldKey: string, value: string) {
    if (!value) return '—'
    const labelKey = onboardingOptionLabelKey(fieldKey, value)
    return labelKey ? t(labelKey) : value
  }

  const items = [
    { step: 'goal' as const, label: locale === 'fa' ? 'هدف' : 'Goal', value: optionLabel('goalType', values.goalType) },
    { step: 'health' as const, label: locale === 'fa' ? 'سلامت' : 'Health', value: healthScreeningOutcome(values) === 'eligible' ? (locale === 'fa' ? 'مانع ایمنی ثبت نشده' : 'No safety block') : (locale === 'fa' ? 'نیاز به مسیر انسانی' : 'Human path required') },
    { step: 'food' as const, label: locale === 'fa' ? 'سبک غذایی' : 'Diet', value: optionLabel('dietStyle', values.dietStyle) },
    { step: 'training' as const, label: locale === 'fa' ? 'روز تمرین' : 'Training days', value: values.trainingDays ? formatNumber(Number(values.trainingDays), locale) : '0' },
    { step: 'body' as const, label: locale === 'fa' ? 'اطلاعات بدن' : 'Body', value: values.bodySkipped === 'yes' ? t('onboarding.skip') : values.bodyReportPath || values.bodyFatPercent || values.waistCm ? '✓' : '—' },
    { step: 'basics' as const, label: locale === 'fa' ? 'کشور' : 'Country', value: values.country ? countryName(values.country, locale) : '—' },
    { step: 'consent' as const, label: locale === 'fa' ? 'رضایت‌ها' : 'Consents', value: values.termsAccepted === 'yes' && values.privacyAccepted === 'yes' && values.healthDataConsent === 'yes' ? t('onboarding.consentVersion') : '—' },
    { step: 'basics' as const, label: locale === 'fa' ? 'وزن فعلی' : 'Current weight', value: Number.isFinite(weight) && values.weightKg ? `${formatNumber(weight, locale, { maximumFractionDigits: 1 })} ${locale === 'fa' ? 'کیلوگرم' : 'kg'}` : '—' },
  ]
  return (
    <dl className="review-grid">
      {items.map((item) => (
        <div key={`${item.step}-${item.label}`}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          <Link className="review-grid__edit" href={localizedPath(locale, `/onboarding/${item.step}`)}>{t('onboarding.editSection')}</Link>
        </div>
      ))}
    </dl>
  )
}
