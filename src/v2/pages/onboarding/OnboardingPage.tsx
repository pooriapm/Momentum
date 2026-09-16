import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Check,
  FileCheck2,
  FileUp,
  Gift,
  HeartPulse,
  Import,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
  WifiOff,
} from 'lucide-react'
import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import {
  FALLBACK_LEGAL_DOCUMENT_VERSIONS,
  loadLegalDocumentVersions,
  type LegalDocumentVersions,
} from '../../../config/legal'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { sanitizeLocalizedNumberInput } from '../../../lib/numbers/localized-number'
import { localizedPath } from '../../router/route-utils'
import { loadPricingContext } from '../../data/pricing'
import { eventContext, trackProductEvent } from '../../analytics/events'
import { giftCampaignFromUnknown, postOnboardingPath, reviewInventoryIds } from '../../entitlement'
import { Input, NumberStepper, RequiredMark, Select, Textarea } from '../../ui/FormControls'
import { CountryCombobox } from '../../ui/CountryCombobox'
import { LocalizedDatePicker } from '../../ui/LocalizedDatePicker'
import { formatLocalizedDate } from '../../ui/localized-date'
import { LocalizedTimePicker } from '../../ui/LocalizedTimePicker'
import { BrandLockup } from '../../ui/OrbitMark'
import { FieldReveal } from '../../ui/FieldReveal'
import { Button, PageSkeleton, StatusPill } from '../../ui/primitives'
import {
  loadOnboardingDraft,
  completeOnboarding,
  discardBodyReport,
  saveOnboardingDraft,
  saveOnboardingBodyMeasurements,
  uploadBodyReport,
} from '../../onboarding/repository'
import {
  isFieldRequired,
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
  onboardingProgressPercent,
  prepareCompletionValues,
  previousOnboardingStep,
} from '../../onboarding/onboarding-state'
import { countryName } from '../../onboarding/countries'
import { formatNumber } from '../../lib/format'
import { useOnlineStatus } from '../../../platform/pwa/network'
import './onboarding.css'

interface OnboardingPageProps {
  locale: AppLocale
  step: OnboardingStepKey
}

export function OnboardingPage({ locale, step }: OnboardingPageProps) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [, navigate] = useLocation()
  const queryClient = useQueryClient()
  const { user, status } = useAuth()
  const currentIndex = Math.max(0, onboardingSections.findIndex((section) => section.key === step))
  const section = onboardingSections[currentIndex]
  const unsavedQueryKey = useMemo(() => ['onboarding-unsaved', user?.id, step] as const, [step, user?.id])
  const [valueEdits, setValueEdits] = useState<Record<string, string>>(
    () => queryClient.getQueryData<Record<string, string>>(unsavedQueryKey) ?? {},
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error' | 'success'>('idle')
  const [reportName, setReportName] = useState('')
  const flowIdRef = useRef(crypto.randomUUID())
  const unsavedIdentityRef = useRef(user ? `${user.id}:${step}` : '')
  const uploadCancelled = useRef(false)
  const activeUpload = useRef(0)
  const cardRef = useRef<HTMLDivElement>(null)

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

  const legalQuery = useQuery({
    queryKey: ['legal-document-versions'],
    queryFn: loadLegalDocumentVersions,
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK_LEGAL_DOCUMENT_VERSIONS,
  })
  const legalVersions = legalQuery.data ?? FALLBACK_LEGAL_DOCUMENT_VERSIONS

  const values = useMemo<Record<string, string>>(
    () => ({
      ...onboardingDefaultValues,
      ...(draftQuery.data?.values ?? {}),
      ...valueEdits,
      country: Object.prototype.hasOwnProperty.call(valueEdits, 'country')
        ? valueEdits.country
        : draftQuery.data?.values?.country || geoQuery.data?.country || '',
    }),
    [draftQuery.data?.values, geoQuery.data?.country, valueEdits],
  )
  const countrySuggested = Boolean(geoQuery.data?.country && !draftQuery.data?.values?.country && !valueEdits.country)
  const onboardingFlowId = values.onboardingFlowId || flowIdRef.current
  const healthOutcome = healthScreeningOutcome(values)
  const blockedReason = generationBlockedReason(values, locale)
  const resumeStep = earliestIncompleteStep(values, locale)

  useEffect(() => {
    if (!user) return
    const identity = `${user.id}:${step}`
    if (unsavedIdentityRef.current !== identity) {
      unsavedIdentityRef.current = identity
      setValueEdits(queryClient.getQueryData<Record<string, string>>(unsavedQueryKey) ?? {})
      return
    }
    queryClient.setQueryData(unsavedQueryKey, valueEdits)
  }, [queryClient, step, unsavedQueryKey, user, valueEdits])

  useEffect(() => {
    if (user && draftQuery.isSuccess && !canVisitStep(step, values, locale)) {
      navigate(localizedPath(locale, `/onboarding/${resumeStep}`), { replace: true })
    }
  }, [draftQuery.isSuccess, locale, navigate, resumeStep, step, user, values])

  const visibleFields = section.fields.filter((field) => {
    if (section.key === 'health' && isHealthCollectingStopped(values) && ['medications', 'medicalNotes', 'supplements'].includes(field.key)) {
      return false
    }
    return isFieldVisible(field, values)
  })

  if (status === 'loading' || draftQuery.isLoading) {
    return <PageSkeleton />
  }
  if (!user) {
    return (
      <main className="guard-page screen-enter">
        <BrandLockup />
        <p>{t('auth.subtitle')}</p>
        <Link className="orbit-button orbit-button--primary" href={localizedPath(locale, '/auth/sign-in')}>{t('common.signIn')}</Link>
      </main>
    )
  }
  if (draftQuery.isError) {
    return (
      <main className="guard-page screen-enter">
        <BrandLockup />
        <p>{locale === 'fa' ? 'اطلاعات ذخیره‌شده خوانده نشد؛ برای جلوگیری از بازنویسی با فرم خالی، دوباره تلاش کن.' : 'Saved answers could not be loaded. Retry so an empty form never overwrites them.'}</p>
        <Button onClick={() => void draftQuery.refetch()}>{locale === 'fa' ? 'تلاش دوباره' : 'Retry'}</Button>
      </main>
    )
  }

  function updateValue(field: OnboardingField, value: string) {
    const nextValue = field.kind === 'number' ? sanitizeLocalizedNumberInput(value, field.step !== 1, field.maxDigits) : value
    const changes: Record<string, string> = { [field.key]: nextValue }
    if (field.key === 'trainingDurationPreset' && value !== 'custom') changes.trainingDuration = value
    if (field.key === 'bodyFatPercent' || field.key === 'waistCm' || field.key === 'bodySource') changes.bodySkipped = ''
    setValueEdits((current) => ({ ...current, ...changes }))
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
      const savedValues = {
        ...values,
        ...extra,
        onboardingFlowId,
        locale: locale === 'fa' ? 'fa-IR' : 'en-US',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      }
      await saveOnboardingDraft(user!.id, nextStep, savedValues)
      queryClient.setQueryData(['onboarding-draft', user!.id], { currentStep: nextStep, values: savedValues })
      queryClient.removeQueries({ queryKey: unsavedQueryKey, exact: true })
      return true
    } catch {
      setPageError(locale === 'fa' ? 'ذخیره انجام نشد. اتصال را بررسی و دوباره تلاش کن.' : 'We could not save this section. Check your connection and try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function next() {
    if (saving || !online) return
    if (section.key === 'health' && isHealthCollectingStopped(values)) return
    const nextErrors = validateSection(section, values, locale)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      window.requestAnimationFrame(() => cardRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .has-error input')?.focus())
      return
    }
    const nextStep = nextOnboardingStep(section.key)
    if (await persist(nextStep)) navigate(localizedPath(locale, `/onboarding/${nextStep}`))
  }

  async function previous() {
    if (saving || !online) return
    const previousStep = previousOnboardingStep(section.key)
    if (await persist(previousStep)) navigate(localizedPath(locale, `/onboarding/${previousStep}`))
  }

  async function skipBody() {
    if (saving || !online) return
    if (await persist('review', { bodySkipped: 'yes' })) {
      setValueEdits((current) => ({ ...current, bodySkipped: 'yes' }))
      navigate(localizedPath(locale, '/onboarding/review'))
    }
  }

  async function handleReportChange(event: ChangeEvent<HTMLInputElement>) {
    if (saving || !online) return
    const file = event.target.files?.[0]
    setPageError('')
    setUploadState('idle')
    if (!file) return
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setUploadState('error')
      setPageError(locale === 'fa' ? 'فایل باید PDF، JPG، PNG یا WebP و کوچک‌تر از ۱۰ مگابایت باشد.' : 'Use a PDF, JPG, PNG, or WebP file under 10 MB.')
      return
    }
    const uploadToken = activeUpload.current + 1
    activeUpload.current = uploadToken
    uploadCancelled.current = false
    setReportName(file.name)
    setUploadState('uploading')
    setSaving(true)
    try {
      const uploaded = await uploadBodyReport(user!.id, file, values.bodyReportDate)
      if (uploadCancelled.current || activeUpload.current !== uploadToken) {
        await discardBodyReport(user!.id, uploaded.id, uploaded.path)
        setUploadState('idle')
        setReportName('')
        return
      }
      const previousReport = values.bodyReportId && values.bodyReportPath
        ? { id: values.bodyReportId, path: values.bodyReportPath }
        : null
      const uploadedValues = {
        bodyReportId: uploaded.id,
        bodyReportPath: uploaded.path,
        bodySource: 'report',
        bodySkipped: '',
      }
      try {
        const savedValues = {
          ...values,
          ...uploadedValues,
          onboardingFlowId,
          locale: locale === 'fa' ? 'fa-IR' : 'en-US',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        }
        await saveOnboardingDraft(user!.id, 'body', savedValues)
        queryClient.setQueryData(['onboarding-draft', user!.id], { currentStep: 'body', values: savedValues })
      } catch (error) {
        await discardBodyReport(user!.id, uploaded.id, uploaded.path)
        throw error
      }
      setValueEdits((current) => ({ ...current, ...uploadedValues }))
      setUploadState('success')
      if (previousReport && previousReport.id !== uploaded.id) {
        try {
          await discardBodyReport(user!.id, previousReport.id, previousReport.path)
        } catch {
          setPageError(locale === 'fa'
            ? 'گزارش جدید ذخیره شد، اما پاک‌سازی فایل قبلی تأیید نشد. بعداً دوباره تلاش کن.'
            : 'The new report was saved, but cleanup of the previous file could not be confirmed. Try again later.')
        }
      }
    } catch {
      setUploadState('error')
      setPageError(t('onboarding.uploadError'))
    } finally {
      if (activeUpload.current === uploadToken) setSaving(false)
    }
  }

  async function cancelUpload() {
    uploadCancelled.current = true
  }

  async function removeReport() {
    if (saving || !online) return
    setSaving(true)
    setPageError('')
    const clearedValues = {
      ...values,
      bodyReportId: '',
      bodyReportPath: '',
      bodySource: values.bodySource === 'report' ? 'manual' : values.bodySource,
    }
    if (values.bodyReportId && values.bodyReportPath) {
      try {
        await saveOnboardingDraft(user!.id, 'body', clearedValues)
        await discardBodyReport(user!.id, values.bodyReportId, values.bodyReportPath)
      } catch {
        await saveOnboardingDraft(user!.id, 'body', values).catch(() => undefined)
        setPageError(locale === 'fa'
          ? 'حذف فایل تأیید نشد. مرجع آن برای تلاش دوباره حفظ شده است؛ ممکن است فایل از فضای ذخیره‌سازی پاک شده باشد. اتصال را بررسی و دوباره تلاش کن.'
          : 'File removal could not be confirmed. Its reference was kept for retry; the stored file may already be gone. Check your connection and try again.')
        setSaving(false)
        return
      }
    }
    queryClient.setQueryData(['onboarding-draft', user!.id], { currentStep: 'body', values: clearedValues })
    setValueEdits((current) => ({ ...current, bodyReportId: '', bodyReportPath: '', bodySource: clearedValues.bodySource }))
    setUploadState('idle')
    setReportName('')
    setPageError('')
    setSaving(false)
  }

  async function saveAndExitHealth() {
    if (saving || !online) return
    if (await persist('health')) navigate(localizedPath(locale, '/app/today'))
  }

  async function finishSetup() {
    if (saving || !online) {
      setPageError(t('onboarding.offlineReview'))
      return
    }
    const completionErrors = onboardingSections.reduce<Record<string, string>>((all, item) => {
      if (item.key === 'body' && values.bodySkipped === 'yes') return all
      return { ...all, ...validateSection(item, values, locale) }
    }, {})
    if (Object.keys(completionErrors).length > 0) {
      setPageError(locale === 'fa' ? 'بعضی پاسخ‌های ضروری کامل نیستند. با پیوندهای ویرایش آن‌ها را بررسی کن.' : 'Some required answers are incomplete. Review them with the edit links below.')
      return
    }
    if (blockedReason) {
      setPageError(blockedReason)
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
      queryClient.setQueryData(['onboarding-draft', user!.id], { currentStep: 'review', values: payload })
      queryClient.removeQueries({ queryKey: unsavedQueryKey, exact: true })
      try {
        await saveOnboardingBodyMeasurements(user!.id, onboardingFlowId, values)
      } catch {
        setPageError(locale === 'fa'
          ? 'اندازه‌های بدن ذخیره نشدند. اتصال را بررسی کن و دوباره تأیید کن؛ تکمیل حساب انجام نشده است.'
          : 'Your body measurements could not be saved. Check your connection and confirm again; setup was not completed.')
        return
      }
      const completion = await completeOnboarding(`${onboardingFlowId}:complete:${completionFingerprint(payload)}`)
      if (completion.status === 'automation_blocked') {
        setPageError(blockedReason || (locale === 'fa'
          ? 'اطلاعات حساب ذخیره شد، اما برنامه‌ریزی خودکار برای شرایط انتخاب‌شده مناسب نیست.'
          : 'Your account was saved, but automated planning is not appropriate for the selected health context.'))
        return
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['active-plan'] }),
        queryClient.invalidateQueries({ queryKey: ['external-plan-context'] }),
      ])
      trackProductEvent({ ...eventContext(locale, productRegion, values.planSource === 'external' ? 'external' : 'momentum'), event_name: 'onboarding_completed', surface: 'onboarding', action_kind: null, outcome: 'completed' })
      if (values.planSource === 'external') {
        navigate(localizedPath(locale, '/app/import-plan'))
      } else {
        navigate(postOnboardingPath(locale))
      }
    } catch {
      setPageError(t('onboarding.saveConflict'))
    } finally {
      setSaving(false)
    }
  }

  const healthStopped = section.key === 'health' && isHealthCollectingStopped(values)
  const showContinue = section.key !== 'review' && !healthStopped
  const planSourceMissing = section.key === 'plan-source' && !values.planSource
  const productRegion = values.country
    ? values.country === 'IR' ? 'ir' : 'intl'
    : geoQuery.data?.suggested_product_region
  const giftCampaign = giftCampaignFromUnknown(geoQuery.data?.gift_campaign?.status)
  const reviewIds = reviewInventoryIds({
    automationBlocked: Boolean(blockedReason),
    giftCampaign,
    membership: 'none',
    productRegion,
  })

  return (
    <div className="onboarding-page screen-enter">
      <header className="onboarding-header glass-chrome">
        <Link href={localizedPath(locale)}><BrandLockup compact /></Link>
        <span><LockKeyhole size={15} />{locale === 'fa' ? 'ذخیره‌ی امن در حساب' : 'Secure account storage'}</span>
      </header>
      <main className="onboarding-layout">
        <aside className="onboarding-sidebar">
          <p className="orbit-eyebrow"><Sparkles size={15} />{t('onboarding.setupEyebrow')}</p>
          <h1>{t('onboarding.title')}</h1>
          <p>{t('onboarding.subtitle')}</p>
          <OnboardingProgress locale={locale} percent={onboardingProgressPercent(step)} title={t(section.titleKey)} />
        </aside>
        <div className="content-card onboarding-card" ref={cardRef}>
          <div className="onboarding-card__heading">
            <h2>{t(section.titleKey)}</h2>
          </div>
          {!online && section.key !== 'review' ? <div className="inline-notice inline-notice--warning" role="status"><WifiOff size={18} />{locale === 'fa' ? 'آفلاین هستید. پاسخ‌هایتان در این صفحه باقی می‌ماند؛ برای ذخیره و ادامه دوباره وصل شوید.' : 'You’re offline. Your answers remain on this page; reconnect to save and continue.'}</div> : null}
          {section.key === 'basics' ? <div className="inline-notice"><ShieldCheck size={18} />{t('onboarding.adultGateCopy')}</div> : null}
          {section.key === 'consent' ? <div className="inline-notice"><LockKeyhole size={18} />{locale === 'fa' ? 'هر رضایت مستقل و نسخه‌دار است. بازکردن یک سند دو مورد دیگر را تغییر نمی‌دهد.' : 'Each consent is independent and versioned. Opening one document never changes the other two.'}</div> : null}
          {section.key === 'plan-source' ? (
            <PlanSourceChoice
              error={errors.planSource}
              giftCampaign={giftCampaign}
              locale={locale}
              onChange={(value) => updateValue(section.fields[0], value)}
              value={values.planSource ?? ''}
            />
          ) : null}
          {section.key === 'food' ? <div className="inline-notice inline-notice--success"><ShieldCheck size={18} />{t('onboarding.allergenCopy')}</div> : null}
          {visibleFields.length > 0 && section.key !== 'plan-source' ? (
            <div className="onboarding-fields">
              <OnboardingFields
                fields={section.fields}
                healthStopped={healthStopped}
                visibleFields={visibleFields}
                training={section.key === 'training'}
                locale={locale}
                renderField={(field) => (
                  <DynamicField
                    error={errors[field.key]}
                    field={field}
                    key={field.key}
                    legalVersions={legalVersions}
                    locale={locale}
                    onChange={(value) => updateValue(field, value)}
                    placeholder={fieldPlaceholder(field.key, values.trainingLocation, t)}
                    required={isFieldRequired(field, values)}
                    suggested={field.key === 'country' && countrySuggested}
                    value={values[field.key] ?? ''}
                  />
                )}
              />
            </div>
          ) : null}
          {section.key === 'health' ? (
            <FieldReveal className="onboarding-reveal" key={healthOutcome} open={healthOutcome !== 'incomplete'}>
              <HealthOutcome outcome={healthOutcome} />
            </FieldReveal>
          ) : null}
          {section.key === 'food' ? (
            <FieldReveal className="onboarding-reveal" open={values.allergies?.includes(UNMAPPED_ALLERGEN)}>
              <div className="inline-notice inline-notice--warning" role="status">{t('onboarding.allergenOtherBlock')}</div>
            </FieldReveal>
          ) : null}
          {section.key === 'training' ? (
            <FieldReveal className="onboarding-reveal" open={values.trainingLocation === 'outdoor'}>
              <div className="inline-notice">{t('onboarding.outdoorEquipmentHidden')}</div>
            </FieldReveal>
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
            <div className="onboarding-review" data-inventory={values.planSource === 'external' ? 'ONB-29 LIFE-21' : reviewIds.join(' ')}>
              <span className="onboarding-review__mark"><Sparkles size={28} /></span>
              <h3>{t('onboarding.review')}</h3>
              <p>{values.planSource === 'external'
                ? (locale === 'fa' ? 'پس از تأیید، پرامپت محلی و مسیر واردکردن برنامه باز می‌شود. اشتراک لازم نیست.' : 'After confirmation, your local prompt and secure import path will open. No subscription is required.')
                : (locale === 'fa' ? 'پاسخ‌هایت را بررسی کن. تأیید، اطلاعات را ذخیره می‌کند؛ ساخت برنامه را در مرحلهٔ بعد خودت آغاز می‌کنی.' : 'Review your answers. Confirmation saves them; you will start plan creation explicitly in the next step.')}</p>
              {values.planSource === 'external' ? (
                <article className="onboarding-gift content-card">
                  <span className="onboarding-gift__icon" aria-hidden="true"><Import size={26} /></span>
                  <p className="orbit-eyebrow">{locale === 'fa' ? 'مسیر رایگان' : 'Free path'}</p>
                  <h4>{locale === 'fa' ? 'ساخت بیرونی، پیگیری در Momentum' : 'Create externally, track in Momentum'}</h4>
                  <p>{locale === 'fa' ? 'پرامپت فقط روی دستگاهت ساخته می‌شود. پیش از کپی، خروج اطلاعات سلامت را تأیید می‌کنی و فایل قبل از ذخیره اعتبارسنجی می‌شود.' : 'The prompt is built only on your device. You confirm health-data transfer before copying, and the file is validated before saving.'}</p>
                </article>
              ) : giftCampaign === 'exhausted' || giftCampaign === 'disabled' ? (
                <div className="inline-notice inline-notice--warning" role="status">{t('entitlement.giftExhausted')}</div>
              ) : giftCampaign === 'available' ? (
                <article aria-labelledby="onboarding-gift-title" className="onboarding-gift content-card">
                  <span className="onboarding-gift__icon" aria-hidden="true"><Gift size={26} /></span>
                  <p className="orbit-eyebrow">{t('onboarding.giftHeroEyebrow')}</p>
                  <h4 id="onboarding-gift-title">{t('onboarding.giftHeroTitle')}</h4>
                  <p>{t('onboarding.giftHeroBody')}</p>
                  <ul className="onboarding-gift__chips">
                    <li>{t('onboarding.giftChipDuration')}</li>
                    <li>{t('onboarding.giftChipNoCard')}</li>
                    <li>{t('onboarding.giftChipPlan')}</li>
                  </ul>
                </article>
              ) : (
                <div className="inline-notice" role="status">{locale === 'fa' ? 'واجد شرایط بودن برای هدیه در مرحلهٔ بعد بررسی می‌شود.' : 'Gift eligibility will be checked in the next step.'}</div>
              )}
              <ReviewGrid locale={locale} values={prepareCompletionValues(values)} />
              {blockedReason ? <div className="inline-notice inline-notice--warning"><HeartPulse size={18} />{blockedReason}</div> : null}
              {!online ? <div className="inline-notice"><WifiOff size={18} />{t('onboarding.offlineReview')}</div> : null}
              <Button block disabled={!online || Boolean(blockedReason) || saving} loading={saving} onClick={finishSetup}>{t('onboarding.reviewFinish')}</Button>
              <Link className="orbit-button orbit-button--ghost orbit-button--block" href={localizedPath(locale, '/app/today?preview=1')}>{t('common.preview')}</Link>
            </div>
          ) : null}
          {pageError ? <div className="inline-notice inline-notice--error" role="alert">{pageError}</div> : null}
          {healthStopped ? (
            <FieldReveal className="onboarding-reveal" key={`health-actions-${healthOutcome}`} open>
              <div className="onboarding-actions">
                <Button disabled={!online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button>
                <div className="onboarding-actions__stop">
                  <Button disabled={!online || saving} onClick={() => void saveAndExitHealth()} variant="secondary">{t('onboarding.saveAndExit')}</Button>
                  <Link className="orbit-button orbit-button--danger" href={localizedPath(locale, '/safety')}>{t('onboarding.safetyGuidance')}</Link>
                </div>
              </div>
            </FieldReveal>
          ) : showContinue ? (
            section.key === 'health' ? (
              <FieldReveal className="onboarding-reveal" key="health-actions-continue" open>
                <div className="onboarding-actions">
                  <Button disabled={currentIndex === 0 || !online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button>
                  <Button disabled={!online || planSourceMissing} loading={saving} onClick={next}>{t('common.continue')}<ArrowRight className="directional-icon" size={18} /></Button>
                </div>
              </FieldReveal>
            ) : (
              <div className="onboarding-actions">
                <Button disabled={currentIndex === 0 || !online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button>
                <Button disabled={!online || planSourceMissing} loading={saving} onClick={next}>{t('common.continue')}<ArrowRight className="directional-icon" size={18} /></Button>
              </div>
            )
          ) : (
            <div className="onboarding-actions"><Button disabled={!online} loading={saving} onClick={previous} variant="ghost"><ArrowLeft className="directional-icon" size={18} />{t('common.back')}</Button></div>
          )}
        </div>
      </main>
    </div>
  )
}

function completionFingerprint(values: Record<string, string>) {
  const serialized = JSON.stringify(Object.entries(values).sort(([left], [right]) => left.localeCompare(right)))
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`
}

function PlanSourceChoice({
  error,
  giftCampaign,
  locale,
  value,
  onChange,
}: {
  error?: string
  giftCampaign: ReturnType<typeof giftCampaignFromUnknown>
  locale: AppLocale
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const selectedLabel = value === 'external'
    ? t('onboarding.planSourceExternal')
    : value === 'momentum'
      ? t('onboarding.planSourceMomentum')
      : ''
  const momentumFoot = giftCampaign === 'available'
    ? t('onboarding.planSourceMomentumGiftFoot')
    : giftCampaign === 'exhausted' || giftCampaign === 'disabled'
      ? t('onboarding.planSourceMomentumMembershipFoot')
      : locale === 'fa' ? 'واجد شرایط بودن در مرحلهٔ بعد بررسی می‌شود.' : 'Eligibility is checked in the next step.'

  return (
    <fieldset className={`plan-source-choice${error ? ' has-error' : ''}`} data-inventory="ONB-29">
      <legend>{t('onboarding.planSourceChoose')}</legend>
      <p className="plan-source-choice__intro">{t('onboarding.planSourceIntro')}</p>
      <div className="plan-source-choice__grid">
        <label className={`plan-source-choice__option${value === 'external' ? ' is-selected' : ''}`}>
          <input checked={value === 'external'} name="plan-source" onChange={() => onChange('external')} required type="radio" value="external" />
          <span className="plan-source-choice__top" aria-hidden="true">
            <span className="plan-source-choice__icon"><FileUp size={23} /></span>
            <span className="plan-source-choice__indicator">{value === 'external' ? <Check size={15} strokeWidth={3} /> : null}</span>
          </span>
          <span className="plan-source-choice__copy">
            <span className="plan-source-choice__kicker">{t('onboarding.planSourceExternalKicker')}</span>
            <strong>{t('onboarding.planSourceExternal')}</strong>
            <span>{t('onboarding.planSourceExternalBody')}</span>
          </span>
          <small>{t('onboarding.planSourceExternalFoot')}</small>
        </label>
        <label className={`plan-source-choice__option${value === 'momentum' ? ' is-selected' : ''}`}>
          <input checked={value === 'momentum'} name="plan-source" onChange={() => onChange('momentum')} required type="radio" value="momentum" />
          <span className="plan-source-choice__top" aria-hidden="true">
            <span className="plan-source-choice__icon"><WandSparkles size={23} /></span>
            <span className="plan-source-choice__indicator">{value === 'momentum' ? <Check size={15} strokeWidth={3} /> : null}</span>
          </span>
          <span className="plan-source-choice__copy">
            <span className="plan-source-choice__kicker">{t('onboarding.planSourceMomentumKicker')}</span>
            <strong>{t('onboarding.planSourceMomentum')}</strong>
            <span>{t('onboarding.planSourceMomentumBody')}</span>
          </span>
          <small>{momentumFoot}</small>
        </label>
      </div>
      <p className={`plan-source-choice__guidance${value ? ' is-selected' : ''}`} aria-live="polite">
        {value ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
        {value ? t('onboarding.planSourceGuidanceSelected', { label: selectedLabel }) : t('onboarding.planSourceGuidanceChoose')}
      </p>
      {error ? <span className="orbit-field__error" role="alert">{error}</span> : null}
    </fieldset>
  )
}

function fieldPlaceholder(fieldKey: string, trainingLocation: string | undefined, translate: (key: string) => string) {
  if (fieldKey === 'equipment' && trainingLocation === 'home') return translate('onboarding.homeEquipmentHint')
  if (fieldKey === 'equipment' && trainingLocation === 'gym') return translate('onboarding.gymEquipmentHint')
  if (fieldKey === 'workSchedule') return translate('onboarding.scheduleHint')
  if (fieldKey === 'requestedMealPattern') return translate('onboarding.mealPatternHint')
  return undefined
}

function OnboardingProgress({
  locale,
  percent,
  title,
}: {
  locale: AppLocale
  percent: number
  title: string
}) {
  const { t } = useTranslation()
  const display = formatNumber(percent / 100, locale, { style: 'percent', maximumFractionDigits: 0 })

  return (
    <div
      aria-label={t('onboarding.progressLabel')}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percent}
      aria-valuetext={`${title}, ${display}`}
      className="onboarding-progress"
      role="progressbar"
    >
      <div className="onboarding-progress__meta">
        <strong>{title}</strong>
        <span>{display}</span>
      </div>
      <div className="onboarding-progress__track">
        <span className="onboarding-progress__fill" style={{ width: `${Math.max(percent, 0)}%` }} />
      </div>
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
      <p>{locale === 'fa' ? 'گزارش آپلودشده خودکار خوانده نمی‌شود. برای استفاده در برنامه، درصد چربی یا دور کمر را خودت وارد کن.' : 'Uploaded reports are not read automatically. Enter body-fat or waist values yourself for plan creation.'}</p>
      {skipped ? <div className="inline-notice">{t('onboarding.bodySkipConfirm')}</div> : null}
      {uploadState === 'uploading' ? (
        <div className="inline-notice" role="status">
          {t('onboarding.uploadProgress')}
          <Button disabled={!online} onClick={onCancelUpload} variant="ghost">{t('onboarding.uploadCancel')}</Button>
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
        {uploadState === 'success' ? <Button disabled={saving || !online} onClick={onRemove} variant="ghost">{t('onboarding.removeFile')}</Button> : null}
        <Button disabled={saving || !online} onClick={onSkip} variant="secondary">{t('onboarding.skipConfirm')}</Button>
      </div>
    </div>
  )
}

function OnboardingFields({ fields, healthStopped, visibleFields, training, locale, renderField }: {
  fields: readonly OnboardingField[]
  healthStopped: boolean
  visibleFields: OnboardingField[]
  training: boolean
  locale: AppLocale
  renderField: (field: OnboardingField) => ReactNode
}) {
  const trainingDetails = fields.filter((field) => !['trainingDays', 'equipment', 'workSchedule'].includes(field.key))
  const render = (field: OnboardingField) => field.visibleWhen
    ? <FieldReveal className="onboarding-reveal" key={field.key} open={visibleFields.includes(field)}>{renderField(field)}</FieldReveal>
    : visibleFields.includes(field) ? renderField(field) : null
  if (!training) {
    if (fields.some((field) => field.key === 'pregnancyOrBreastfeeding')) {
      const screeningFields = fields.filter((field) => !['medications', 'medicalNotes', 'supplements'].includes(field.key))
      const detailFields = fields.filter((field) => ['medications', 'medicalNotes', 'supplements'].includes(field.key))
      const showDetails = !healthStopped
      return (
        <>
          {screeningFields.map(render)}
          <FieldReveal className="onboarding-reveal" key="health-details" open={showDetails}>
            <section className="onboarding-health-details">
              <h3>{locale === 'fa' ? 'جزئیات اختیاری سلامت' : 'Optional health details'}</h3>
              <p>{locale === 'fa' ? 'در صورت تمایل، زمینهٔ بیشتری برای شخصی‌سازی برنامه اضافه کن.' : 'Add more context for plan personalization if you want.'}</p>
              <div className="onboarding-fields">{detailFields.map(render)}</div>
            </section>
          </FieldReveal>
        </>
      )
    }
    return fields.map(render)
  }
  return (
    <>
      <div className="onboarding-training-frequency">
        {renderField(fields.find((field) => field.key === 'trainingDays')!)}
        <p>{locale === 'fa' ? 'ابتدا تعداد روزها را انتخاب کن، سپس جزئیات تمرین را تنظیم کن. صفر یعنی فعلاً تمرین برنامه‌ریزی‌شده نداری.' : 'Choose your weekly frequency, then tailor your sessions. Zero means no scheduled training for now.'}</p>
      </div>
      <FieldReveal className="onboarding-reveal" open={trainingDetails.some((field) => visibleFields.includes(field))}>
        <section className="onboarding-training-details">
          <h3>{locale === 'fa' ? 'جزئیات برنامهٔ تمرین' : 'Your training routine'}</h3>
          <div className="onboarding-fields">
            {trainingDetails.map((field) => field.key === 'trainingDuration' ? render(field) : renderField(field))}
          </div>
        </section>
      </FieldReveal>
      {fields.filter((field) => ['equipment', 'workSchedule'].includes(field.key)).map(render)}
    </>
  )
}

function consentVersionForField(fieldKey: string, versions: LegalDocumentVersions) {
  if (fieldKey === 'termsAccepted') return versions.terms
  if (fieldKey === 'privacyAccepted') return versions.privacy
  return versions.health
}

function DynamicField({
  field,
  value,
  error,
  onChange,
  suggested,
  locale,
  legalVersions,
  required,
  placeholder,
}: {
  field: OnboardingField
  value: string
  error?: string
  onChange: (value: string) => void
  suggested?: boolean
  locale: AppLocale
  legalVersions: LegalDocumentVersions
  required?: boolean
  placeholder?: string
}) {
  const { t } = useTranslation()
  if (field.kind === 'date') {
    return <LocalizedDatePicker error={error} label={t(field.labelKey)} locale={locale} onChange={onChange} purpose={field.key === 'birthDate' ? 'birth' : 'report'} required={required} value={value} />
  }
  if (field.optionSource === 'countries') {
    return <CountryCombobox error={error} label={t(field.labelKey)} locale={locale} onChange={onChange} required={required} suggested={suggested} value={value} />
  }
  if (field.kind === 'select') {
    const options = field.options?.map((option) => ({ value: option.value, label: t(option.labelKey) })) ?? []
    return (
      <Select error={error} label={t(field.labelKey)} onChange={(event) => onChange(event.target.value)} required={required} value={value}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    )
  }
  if (field.kind === 'checkbox') {
    const policyPath = field.key === 'termsAccepted' ? '/terms' : '/privacy'
    return (
      <label className={`onboarding-checkbox ${error ? 'has-error' : ''}`}>
        <input aria-invalid={Boolean(error)} aria-required={required || undefined} checked={value === 'yes'} onChange={(event) => onChange(event.target.checked ? 'yes' : '')} required={required} type="checkbox" />
        <span><Check size={16} /></span>
        <div className="onboarding-checkbox__heading">
          <strong>{t(field.labelKey)}</strong>
          {required ? <RequiredMark /> : null}
        </div>
        <small className="onboarding-checkbox__version">{consentVersionForField(field.key, legalVersions)}</small>
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
        <legend>
          {t(field.labelKey)}
          {required ? <RequiredMark /> : null}
        </legend>
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
    return <Textarea error={error} label={t(field.labelKey)} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} rows={3} value={value} />
  }
  if (field.kind === 'time') {
    return <LocalizedTimePicker error={error} label={t(field.labelKey)} locale={locale} onChange={onChange} required={required} value={value} />
  }
  if (field.kind === 'number' && field.stepper) {
    return (
      <NumberStepper
        decreaseLabel={t('onboarding.stepperDecrease')}
        error={error}
        fallback={Number(field.defaultValue ?? field.min ?? 0)}
        increaseLabel={t('onboarding.stepperIncrease')}
        label={t(field.labelKey)}
        locale={locale}
        max={field.max ?? 4}
        min={field.min ?? 0}
        onChange={onChange}
        required={required}
        step={field.step ?? 1}
        value={value}
      />
    )
  }
  return (
    <Input
      error={error}
      inputMode={field.kind === 'number' ? 'decimal' : undefined}
      label={t(field.labelKey)}
      max={field.max}
      maxLength={field.maxLength}
      min={field.min}
      onChange={(event) => onChange(event.target.value)}
      required={required}
      step={field.step}
      type={field.kind === 'number' ? 'text' : field.kind}
      value={value}
    />
  )
}

function ReviewGrid({
  locale,
  values,
}: {
  locale: AppLocale
  values: Record<string, string>
}) {
  const { t } = useTranslation()
  const weight = Number(values.weightKg)

  function optionLabel(fieldKey: string, value: string) {
    if (!value) return '—'
    const labelKey = onboardingOptionLabelKey(fieldKey, value)
    return labelKey ? t(labelKey) : value
  }

  function optionList(fieldKey: string, value: string) {
    return value ? value.split(',').filter(Boolean).map((item) => optionLabel(fieldKey, item)).join(locale === 'fa' ? '، ' : ', ') : '—'
  }

  const yesNo = (value: string) => optionLabel('urgentSymptoms', value)
  const joinDetails = (...parts: Array<string | undefined>) => parts.filter((part) => part && part !== '—').join(locale === 'fa' ? ' · ' : ' · ') || '—'
  const mealCount = formatNumber(Number(values.requestedMealCount || 3), locale)
  const mealCountLabel = `${mealCount} ${locale === 'fa' ? 'وعده' : 'meals'}`
  const mealPattern = values.requestedMealPattern === mealCountLabel
    ? undefined
    : values.requestedMealPattern?.startsWith(`${mealCountLabel}. `)
      ? values.requestedMealPattern.slice(mealCountLabel.length + 2)
      : values.requestedMealPattern

  const items = [
    { step: 'plan-source' as const, label: t('onboarding.planSource'), value: optionLabel('planSource', values.planSource) },
    { step: 'basics' as const, label: locale === 'fa' ? 'مشخصات و اندازه‌ها' : 'Identity and measurements', value: joinDetails(values.firstName, optionLabel('sex', values.sex), values.birthDate ? formatLocalizedDate(values.birthDate, locale) : '—', values.country ? countryName(values.country, locale) : '—', Number.isFinite(weight) && values.weightKg ? `${formatNumber(weight, locale, { maximumFractionDigits: 1 })} ${locale === 'fa' ? 'کیلوگرم' : 'kg'}` : '—', values.heightCm ? `${formatNumber(Number(values.heightCm), locale, { maximumFractionDigits: 1 })} ${locale === 'fa' ? 'سانتی‌متر' : 'cm'}` : '—') },
    { step: 'goal' as const, label: locale === 'fa' ? 'هدف' : 'Goal', value: joinDetails(optionLabel('goalType', values.goalType), values.targetWeightKg ? `${values.targetWeightKg} kg` : undefined) },
    { step: 'health' as const, label: locale === 'fa' ? 'غربالگری سلامت' : 'Health screening', value: joinDetails(healthScreeningOutcome(values) === 'eligible' ? (locale === 'fa' ? 'مانع ایمنی ثبت نشده' : 'No safety block') : (locale === 'fa' ? 'نیاز به مسیر انسانی' : 'Human path required'), `${locale === 'fa' ? 'علائم فوری' : 'Urgent symptoms'}: ${yesNo(values.urgentSymptoms)}`, values.medications, values.medicalNotes) },
    { step: 'food' as const, label: locale === 'fa' ? 'غذا و حساسیت‌ها' : 'Food and allergies', value: joinDetails(optionLabel('dietStyle', values.dietStyle), `${locale === 'fa' ? 'حساسیت' : 'Allergies'}: ${optionList('allergies', values.allergies)}`, values.dislikedFoods ? `${locale === 'fa' ? 'پرهیز' : 'Avoid'}: ${values.dislikedFoods}` : undefined, values.favoriteFoods, mealPattern, `${mealCountLabel} / ${formatNumber(Number(values.preferredOptionCount || 3), locale)} ${locale === 'fa' ? 'گزینه' : 'options'}`, values.cookingConstraints) },
    { step: 'training' as const, label: locale === 'fa' ? 'برنامه تمرین' : 'Training routine', value: joinDetails(`${values.trainingDays ? formatNumber(Number(values.trainingDays), locale) : formatNumber(0, locale)} ${locale === 'fa' ? 'روز' : 'days'}`, optionLabel('primaryActivity', values.primaryActivity), optionLabel('trainingExperience', values.trainingExperience), optionLabel('trainingLocation', values.trainingLocation), values.trainingDuration ? `${formatNumber(Number(values.trainingDuration), locale)} ${locale === 'fa' ? 'دقیقه' : 'min'}` : undefined, optionList('trainingWeekdays', values.trainingWeekdays), values.trainingStartTime, values.trainingAvailability, values.equipment, values.workSchedule) },
    { step: 'body' as const, label: locale === 'fa' ? 'اطلاعات بدن' : 'Body details', value: values.bodySkipped === 'yes' ? t('onboarding.skip') : joinDetails(values.bodyReportPath ? (locale === 'fa' ? 'گزارش پیوست شده' : 'Report attached') : undefined, values.bodyFatPercent ? `${values.bodyFatPercent}%` : undefined, values.waistCm ? `${values.waistCm} cm` : undefined) },
    { step: 'consent' as const, label: locale === 'fa' ? 'رضایت‌ها' : 'Consents', value: values.termsAccepted === 'yes' && values.privacyAccepted === 'yes' && values.healthDataConsent === 'yes' ? (locale === 'fa' ? 'شرایط، حریم خصوصی و رضایت داده‌های سلامت پذیرفته شد' : 'Terms, privacy, and health-data consent accepted') : '—' },
  ]
  return (
    <dl className="review-grid">
      {items.map((item) => (
        <div key={`${item.step}-${item.label}`}>
          <dt>{item.label}</dt>
          <dd>
            <span>{item.value}</span>
            <Link className="review-grid__edit" href={localizedPath(locale, `/onboarding/${item.step}`)}>{`${t('onboarding.editSection')} ${item.label}`}</Link>
          </dd>
        </div>
      ))}
    </dl>
  )
}
