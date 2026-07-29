import {
  lazy,
  Suspense,
  useState,
  type FormEvent,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  FileJson,
  LockKeyhole,
  Sparkles,
  Target,
} from 'lucide-react'
import { TemplateDownloadButton } from '../../components/feedback/TemplateDownloadButton'
import { Brand } from '../../components/layout/Brand'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { buttonClassNames } from '../../components/ui/button-styles'
import { IconTile } from '../../components/ui/IconTile'
import { Surface } from '../../components/ui/Surface'
import { APP_CONFIG } from '../../config/app'
import {
  formatJalaliDate,
  getTodayIso,
  toPersianDigits,
} from '../../lib/dates/jalali'
import type { UserProfile, WeeklyMealPlan } from '../../types/domain'

const PlanImportPanel = lazy(() =>
  import('../plans/import/PlanImportPanel').then((module) => ({
    default: module.PlanImportPanel,
  })),
)

interface OnboardingProps {
  onComplete: (profile: UserProfile, plan?: WeeklyMealPlan) => void
}

const promptSteps = [
  {
    title: 'تمپلیت را دانلود کن',
    body: 'فایل Markdown شامل سؤال‌ها و قرارداد دقیق Momentum است.',
  },
  {
    title: 'آن را برای ChatGPT بفرست',
    body: 'لازم نیست جای‌خالی‌ها را خودت پر کنی؛ ChatGPT همه اطلاعات ناقص را یک‌جا از تو می‌پرسد.',
  },
  {
    title: 'به سؤال‌ها پاسخ بده',
    body: 'در صورت داشتن InBody یا گزارش مشابه، تصویر یا PDF را همان‌جا به ChatGPT پیوست کن.',
  },
  {
    title: 'JSON نهایی را اینجا وارد کن',
    body: 'پاسخ نهایی ChatGPT را به‌صورت فایل JSON ذخیره و از بخش پایین انتخاب کن.',
  },
]

const onboardingSteps = ['welcome', 'import', 'review'] as const

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [stagedPlan, setStagedPlan] = useState<WeeklyMealPlan>()
  const progress = ((step + 1) / onboardingSteps.length) * 100

  const goNext = () => {
    if (step === 0) {
      setStep(1)
      return
    }

    if (step === 1 && stagedPlan) {
      setStep(2)
    }
  }

  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0))
  }

  const finish = (event: FormEvent) => {
    event.preventDefault()
    if (!stagedPlan) return

    const imported = stagedPlan.profile
    onComplete(
      {
        name: imported.name,
        startWeightKg: imported.startWeightKg,
        currentWeightKg: imported.currentWeightKg,
        targetWeightKg: imported.targetWeightKg,
        heightCm: imported.heightCm,
        journeyStartDate: getTodayIso(),
        goalDate: imported.goalDate,
        age: imported.age,
        sex: imported.sex,
        activityLevel: imported.activityLevel,
        bodyComposition: imported.bodyComposition,
      },
      stagedPlan,
    )
  }

  const nextLabel =
    step === 0
      ? 'شروع مسیر'
      : stagedPlan
        ? 'مرور برنامه'
        : 'فایل یا دمو را انتخاب کن'

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 desktop:grid desktop:place-items-center desktop:py-10">
      <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto w-full max-w-[760px]">
        <div className="mb-4 flex items-center justify-between desktop:mb-5">
          <Brand />
          <Badge className="bg-[var(--color-surface)] text-[var(--color-text-muted)]">
            راه‌اندازی اولیه
          </Badge>
        </div>

        <form
          className="glass-panel overflow-hidden rounded-[30px]"
          onSubmit={finish}
        >
          <div className="h-1 bg-[var(--color-surface-muted)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-strong),var(--color-accent))] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="h-[clamp(520px,calc(100dvh-165px),700px)] overflow-y-auto overscroll-contain p-5 desktop:h-[clamp(560px,calc(100dvh-230px),700px)] desktop:p-8">
            {step === 0 && (
              <div className="onboarding-step mx-auto flex min-h-[440px] max-w-lg flex-col justify-center text-center">
                <IconTile className="mx-auto size-20 rounded-[26px] border border-[var(--color-border)]">
                  <Target aria-hidden="true" size={36} strokeWidth={1.7} />
                </IconTile>
                <p className="mt-7 text-xs font-bold text-[var(--color-accent)]">
                  خوش آمدید
                </p>
                <h1 className="mt-3 text-3xl font-black leading-[1.5] text-[var(--color-text)] desktop:text-4xl">
                  {APP_CONFIG.name}{' '}
                  <span className="mt-1 block text-xl text-[var(--color-text-secondary)]">
                    {APP_CONFIG.tagline}
                  </span>
                </h1>
                <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--color-text-secondary)]">
                  برای شروع، یک فایل برنامه معتبر وارد کن یا دموی آماده را انتخاب کن.
                  پروفایل، هدف‌ها و تمام وعده‌ها از همان فایل ساخته می‌شوند.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="onboarding-step mx-auto max-w-xl">
                <div className="flex items-start justify-between gap-4">
                  <IconTile className="size-14 rounded-[20px]">
                    <FileJson aria-hidden="true" size={25} />
                  </IconTile>
                  <Badge tone="accent">
                    لازم برای ورود
                  </Badge>
                </div>

                <p className="mt-4 text-xs font-bold text-[var(--color-accent)]">
                  ساخت برنامه با ChatGPT
                </p>
                <h1 className="mt-2 text-2xl font-black text-[var(--color-text)]">
                  فایل برنامه‌ات را آماده کن
                </h1>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Momentum به هوش مصنوعی متصل نیست. پرامپت را دانلود می‌کنی، بیرون
                  از برنامه برای ChatGPT می‌فرستی و فایل JSON نهایی را برمی‌گردانی.
                </p>

                <div className="mt-4 grid gap-2 desktop:grid-cols-2">
                  {promptSteps.map((item, index) => (
                    <Surface
                      className="flex gap-3 rounded-2xl p-3"
                      key={item.title}
                      variant="muted"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[11px] font-black text-[var(--color-on-accent)]">
                        {toPersianDigits(index + 1)}
                      </span>
                      <div>
                        <p className="text-[11px] font-black text-[var(--color-text)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
                          {item.body}
                        </p>
                      </div>
                    </Surface>
                  ))}
                </div>

                <TemplateDownloadButton
                  buttonClassName={buttonClassNames({
                    block: true,
                    className: 'min-h-13 justify-between text-right disabled:cursor-wait disabled:opacity-80',
                    size: 'lg',
                    variant: 'highlight-soft',
                  })}
                  className="mt-4"
                >
                  <span>
                    <span className="block text-xs font-black text-[var(--color-text)]">
                      دانلود پرامپت کامل Momentum
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--color-text-secondary)]">
                      برای ارسال به ChatGPT یا هر مدل خارجی دیگر
                    </span>
                  </span>
                </TemplateDownloadButton>

                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--color-border)]" />
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
                    فایل آماده یا دموی محصول
                  </span>
                  <span className="h-px flex-1 bg-[var(--color-border)]" />
                </div>

                <Suspense
                  fallback={
                    <div
                      aria-label="در حال آماده‌سازی آپلود"
                      className="min-h-44 rounded-[24px] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-5"
                      role="status"
                    >
                      <div className="skeleton mx-auto size-14 rounded-[18px]" />
                      <div className="skeleton mx-auto mt-4 h-3 w-36" />
                      <div className="skeleton mx-auto mt-3 h-2.5 w-56 max-w-full" />
                      <div className="skeleton mx-auto mt-5 h-11 w-32" />
                    </div>
                  }
                >
                  <PlanImportPanel
                    confirmLabel="انتخاب این برنامه"
                    onClearStagedPlan={() => setStagedPlan(undefined)}
                    onConfirm={setStagedPlan}
                    stagedPlan={stagedPlan}
                  />
                </Suspense>
              </div>
            )}

            {step === 2 && stagedPlan && (
              <div className="onboarding-step mx-auto max-w-lg">
                <IconTile className="size-14 rounded-[20px]">
                  <Sparkles aria-hidden="true" size={25} />
                </IconTile>
                <p className="mt-6 text-xs font-bold text-[var(--color-accent)]">
                  آماده شروع
                </p>
                <h1 className="mt-2 text-2xl font-black text-[var(--color-text)]">
                  خلاصه مسیر {stagedPlan.profile.name}
                </h1>
                <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
                  برنامه «{stagedPlan.planName}» برای ورود به خانه انتخاب شده است.
                </p>

                <div className="mt-7 grid grid-cols-2 gap-3">
                  {[
                    [
                      'وزن فعلی',
                      `${toPersianDigits(stagedPlan.profile.currentWeightKg)} کیلو`,
                    ],
                    [
                      'وزن هدف',
                      `${toPersianDigits(stagedPlan.profile.targetWeightKg)} کیلو`,
                    ],
                    [
                      'قد',
                      `${toPersianDigits(stagedPlan.profile.heightCm)} سانتی‌متر`,
                    ],
                    [
                      'تاریخ هدف',
                      formatJalaliDate(stagedPlan.profile.goalDate, 'long'),
                    ],
                  ].map(([label, value]) => (
                    <Surface
                      className="rounded-2xl p-4"
                      key={label}
                      variant="muted"
                    >
                      <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-black text-[var(--color-text)]">
                        {value}
                      </p>
                    </Surface>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] p-4">
                  <LockKeyhole
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--color-accent)]"
                    size={18}
                  />
                  <p className="text-xs leading-6 text-[var(--color-text-secondary)]">
                    پروفایل، برنامه و انتخاب‌های روزانه فقط روی همین دستگاه ذخیره
                    می‌شوند و برای سرویسی ارسال نمی‌شوند.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-6 py-3 desktop:px-10 desktop:py-4">
            <Button
              className={step === 0 ? 'pointer-events-none opacity-0' : undefined}
              onClick={goBack}
              size="lg"
              variant="ghost"
            >
              <ArrowRight aria-hidden="true" size={18} />
              قبلی
            </Button>

            {step < 2 ? (
              <Button
                disabled={step === 1 && !stagedPlan}
                onClick={goNext}
                size="lg"
              >
                {nextLabel}
                {step === 0 ? (
                  <ChevronLeft aria-hidden="true" size={18} />
                ) : (
                  <ArrowLeft aria-hidden="true" size={18} />
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                type="submit"
              >
                ورود به خانه
                <Check aria-hidden="true" size={18} />
              </Button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
