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

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [stagedPlan, setStagedPlan] = useState<WeeklyMealPlan>()
  const progress = ((step + 1) / 3) * 100

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
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
            راه‌اندازی اولیه
          </span>
        </div>

        <form
          className="glass-panel overflow-hidden rounded-[30px]"
          onSubmit={finish}
        >
          <div className="h-1 bg-[var(--surface-soft)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--emerald-strong),var(--emerald))] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="h-[clamp(520px,calc(100dvh-165px),700px)] overflow-y-auto overscroll-contain p-5 desktop:h-[clamp(560px,calc(100dvh-230px),700px)] desktop:p-8">
            {step === 0 && (
              <div className="onboarding-step mx-auto flex min-h-[440px] max-w-lg flex-col justify-center text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-[26px] border border-[var(--border)] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <Target aria-hidden="true" size={36} strokeWidth={1.7} />
                </div>
                <p className="mt-7 text-xs font-bold text-[var(--emerald)]">
                  خوش آمدید
                </p>
                <h1 className="mt-3 text-3xl font-black leading-[1.5] text-[var(--text-primary)] desktop:text-4xl">
                  Momentum{' '}
                  <span className="mt-1 block text-xl text-[var(--text-secondary)]">
                    ریتم پایدار، پیشرفت واقعی
                  </span>
                </h1>
                <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                  برای شروع، یک فایل برنامه معتبر وارد کن یا دموی آماده را انتخاب کن.
                  پروفایل، هدف‌ها و تمام وعده‌ها از همان فایل ساخته می‌شوند.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="onboarding-step mx-auto max-w-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid size-14 shrink-0 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                    <FileJson aria-hidden="true" size={25} />
                  </div>
                  <span className="rounded-full border border-[var(--emerald)] bg-[var(--emerald-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--emerald)]">
                    لازم برای ورود
                  </span>
                </div>

                <p className="mt-4 text-xs font-bold text-[var(--emerald)]">
                  ساخت برنامه با ChatGPT
                </p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  فایل برنامه‌ات را آماده کن
                </h1>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                  Momentum به هوش مصنوعی متصل نیست. پرامپت را دانلود می‌کنی، بیرون
                  از برنامه برای ChatGPT می‌فرستی و فایل JSON نهایی را برمی‌گردانی.
                </p>

                <div className="mt-4 grid gap-2 desktop:grid-cols-2">
                  {promptSteps.map((item, index) => (
                    <div
                      className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                      key={item.title}
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--emerald)] text-[11px] font-black text-[#07110d]">
                        {toPersianDigits(index + 1)}
                      </span>
                      <div>
                        <p className="text-[11px] font-black text-[var(--text-primary)]">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <TemplateDownloadButton
                  buttonClassName="flex min-h-13 w-full items-center justify-between gap-4 rounded-2xl border border-[var(--gold)] bg-[var(--gold-soft)] px-4 text-right transition hover:bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] disabled:cursor-wait disabled:opacity-80"
                  className="mt-4"
                >
                  <span>
                    <span className="block text-xs font-black text-[var(--text-primary)]">
                      دانلود پرامپت کامل Momentum
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                      برای ارسال به ChatGPT یا هر مدل خارجی دیگر
                    </span>
                  </span>
                </TemplateDownloadButton>

                <div className="my-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-[var(--border)]" />
                  <span className="text-[10px] font-bold text-[var(--text-muted)]">
                    فایل آماده یا دموی محصول
                  </span>
                  <span className="h-px flex-1 bg-[var(--border)]" />
                </div>

                <Suspense
                  fallback={
                    <div
                      aria-label="در حال آماده‌سازی آپلود"
                      className="min-h-44 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-5"
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
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <Sparkles aria-hidden="true" size={25} />
                </div>
                <p className="mt-6 text-xs font-bold text-[var(--emerald)]">
                  آماده شروع
                </p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  خلاصه مسیر {stagedPlan.profile.name}
                </h1>
                <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
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
                    <div
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                      key={label}
                    >
                      <p className="text-[10px] font-bold text-[var(--text-muted)]">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-black text-[var(--text-primary)]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--emerald-soft)] p-4">
                  <LockKeyhole
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--emerald)]"
                    size={18}
                  />
                  <p className="text-xs leading-6 text-[var(--text-secondary)]">
                    پروفایل، برنامه و انتخاب‌های روزانه فقط روی همین دستگاه ذخیره
                    می‌شوند و برای سرویسی ارسال نمی‌شوند.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-3 desktop:px-10 desktop:py-4">
            <button
              className={`flex min-h-12 items-center gap-2 rounded-2xl px-4 text-sm font-bold transition ${
                step === 0
                  ? 'pointer-events-none opacity-0'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]'
              }`}
              onClick={goBack}
              type="button"
            >
              <ArrowRight aria-hidden="true" size={18} />
              قبلی
            </button>

            {step < 2 ? (
              <button
                className="flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--emerald)] px-5 text-sm font-black text-[#07110d] shadow-[0_10px_28px_rgba(70,205,145,0.2)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
                disabled={step === 1 && !stagedPlan}
                onClick={goNext}
                type="button"
              >
                {nextLabel}
                {step === 0 ? (
                  <ChevronLeft aria-hidden="true" size={18} />
                ) : (
                  <ArrowLeft aria-hidden="true" size={18} />
                )}
              </button>
            ) : (
              <button
                className="flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--emerald)] px-5 text-sm font-black text-[#07110d] shadow-[0_10px_28px_rgba(70,205,145,0.2)]"
                type="submit"
              >
                ورود به خانه
                <Check aria-hidden="true" size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
