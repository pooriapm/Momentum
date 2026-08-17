import { ArrowRight, Check, Cloud, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import { FALLBACK_LEGAL_DOCUMENT_VERSIONS, loadLegalDocumentVersions } from '../../../config/legal'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { classifyAuthError } from '../../../platform/auth/auth-errors'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { Input } from '../../ui/FormControls'
import { OrbitMark } from '../../ui/OrbitMark'
import { Button, ContentCard } from '../../ui/primitives'

const PENDING_EMAIL_KEY = 'momentum.pendingVerificationEmail'
const RESEND_COOLDOWN_SECONDS = 60

function readPendingEmail() {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function writePendingEmail(email: string) {
  try {
    sessionStorage.setItem(PENDING_EMAIL_KEY, email)
  } catch {
    // sessionStorage can be blocked; verification still works from the email link.
  }
}

export function AuthPage({ locale, mode }: { locale: AppLocale; mode: 'sign-in' | 'sign-up' | 'recover' | 'update-password' | 'verify' }) {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const { signIn, signUp, resendConfirmation, requestPasswordReset, updatePassword, isConfigured, user } = useAuth()
  const online = useOnlineStatus()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [cooldown, setCooldown] = useState(0)
  const [needsResend, setNeedsResend] = useState(false)
  const [legalVersions, setLegalVersions] = useState(FALLBACK_LEGAL_DOCUMENT_VERSIONS)
  const isSignUp = mode === 'sign-up'
  const isRecover = mode === 'recover'
  const isUpdatePassword = mode === 'update-password'
  const isVerify = mode === 'verify'
  const fa = locale === 'fa'
  const verified = Boolean(user?.email_confirmed_at)
  const pendingEmail = user?.email ?? readPendingEmail()

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    void loadLegalDocumentVersions().then(setLegalVersions)
  }, [])

  function failureMessage(kind: ReturnType<typeof classifyAuthError>) {
    if (kind === 'offline') return t('auth.offline')
    if (kind === 'rate_limited') return t('auth.rateLimited')
    if (kind === 'unverified') return t('auth.unverified')
    if (kind === 'invalid_link') return t('auth.invalidLink')
    if (kind === 'invalid_credentials') return t('auth.error')
    return t('auth.error')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setNeedsResend(false)
    const nextFieldErrors: Record<string, string> = {}
    if (!online) {
      setError(t('auth.offline'))
      return
    }
    if (!isUpdatePassword && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextFieldErrors.email = t('auth.emailInvalid')
    }
    if (!isRecover && !isVerify && password.length < 8) {
      nextFieldErrors.password = t('auth.passwordHint')
    }
    if (isUpdatePassword && password !== passwordConfirm) {
      nextFieldErrors.passwordConfirm = t('auth.passwordMismatch')
    }
    if (isSignUp && !acceptedTerms) nextFieldErrors.terms = t('auth.termsRequired')
    if (isSignUp && !acceptedPrivacy) nextFieldErrors.privacy = t('auth.privacyRequired')
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) {
      setError(t('auth.fixFields'))
      return
    }

    setLoading(true)
    try {
      if (isRecover) {
        await requestPasswordReset(email, locale)
        setMessage(t('auth.recoverSent'))
      } else if (isUpdatePassword) {
        await updatePassword(password)
        setMessage(t('auth.passwordUpdated'))
      } else if (isSignUp) {
        writePendingEmail(email)
        const outcome = await signUp(email, password, locale)
        if (outcome === 'confirmation-required') {
          navigate(localizedPath(locale, '/auth/verify'))
        } else {
          navigate(localizedPath(locale, '/onboarding'))
        }
      } else {
        await signIn(email, password)
        navigate(localizedPath(locale, '/app/today'))
      }
    } catch (cause) {
      const kind = classifyAuthError(cause)
      setError(failureMessage(kind))
      if (kind === 'unverified') {
        writePendingEmail(email)
        setNeedsResend(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    const targetEmail = pendingEmail || email
    if (!targetEmail || cooldown > 0) return
    setError('')
    setMessage('')
    setLoading(true)
    try {
      await resendConfirmation(targetEmail, locale)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setMessage(t('auth.resendSent'))
    } catch (cause) {
      setError(failureMessage(classifyAuthError(cause)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="public-page auth-page">
      <PublicHeader locale={locale} />
      <main className="auth-layout">
        <section className="auth-layout__story">
          <OrbitMark animated size={76} />
          <p className="orbit-eyebrow"><ShieldCheck size={15} />{locale === 'fa' ? 'خصوصی، شخصی و همراه' : 'Private, personal, portable'}</p>
          <h1>{isVerify ? (fa ? 'تأیید ایمیل' : 'Verify your email') : isRecover ? (fa ? 'بازیابی حساب' : 'Recover your account') : isUpdatePassword ? (fa ? 'رمز تازه بساز' : 'Create a new password') : isSignUp ? t('auth.titleUp') : t('auth.titleIn')}</h1>
          <p>{t('auth.subtitle')}</p>
          <div className="auth-trust-list">
            <span><Cloud size={18} />{locale === 'fa' ? 'حساب ابری رمزگذاری‌شده' : 'Encrypted cloud account'}</span>
            <span><LockKeyhole size={18} />{locale === 'fa' ? 'جداسازی داده در سطح ردیف' : 'Row-level data isolation'}</span>
            <span><ShieldCheck size={18} />{locale === 'fa' ? 'بدون تبلیغ با داده سلامت' : 'No health-data advertising'}</span>
          </div>
        </section>
        <ContentCard className="auth-card">
          <div className="auth-card__heading">
            <span className="auth-card__icon"><Mail size={21} /></span>
            <h2>{isVerify ? (fa ? 'وضعیت تأیید' : 'Verification status') : isRecover ? (fa ? 'ارسال لینک بازیابی' : 'Send recovery link') : isUpdatePassword ? (fa ? 'تغییر رمز عبور' : 'Update password') : isSignUp ? t('common.signUp') : t('common.signIn')}</h2>
          </div>
          {!isConfigured ? <div className="inline-notice inline-notice--warning">{t('auth.cloudMissing')}</div> : null}
          {!online ? <div className="inline-notice inline-notice--warning" role="status">{t('auth.offline')}</div> : null}
          {isVerify ? (
            <div className="auth-verification-state">
              <p>{verified ? t('auth.verifyComplete') : t('auth.verifyWaiting')}</p>
              {pendingEmail ? <p>{pendingEmail}</p> : null}
              {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
              {message ? <div className="inline-notice inline-notice--success" role="status">{message}</div> : null}
              <Link className="orbit-button orbit-button--primary orbit-button--block" href={localizedPath(locale, verified ? '/onboarding' : '/auth/sign-in')}>
                {verified ? t('auth.continueOnboarding') : t('common.signIn')}
              </Link>
              {!verified ? (
                <Button
                  block
                  disabled={!isConfigured || !online || !pendingEmail || cooldown > 0}
                  loading={loading}
                  onClick={() => void handleResend()}
                  type="button"
                  variant="secondary"
                >
                  {cooldown > 0 ? t('auth.resendWait', { seconds: cooldown }) : t('auth.resend')}
                </Button>
              ) : null}
            </div>
          ) : isUpdatePassword && isConfigured && !user ? (
            <div className="auth-verification-state">
              <p>{t('auth.invalidLink')}</p>
              <Link className="orbit-button orbit-button--primary orbit-button--block" href={localizedPath(locale, '/auth/recover')}>{t('auth.requestNewLink')}</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {!isUpdatePassword ? (
                <Input
                  autoComplete="email"
                  disabled={!isConfigured}
                  error={fieldErrors.email}
                  label={t('auth.email')}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              ) : null}
              {!isRecover ? (
                <Input
                  autoComplete={isSignUp || isUpdatePassword ? 'new-password' : 'current-password'}
                  disabled={!isConfigured}
                  error={fieldErrors.password}
                  hint={t('auth.passwordHint')}
                  label={t('auth.password')}
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              ) : null}
              {isUpdatePassword ? (
                <Input
                  autoComplete="new-password"
                  disabled={!isConfigured}
                  error={fieldErrors.passwordConfirm}
                  label={t('auth.passwordConfirm')}
                  minLength={8}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  type="password"
                  value={passwordConfirm}
                />
              ) : null}
              {isSignUp ? (
                <div className="auth-consent">
                  <label className={`onboarding-checkbox ${fieldErrors.terms ? 'has-error' : ''}`}>
                    <input checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} type="checkbox" />
                    <span><Check size={16} /></span>
                    <strong>{t('onboarding.termsConsent')}</strong>
                    <Link className="onboarding-checkbox__policy" href={localizedPath(locale, '/terms')} onClick={(event) => event.stopPropagation()} target="_blank">{t('auth.readDocument')} · {legalVersions.terms}</Link>
                    {fieldErrors.terms ? <small>{fieldErrors.terms}</small> : null}
                  </label>
                  <label className={`onboarding-checkbox ${fieldErrors.privacy ? 'has-error' : ''}`}>
                    <input checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} type="checkbox" />
                    <span><Check size={16} /></span>
                    <strong>{t('onboarding.privacyConsent')}</strong>
                    <Link className="onboarding-checkbox__policy" href={localizedPath(locale, '/privacy')} onClick={(event) => event.stopPropagation()} target="_blank">{t('auth.readDocument')} · {legalVersions.privacy}</Link>
                    {fieldErrors.privacy ? <small>{fieldErrors.privacy}</small> : null}
                  </label>
                </div>
              ) : null}
              {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
              {message ? <div className="inline-notice inline-notice--success" role="status">{message}</div> : null}
              {needsResend ? (
                <Button
                  block
                  disabled={!isConfigured || !online || !(pendingEmail || email) || cooldown > 0}
                  loading={loading}
                  onClick={() => void handleResend()}
                  type="button"
                  variant="secondary"
                >
                  {cooldown > 0 ? t('auth.resendWait', { seconds: cooldown }) : t('auth.resend')}
                </Button>
              ) : null}
              <Button block disabled={!isConfigured} loading={loading} type="submit">
                {isRecover ? (fa ? 'ارسال لینک' : 'Send link') : isUpdatePassword ? (fa ? 'ذخیره رمز تازه' : 'Save new password') : isSignUp ? t('auth.submitUp') : t('auth.submitIn')}
              </Button>
            </form>
          )}
          {!isVerify ? <Link className="auth-switch" href={localizedPath(locale, mode === 'sign-in' ? '/auth/sign-up' : '/auth/sign-in')}>
            {mode === 'sign-in' ? t('auth.switchToUp') : t('auth.switchToIn')}
          </Link> : null}
          {mode === 'sign-in' ? <Link className="auth-switch" href={localizedPath(locale, '/auth/recover')}>{fa ? 'رمز عبور را فراموش کرده‌ام' : 'Forgot password?'}</Link> : null}
          {!isConfigured ? (
            <Link className="orbit-button orbit-button--secondary orbit-button--block" href={localizedPath(locale, '/app/today?preview=1')}>
              {t('common.preview')} <ArrowRight className="directional-icon" size={17} />
            </Link>
          ) : null}
        </ContentCard>
      </main>
    </div>
  )
}
