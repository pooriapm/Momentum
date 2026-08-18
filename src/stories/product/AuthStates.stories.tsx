import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  KeyRound,
  LoaderCircle,
  MailCheck,
  RefreshCw,
  ShieldX,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { momentumEvidence } from './coverage'
import {
  AuthFrame,
  localeFromStory,
  SpecBadge,
  SpecButton,
  SpecCallout,
  SpecCard,
  SpecConsentOption,
  SpecField,
  StateScreen,
  tx,
  type SpecLocale,
} from './ProductSpec'

type AuthFormState = 'validation' | 'submitting' | 'password-mismatch'

function AuthForm({ locale, state }: { locale: SpecLocale; state: AuthFormState }) {
  const mismatch = state === 'password-mismatch'
  const submitting = state === 'submitting'
  return (
    <AuthFrame locale={locale} step={tx(locale, mismatch ? 'رمز جدید' : 'ورود امن', mismatch ? 'New password' : 'Secure sign in')}>
      <SpecCard>
        <SpecBadge tone="brand">{tx(locale, 'حساب Momentum', 'Momentum account')}</SpecBadge>
        <h1>{tx(locale, mismatch ? 'یک رمز امن انتخاب کن' : 'خوش آمدی', mismatch ? 'Choose a secure password' : 'Welcome back')}</h1>
        <p>{tx(locale, mismatch ? 'رمز باید حداقل ۸ نویسه داشته باشد و دو کادر یکسان باشند.' : 'برنامه و سابقه‌ات بعد از ورود در دسترس است.', mismatch ? 'Use at least 8 characters and make both entries match.' : 'Your plan and history are available after signing in.')}</p>
        {mismatch ? (
          <>
            <SpecField label={tx(locale, 'رمز جدید', 'New password')} value="Momentum-2026" />
            <SpecField error={tx(locale, 'رمزها با هم یکسان نیستند.', 'Passwords do not match.')} label={tx(locale, 'تکرار رمز', 'Confirm password')} value="Momentum-2062" />
          </>
        ) : (
          <>
            <SpecField error={state === 'validation' ? tx(locale, 'ایمیل معتبر وارد کن.', 'Enter a valid email address.') : undefined} label={tx(locale, 'ایمیل', 'Email')} value={state === 'validation' ? 'ava@' : 'ava@example.com'} />
            <SpecField label={tx(locale, 'رمز عبور', 'Password')} value="••••••••••" />
          </>
        )}
        <div className="mo-spec__actions">
          <SpecButton disabled={submitting}>{submitting ? <><LoaderCircle className="orbit-spin" />{tx(locale, 'در حال ورود…', 'Signing in…')}</> : tx(locale, mismatch ? 'ذخیره رمز' : 'ورود', mismatch ? 'Save password' : 'Sign in')}</SpecButton>
          {!mismatch ? <SpecButton kind="ghost">{tx(locale, 'رمز را فراموش کردم', 'Forgot password')}</SpecButton> : null}
        </div>
      </SpecCard>
    </AuthFrame>
  )
}

function renderForm(state: AuthFormState) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => <AuthForm locale={localeFromStory(context.globals.locale)} state={state} />
}

function renderState(state: 'confirmation' | 'verified' | 'expired' | 'recover-sent' | 'recover-rate-limit' | 'rate-limit' | 'offline' | 'server-error') {
  return (_: unknown, context: { globals: Record<string, unknown> }) => {
    const locale = localeFromStory(context.globals.locale)
    const states = {
      confirmation: {
        icon: <MailCheck />, tone: 'info' as const,
        title: tx(locale, 'ایمیلت را بررسی کن', 'Check your email'),
        body: tx(locale, 'لینک تأیید به ava@example.com فرستاده شد. این صفحه را می‌توانی ببندی و از همان دستگاه ادامه بدهی.', 'A verification link was sent to ava@example.com. You can close this screen and continue on the same device.'),
        actions: <><SpecButton>{tx(locale, 'بازکردن برنامه ایمیل', 'Open email app')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'ایمیل اشتباه است؛ اصلاح کن', 'Wrong email? Correct it')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'ارسال دوباره', 'Resend email')}</SpecButton></>,
      },
      verified: {
        icon: <BadgeCheck />, tone: 'success' as const,
        title: tx(locale, 'ایمیل تأیید شد', 'Email verified'),
        body: tx(locale, 'حسابت آماده است. حالا اطلاعات لازم برای ساخت برنامه اول را تکمیل می‌کنیم.', 'Your account is ready. Next, we’ll collect the information needed for your first plan.'),
        actions: <SpecButton>{tx(locale, 'شروع راه‌اندازی', 'Start setup')}</SpecButton>,
      },
      expired: {
        icon: <Clock3 />, tone: 'warning' as const,
        title: tx(locale, 'این لینک منقضی شده', 'This link has expired'),
        body: tx(locale, 'برای حفظ امنیت، لینک‌های تأیید زمان محدودی معتبرند. لینک تازه درخواست کن.', 'Verification links expire for security. Request a fresh link to continue.'),
        actions: <SpecButton><RefreshCw />{tx(locale, 'دریافت لینک تازه', 'Request new link')}</SpecButton>,
      },
      'recover-sent': {
        icon: <KeyRound />, tone: 'info' as const,
        title: tx(locale, 'لینک بازیابی ارسال شد', 'Recovery link sent'),
        body: tx(locale, 'اگر حسابی با sara@example.com وجود داشته باشد، لینک تغییر رمز را دریافت می‌کنی. این پاسخ بعد از بستن صفحه هم در مسیر بازیابی باقی می‌ماند.', 'If an account exists for sara@example.com, you’ll receive a password reset link. This confirmation remains available if you leave and return.'),
        actions: <><SpecButton kind="secondary">{tx(locale, 'بازگشت به ورود', 'Back to sign in')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'ایمیل دیگری استفاده کن', 'Use another email')}</SpecButton></>,
      },
      'recover-rate-limit': {
        icon: <ShieldX />, tone: 'warning' as const,
        title: tx(locale, 'درخواست بازیابی ثبت شد؛ کمی صبر کن', 'Recovery request received; wait before trying again'),
        body: tx(locale, 'پاسخ حریم‌خصوصی یکسان می‌ماند. درخواست بعدی ۱۴ دقیقه دیگر ممکن است و بستن صفحه زمان را تغییر نمی‌دهد.', 'The privacy-safe response remains the same. Another request is available in 14 minutes, and leaving this screen does not reset the timer.'),
        actions: <><SpecButton disabled>{tx(locale, 'ارسال دوباره در ۱۴:۰۰', 'Resend in 14:00')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'بازگشت به ورود', 'Back to sign in')}</SpecButton></>,
      },
      'rate-limit': {
        icon: <ShieldX />, tone: 'warning' as const,
        title: tx(locale, 'کمی بعد دوباره تلاش کن', 'Try again in a moment'),
        body: tx(locale, 'برای محافظت از حسابت، تعداد تلاش‌ها موقتاً محدود شده است. ۱۴ دقیقه دیگر دوباره تلاش کن.', 'To protect your account, attempts are temporarily limited. Try again in 14 minutes.'),
        actions: <SpecButton disabled>{tx(locale, '۱۴:۰۰ تا تلاش بعدی', '14:00 until next attempt')}</SpecButton>,
      },
      offline: {
        icon: <WifiOff />, tone: 'neutral' as const,
        title: tx(locale, 'برای ورود به اینترنت نیاز داری', 'Connect to sign in'),
        body: tx(locale, 'اطلاعات ورود ذخیره نشده است. پس از برگشت اتصال، دوباره تلاش کن.', 'Your credentials were not stored. Try again when your connection returns.'),
        actions: <SpecButton kind="secondary"><RefreshCw />{tx(locale, 'بررسی اتصال', 'Check connection')}</SpecButton>,
      },
      'server-error': {
        icon: <XCircle />, tone: 'danger' as const,
        title: tx(locale, 'ورود انجام نشد', 'Sign-in failed'),
        body: tx(locale, 'مشکلی موقت رخ داد. اطلاعات حساب تغییری نکرده و می‌توانی دوباره تلاش کنی.', 'A temporary problem occurred. Your account is unchanged and you can safely try again.'),
        actions: <><SpecButton>{tx(locale, 'تلاش دوباره', 'Try again')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'دریافت راهنما', 'Get help')}</SpecButton></>,
      },
    }
    const item = states[state]
    return <StateScreen actions={item.actions} body={item.body} eyebrow={tx(locale, 'ورود و امنیت', 'Access and security')} icon={item.icon} locale={locale} title={item.title} tone={item.tone} />
  }
}

type AdditionalAuthState = 'sign-in' | 'rejected' | 'unverified' | 'sign-up' | 'sign-up-validation' | 'sign-up-submitting' | 'existing' | 'verify-waiting' | 'verify-cooldown' | 'recover-request' | 'update-valid' | 'update-invalid' | 'update-complete'

function AdditionalAuth({ locale, state }: { locale: SpecLocale; state: AdditionalAuthState }) {
  if (state === 'rejected' || state === 'unverified' || state === 'existing' || state === 'verify-waiting' || state === 'verify-cooldown' || state === 'update-invalid' || state === 'update-complete') {
    const data = {
      rejected: { icon: <XCircle />, tone: 'danger' as const, title: tx(locale, 'ایمیل یا رمز درست نیست', 'Email or password is incorrect'), body: tx(locale, 'برای محافظت از حریم خصوصی مشخص نمی‌کنیم کدام مورد اشتباه است.', 'For privacy, we do not reveal which value is incorrect.'), action: tx(locale, 'تلاش دوباره', 'Try again') },
      unverified: { icon: <MailCheck />, tone: 'warning' as const, title: tx(locale, 'ابتدا ایمیلت را تأیید کن', 'Verify your email first'), body: tx(locale, 'حساب وجود دارد اما هنوز تأیید نشده است. می‌توانی لینک تازه بگیری.', 'The account exists but is not verified. You can request a fresh link.'), action: tx(locale, 'ارسال لینک تازه', 'Send new link') },
      existing: { icon: <KeyRound />, tone: 'info' as const, title: tx(locale, 'اگر قبلاً حساب ساخته‌ای، مسیر امن در دسترس است', 'Safe account-access options are available'), body: tx(locale, 'برای امنیت، وجود یا وضعیت حساب را اعلام نمی‌کنیم. می‌توانی وارد شوی یا پاسخ یکسان بازیابی رمز را دریافت کنی.', 'For security, we do not disclose whether an account exists or its status. You can sign in or use the same privacy-safe recovery response.'), action: tx(locale, 'رفتن به ورود یا بازیابی رمز', 'Sign in or recover password') },
      'verify-waiting': { icon: <Clock3 />, tone: 'info' as const, title: tx(locale, 'در انتظار تأیید ایمیل', 'Waiting for email verification'), body: tx(locale, 'بعد از بازکردن لینک می‌توانی به همین صفحه برگردی؛ پیشرفتت از دست نمی‌رود.', 'Return here after opening the link; your progress is preserved.'), action: tx(locale, 'بررسی وضعیت', 'Check status') },
      'verify-cooldown': { icon: <Clock3 />, tone: 'warning' as const, title: tx(locale, 'لینک تازه همین حالا ارسال شد', 'A fresh link was just sent'), body: tx(locale, 'برای ارسال دوباره ۵۴ ثانیه صبر کن. ایمیل یا تب را می‌توانی تغییر بدهی.', 'Wait 54 seconds before resending. You can change the email or leave this tab.'), action: tx(locale, 'ارسال دوباره در ۰۰:۵۴', 'Resend in 00:54') },
      'update-invalid': { icon: <ShieldX />, tone: 'warning' as const, title: tx(locale, 'لینک تغییر رمز معتبر نیست', 'This password link is invalid'), body: tx(locale, 'لینک ممکن است منقضی یا قبلاً استفاده شده باشد. رمز فعلی تغییر نکرده و می‌توانی از مسیر بازیابی لینک تازه بگیری.', 'The link may be expired or already used. Your existing password is unchanged; request a fresh link from recovery.'), action: tx(locale, 'دریافت لینک تازه', 'Request a new recovery link') },
      'update-complete': { icon: <BadgeCheck />, tone: 'success' as const, title: tx(locale, 'رمز با موفقیت تغییر کرد', 'Password updated'), body: tx(locale, 'برای امنیت، ورودهای قدیمی پایان یافته‌اند. با رمز جدید وارد شو.', 'Older sessions have ended for security. Sign in with your new password.'), action: tx(locale, 'ورود با رمز جدید', 'Sign in with new password') },
    }[state]
    return <StateScreen actions={<><SpecButton disabled={state === 'verify-cooldown'}>{data.action}</SpecButton>{state === 'existing' ? <SpecButton kind="secondary">{tx(locale, 'بازیابی رمز', 'Recover password')}</SpecButton> : null}</>} body={data.body} eyebrow={tx(locale, 'حساب و امنیت', 'Account & security')} icon={data.icon} locale={locale} title={data.title} tone={data.tone} />
  }

  const signUp = state === 'sign-up' || state === 'sign-up-validation' || state === 'sign-up-submitting'
  const update = state === 'update-valid'
  const recover = state === 'recover-request'
  const submitting = state === 'sign-up-submitting'
  return (
    <AuthFrame locale={locale} step={update ? tx(locale, 'رمز جدید', 'New password') : recover ? tx(locale, 'بازیابی', 'Recovery') : signUp ? tx(locale, 'ساخت حساب', 'Create account') : tx(locale, 'ورود امن', 'Secure sign in')}>
      <SpecCard>
        <SpecBadge tone="brand">{tx(locale, 'حساب Momentum', 'Momentum account')}</SpecBadge>
        <h1>{update ? tx(locale, 'رمز تازه انتخاب کن', 'Choose a new password') : recover ? tx(locale, 'لینک بازیابی بگیر', 'Request a recovery link') : signUp ? tx(locale, 'حسابت را بساز', 'Create your account') : tx(locale, 'خوش آمدی', 'Welcome back')}</h1>
        <p>{recover ? tx(locale, 'برای حریم خصوصی، پاسخ همیشه یکسان است.', 'For privacy, the response is always the same.') : tx(locale, 'اطلاعات واردشده تا اصلاح خطا حفظ می‌شوند.', 'Entered values remain available while errors are corrected.')}</p>
        {signUp ? <>
          <SpecField error={state === 'sign-up-validation' ? tx(locale, 'ایمیل معتبر لازم است.', 'Enter a valid email.') : undefined} label={tx(locale, 'ایمیل', 'Email')} value={state === 'sign-up-validation' ? 'sara@' : 'sara@example.com'} />
          <SpecField error={state === 'sign-up-validation' ? tx(locale, 'حداقل ۸ نویسه لازم است.', 'Use at least 8 characters.') : undefined} label={tx(locale, 'رمز عبور', 'Password')} value={state === 'sign-up-validation' ? 'short' : '••••••••••'} />
          <SpecCallout title={tx(locale, 'دو انتخاب مستقل و نسخه‌دار', 'Two independent, versioned choices')} tone={state === 'sign-up-validation' ? 'warning' : 'info'}>{tx(locale, 'بازکردن یا انتخاب یک سند، انتخاب سند دیگر را تغییر نمی‌دهد.', 'Opening or selecting one document never changes the other.')}</SpecCallout>
          <div className="mo-spec__consent-stack">
            <SpecConsentOption checked={state !== 'sign-up-validation'} description={tx(locale, 'متن کامل پیش از انتخاب قابل بازکردن است.', 'Open the full document before choosing.')} error={state === 'sign-up-validation' ? tx(locale, 'شرایط استفاده را جداگانه تأیید کن.', 'Accept the Terms separately.') : undefined} label={tx(locale, 'شرایط استفاده', 'Terms of Use')} version="v1.0 · 2026-08-14" />
            <SpecConsentOption checked description={tx(locale, 'استفاده، نگه‌داری، دریافت و حذف داده.', 'Data use, retention, export, and deletion.')} label={tx(locale, 'سیاست حریم خصوصی', 'Privacy Policy')} version="v1.0 · 2026-08-14" />
          </div>
        </> : update ? <>
          <SpecField label={tx(locale, 'رمز جدید', 'New password')} value="Momentum-2026" />
          <SpecField label={tx(locale, 'تکرار رمز', 'Confirm password')} value="Momentum-2026" />
        </> : <>
          <SpecField label={tx(locale, 'ایمیل', 'Email')} value="sara@example.com" />
          {recover ? null : <SpecField label={tx(locale, 'رمز عبور', 'Password')} value="••••••••••" />}
        </>}
        <div className="mo-spec__actions">
          <SpecButton disabled={submitting}>{submitting ? <><LoaderCircle className="orbit-spin" />{tx(locale, 'در حال ساخت حساب…', 'Creating account…')}</> : update ? tx(locale, 'ذخیره رمز', 'Save password') : recover ? tx(locale, 'ارسال لینک امن', 'Send secure link') : signUp ? tx(locale, 'ساخت حساب', 'Create account') : tx(locale, 'ورود', 'Sign in')}</SpecButton>
          {!signUp && !update && !recover ? <><SpecButton kind="ghost">{tx(locale, 'رمز را فراموش کردم', 'Forgot password')}</SpecButton><SpecButton kind="secondary">{tx(locale, 'ساخت حساب جدید', 'Create account')}</SpecButton></> : null}
          {recover ? <SpecButton kind="secondary">{tx(locale, 'بازگشت به ورود', 'Back to sign in')}</SpecButton> : null}
        </div>
      </SpecCard>
    </AuthFrame>
  )
}

function renderAdditional(state: AdditionalAuthState) { return (_: unknown, context: { globals: Record<string, unknown> }) => <AdditionalAuth locale={localeFromStory(context.globals.locale)} state={state} /> }

const meta = {
  title: 'Screens/Complete product/Auth states',
  parameters: {
    controls: { disable: true },
    layout: 'fullscreen',
    docs: { description: { component: 'Complete authentication state coverage using deterministic, offline fixtures. These designs do not call Supabase or any network API.' } },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SignInDefault: Story = { parameters: momentumEvidence(['AUTH-01'], '/[locale]/auth/sign-in'), render: renderAdditional('sign-in') }
export const SignInValidation: Story = { parameters: momentumEvidence(['AUTH-02'], '/[locale]/auth/sign-in'), render: renderForm('validation') }
export const SignInSubmitting: Story = { parameters: momentumEvidence(['AUTH-03'], '/[locale]/auth/sign-in'), render: renderForm('submitting') }
export const SignInRejected: Story = { parameters: momentumEvidence(['AUTH-04'], '/[locale]/auth/sign-in'), render: renderAdditional('rejected') }
export const SignInUnverified: Story = { parameters: momentumEvidence(['AUTH-05'], '/[locale]/auth/sign-in'), render: renderAdditional('unverified') }
export const RateLimited: Story = { parameters: momentumEvidence(['AUTH-06'], '/[locale]/auth/sign-in'), render: renderState('rate-limit') }
export const AuthOffline: Story = { parameters: momentumEvidence(['AUTH-06'], '/[locale]/auth/sign-in'), render: renderState('offline') }
export const SignUpDefault: Story = { parameters: momentumEvidence(['AUTH-07'], '/[locale]/auth/sign-up'), render: renderAdditional('sign-up') }
export const SignUpValidation: Story = { parameters: momentumEvidence(['AUTH-08'], '/[locale]/auth/sign-up'), render: renderAdditional('sign-up-validation') }
export const SignUpSubmitting: Story = { parameters: momentumEvidence(['AUTH-09'], '/[locale]/auth/sign-up'), render: renderAdditional('sign-up-submitting') }
export const SignUpExistingAccount: Story = { parameters: momentumEvidence(['AUTH-10'], '/[locale]/auth/sign-up'), render: renderAdditional('existing') }
export const SignUpConfirmation: Story = { parameters: momentumEvidence(['AUTH-11'], '/[locale]/auth/sign-up'), render: renderState('confirmation') }
export const VerifyWaiting: Story = { parameters: momentumEvidence(['AUTH-12'], '/[locale]/auth/verify'), render: renderAdditional('verify-waiting') }
export const VerifyResendCooldown: Story = { parameters: momentumEvidence(['AUTH-13'], '/[locale]/auth/verify'), render: renderAdditional('verify-cooldown') }
export const VerifyExpired: Story = { parameters: momentumEvidence(['AUTH-14'], '/[locale]/auth/verify'), render: renderState('expired') }
export const VerifySuccess: Story = { parameters: momentumEvidence(['AUTH-15'], '/[locale]/auth/verify'), render: renderState('verified') }
export const RecoverPasswordRequest: Story = { parameters: momentumEvidence(['AUTH-16'], '/[locale]/auth/recover'), render: renderAdditional('recover-request') }
export const RecoverEmailSent: Story = { parameters: momentumEvidence(['AUTH-17'], '/[locale]/auth/recover'), render: renderState('recover-sent') }
export const RecoverEmailRateLimited: Story = { parameters: momentumEvidence(['AUTH-17'], '/[locale]/auth/recover'), render: renderState('recover-rate-limit') }
export const UpdatePasswordValid: Story = { parameters: momentumEvidence(['AUTH-18'], '/[locale]/auth/update-password'), render: renderAdditional('update-valid') }
export const UpdatePasswordInvalidLink: Story = { parameters: momentumEvidence(['AUTH-18'], '/[locale]/auth/update-password'), render: renderAdditional('update-invalid') }
export const UpdatePasswordMismatch: Story = { parameters: momentumEvidence(['AUTH-18'], '/[locale]/auth/update-password'), render: renderForm('password-mismatch') }
export const UpdatePasswordComplete: Story = { parameters: momentumEvidence(['AUTH-18'], '/[locale]/auth/update-password'), render: renderAdditional('update-complete') }
export const AuthServerError: Story = { parameters: momentumEvidence(['AUTH-06'], '/[locale]/auth/sign-in'), render: renderState('server-error') }

export const MobileVerification: Story = {
  parameters: { ...momentumEvidence(['AUTH-11'], '/[locale]/auth/sign-up'), viewport: { defaultViewport: 'mobile1' } },
  render: renderState('confirmation'),
}

export const AuthHelpEscalation: Story = {
  parameters: momentumEvidence(['AUTH-06'], '/[locale]/auth/sign-in'),
  render: (_: unknown, context: { globals: Record<string, unknown> }) => {
    const locale = localeFromStory(context.globals.locale)
    return <StateScreen body={tx(locale, 'کد خطا و زمان رویداد را همراه درخواستت می‌فرستیم؛ رمز عبور هرگز ارسال نمی‌شود.', 'We include the error code and event time with your request; your password is never sent.')} icon={<AlertTriangle />} locale={locale} note={<SpecCallout title={tx(locale, 'کد پیگیری: AUTH-8F21', 'Reference: AUTH-8F21')} tone="neutral">{tx(locale, 'این کد برای پشتیبانی قابل مشاهده است.', 'Support can use this code to investigate.')}</SpecCallout>} title={tx(locale, 'برای ورود کمک بگیر', 'Get help signing in')} tone="info" />
  },
}
