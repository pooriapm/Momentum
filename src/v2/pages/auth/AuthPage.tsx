import { ArrowRight, Cloud, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useAuth } from '../../../platform/auth/auth-context'
import { PublicHeader } from '../../components/PublicChrome'
import { localizedPath } from '../../router/route-utils'
import { Input } from '../../ui/FormControls'
import { OrbitMark } from '../../ui/OrbitMark'
import { Button, ContentCard } from '../../ui/primitives'

export function AuthPage({ locale, mode }: { locale: AppLocale; mode: 'sign-in' | 'sign-up' | 'recover' | 'update-password' | 'verify' }) {
  const { t } = useTranslation()
  const [, navigate] = useLocation()
  const { signIn, signUp, requestPasswordReset, updatePassword, isConfigured, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isSignUp = mode === 'sign-up'
  const isRecover = mode === 'recover'
  const isUpdatePassword = mode === 'update-password'
  const isVerify = mode === 'verify'
  const fa = locale === 'fa'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    if ((!isUpdatePassword && !email.includes('@')) || (!isRecover && password.length < 8)) {
      setError(t('auth.error'))
      return
    }
    setLoading(true)
    try {
      if (isRecover) {
        await requestPasswordReset(email, locale)
        setMessage(fa ? 'اگر حسابی با این ایمیل وجود داشته باشد، لینک بازیابی ارسال می‌شود.' : 'If an account exists for this email, a recovery link will be sent.')
      } else if (isUpdatePassword) {
        await updatePassword(password)
        setMessage(fa ? 'رمز عبور تغییر کرد. حالا می‌توانی وارد شوی.' : 'Password updated. You can now sign in.')
      } else if (isSignUp) {
        const outcome = await signUp(email, password, locale)
        if (outcome === 'confirmation-required') {
          setMessage(t('auth.confirm'))
        } else {
          navigate(localizedPath(locale, '/onboarding'))
        }
      } else {
        await signIn(email, password)
        navigate(localizedPath(locale, '/app/today'))
      }
    } catch {
      setError(t('auth.error'))
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
          {isVerify ? <div className="auth-verification-state"><p>{user ? (fa ? 'ایمیل تأیید شد و حساب آماده ادامه است.' : 'Email verified. Your account is ready to continue.') : (fa ? 'لینک تأیید را از ایمیل باز کن؛ اگر نشست ایجاد نشد دوباره وارد شو.' : 'Open the verification link from your email. Sign in again if a session is not created.')}</p><Link className="orbit-button orbit-button--primary orbit-button--block" href={localizedPath(locale, user ? '/onboarding' : '/auth/sign-in')}>{user ? (fa ? 'ادامه آنبوردینگ' : 'Continue onboarding') : t('common.signIn')}</Link></div> : <form onSubmit={handleSubmit}>
            {!isUpdatePassword ? <Input
              autoComplete="email"
              disabled={!isConfigured}
              label={t('auth.email')}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            /> : null}
            {!isRecover ? <Input
              autoComplete={isSignUp || isUpdatePassword ? 'new-password' : 'current-password'}
              disabled={!isConfigured}
              hint={t('auth.passwordHint')}
              label={t('auth.password')}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            /> : null}
            {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
            {message ? <div className="inline-notice inline-notice--success" role="status">{message}</div> : null}
            <Button block disabled={!isConfigured} loading={loading} type="submit">
              {isRecover ? (fa ? 'ارسال لینک' : 'Send link') : isUpdatePassword ? (fa ? 'ذخیره رمز تازه' : 'Save new password') : isSignUp ? t('auth.submitUp') : t('auth.submitIn')}
            </Button>
          </form>}
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
