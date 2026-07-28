import {
  lazy,
  Suspense,
  useId,
  useState,
  type FormEvent,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Download,
  FileJson,
  LockKeyhole,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { Brand } from '../../components/layout/Brand'
import {
  formatJalaliDate,
  getTodayIso,
  toPersianDigits,
} from '../../lib/dates/jalali'
import type { ISODate, UserProfile, WeeklyMealPlan } from '../../types/domain'

const PlanImportPanel = lazy(() =>
  import('../plans/import/PlanImportPanel').then((module) => ({
    default: module.PlanImportPanel,
  })),
)

interface OnboardingProps {
  onComplete: (profile: UserProfile, plan?: WeeklyMealPlan) => void
}

interface OnboardingForm {
  name: string
  heightCm: string
  startWeightKg: string
  currentWeightKg: string
  targetWeightKg: string
  goalDate: ISODate
}

function getDefaultGoalDate(): ISODate {
  const date = new Date(`${getTodayIso()}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 90)
  return date.toISOString().slice(0, 10) as ISODate
}

function createInitialForm(): OnboardingForm {
  return {
    name: '',
    heightCm: '',
    startWeightKg: '',
    currentWeightKg: '',
    targetWeightKg: '',
    goalDate: getDefaultGoalDate(),
  }
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  suffix: string
}) {
  const inputId = useId()

  return (
    <div>
      <label
        className="mb-2 block text-xs font-bold text-[var(--text-secondary)]"
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="flex min-h-13 items-center rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 transition focus-within:border-[var(--emerald)]">
        <input
          className="min-w-0 flex-1 bg-transparent text-left text-lg font-black text-[var(--text-primary)] outline-none"
          dir="ltr"
          id={inputId}
          inputMode="decimal"
          max="350"
          min="35"
          onChange={(event) => onChange(event.target.value)}
          required
          type="number"
          value={value}
        />
        <span className="text-xs font-bold text-[var(--text-muted)]">{suffix}</span>
      </div>
    </div>
  )
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<OnboardingForm>(createInitialForm)
  const [error, setError] = useState<string>()
  const [stagedPlan, setStagedPlan] = useState<WeeklyMealPlan>()
  const progress = ((step + 1) / 4) * 100

  const stagePlan = (plan: WeeklyMealPlan) => {
    setStagedPlan(plan)

    if (plan.profile) {
      setForm({
        name: plan.profile.name,
        heightCm: String(plan.profile.heightCm),
        startWeightKg: String(
          plan.profile.startWeightKg ?? plan.profile.currentWeightKg,
        ),
        currentWeightKg: String(plan.profile.currentWeightKg),
        targetWeightKg: String(plan.profile.targetWeightKg),
        goalDate: plan.profile.goalDate ?? getDefaultGoalDate(),
      })
    }
  }

  const clearPlan = () => {
    setStagedPlan(undefined)
    setForm(createInitialForm())
  }

  const validateManualProfile = () => {
    const height = Number(form.heightCm)
    const current = Number(form.currentWeightKg)
    const target = Number(form.targetWeightKg)

    if (!form.name.trim()) {
      return 'نام را وارد کنید.'
    }

    if (!height || height < 100 || height > 250) {
      return 'قد را به‌صورت عددی و در بازه معتبر وارد کنید.'
    }

    if ([current, target].some((value) => !value || value < 35 || value > 350)) {
      return 'وزن فعلی و وزن هدف را در بازه معتبر وارد کنید.'
    }

    return undefined
  }

  const goNext = () => {
    if (step === 1) {
      setError(undefined)
      setStep(stagedPlan?.profile ? 3 : 2)
      return
    }

    if (step === 2) {
      const validationError = validateManualProfile()

      if (validationError) {
        setError(validationError)
        return
      }

      setForm((current) => ({
        ...current,
        startWeightKg: current.startWeightKg || current.currentWeightKg,
      }))
      setError(undefined)
      setStep(3)
      return
    }

    setError(undefined)
    setStep(1)
  }

  const goBack = () => {
    setError(undefined)

    if (step === 3) {
      setStep(stagedPlan?.profile ? 1 : 2)
      return
    }

    setStep((current) => Math.max(current - 1, 0))
  }

  const finish = (event: FormEvent) => {
    event.preventDefault()
    const currentWeightKg = Number(form.currentWeightKg)

    onComplete(
      {
        name: form.name.trim(),
        startWeightKg: Number(form.startWeightKg) || currentWeightKg,
        currentWeightKg,
        targetWeightKg: Number(form.targetWeightKg),
        heightCm: Number(form.heightCm),
        journeyStartDate: getTodayIso(),
        goalDate: form.goalDate,
      },
      stagedPlan,
    )
  }

  const nextLabel =
    step === 0
      ? 'شروع مسیر'
      : step === 1
        ? stagedPlan?.profile
          ? 'استفاده از این فایل'
          : stagedPlan
            ? 'تکمیل اطلاعات'
            : 'رد کردن و ورود دستی'
        : 'مرور اطلاعات'

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-5 desktop:grid desktop:place-items-center desktop:py-10">
      <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto w-full max-w-[760px]">
        <div className="mb-5 flex items-center justify-between">
          <Brand />
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
            راه‌اندازی اولیه
          </span>
        </div>

        <form className="glass-panel overflow-hidden rounded-[30px]" onSubmit={finish}>
          <div className="h-1 bg-[var(--surface-soft)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,var(--emerald-strong),var(--emerald))] transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="min-h-[520px] p-6 desktop:p-10">
            {step === 0 && (
              <div className="mx-auto flex min-h-[440px] max-w-lg flex-col justify-center text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-[26px] border border-[var(--border)] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <Target aria-hidden="true" size={36} strokeWidth={1.7} />
                </div>
                <p className="mt-7 text-xs font-bold text-[var(--emerald)]">خوش آمدید</p>
                <h1 className="mt-3 text-3xl font-black leading-[1.5] text-[var(--text-primary)] desktop:text-4xl">
                  Momentum{' '}
                  <span className="mt-1 block text-xl text-[var(--text-secondary)]">
                    ریتم پایدار، پیشرفت واقعی
                  </span>
                </h1>
                <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                  فایل برنامه می‌تواند همه اطلاعات لازم را یک‌جا وارد کند. اگر فایل نداری،
                  راه‌اندازی دستی فقط یک مرحله کوتاه است.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="mx-auto max-w-xl">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <FileJson aria-hidden="true" size={25} />
                </div>
                <div className="mt-6 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--emerald)]">
                      شروع سریع با فایل
                    </p>
                    <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                      برنامه آماده داری؟
                    </h1>
                  </div>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    اختیاری
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  فایل جدید Momentum علاوه بر وعده‌ها، نام، قد، وزن فعلی، وزن هدف و تاریخ
                  هدف را هم وارد می‌کند. فایل‌های قدیمی همچنان پذیرفته می‌شوند و فقط
                  اطلاعات پایه را دستی می‌پرسند.
                </p>

                <a
                  className="mt-5 flex min-h-13 items-center justify-between gap-4 rounded-2xl border border-[var(--gold)] bg-[var(--gold-soft)] px-4 text-right transition hover:bg-[color-mix(in_srgb,var(--gold)_18%,transparent)]"
                  download
                  href="/templates/momentum-weekly-plan-prompt.md"
                >
                  <span>
                    <span className="block text-xs font-black text-[var(--text-primary)]">
                      هنوز فایل نداری؟
                    </span>
                    <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                      تمپلیت کامل را دانلود و برای ChatGPT ارسال کن
                    </span>
                  </span>
                  <Download aria-hidden="true" className="shrink-0 text-[var(--gold)]" size={20} />
                </a>

                <div className="mt-5">
                  <Suspense
                    fallback={
                      <div
                        className="grid min-h-44 place-items-center rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)]"
                        role="status"
                      >
                        <p className="animate-pulse text-xs font-bold text-[var(--text-muted)]">
                          در حال آماده‌سازی آپلود…
                        </p>
                      </div>
                    }
                  >
                    <PlanImportPanel
                      confirmLabel="انتخاب این فایل"
                      onClearStagedPlan={clearPlan}
                      onConfirm={stagePlan}
                      stagedPlan={stagedPlan}
                    />
                  </Suspense>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mx-auto max-w-xl">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <UserRound aria-hidden="true" size={25} />
                </div>
                <p className="mt-6 text-xs font-bold text-[var(--emerald)]">
                  ورود دستی
                </p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  اطلاعات پایه را وارد کن
                </h1>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  همین چهار مورد برای ساخت پروفایل کافی است. وزن شروع برابر وزن فعلی و
                  تاریخ هدف اولیه ۹۰ روز بعد در نظر گرفته می‌شود؛ هر دو بعداً قابل ویرایش‌اند.
                </p>

                <div className="mt-7 grid gap-4 desktop:grid-cols-2">
                  <label className="desktop:col-span-2">
                    <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                      نام
                    </span>
                    <input
                      autoFocus
                      className="min-h-13 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-base font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--emerald)]"
                      onChange={(event) => setForm({ ...form, name: event.target.value })}
                      value={form.name}
                    />
                  </label>
                  <NumberField
                    label="قد"
                    onChange={(heightCm) => setForm({ ...form, heightCm })}
                    suffix="سانتی‌متر"
                    value={form.heightCm}
                  />
                  <NumberField
                    label="وزن فعلی"
                    onChange={(currentWeightKg) =>
                      setForm({ ...form, currentWeightKg })
                    }
                    suffix="کیلوگرم"
                    value={form.currentWeightKg}
                  />
                  <div className="desktop:col-span-2">
                    <NumberField
                      label="وزن هدف"
                      onChange={(targetWeightKg) =>
                        setForm({ ...form, targetWeightKg })
                      }
                      suffix="کیلوگرم"
                      value={form.targetWeightKg}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto max-w-lg">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <Sparkles aria-hidden="true" size={25} />
                </div>
                <p className="mt-6 text-xs font-bold text-[var(--emerald)]">آماده شروع</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  خلاصه مسیر {form.name}
                </h1>
                <div className="mt-7 grid grid-cols-2 gap-3">
                  {[
                    ['وزن فعلی', `${toPersianDigits(form.currentWeightKg)} کیلو`],
                    ['وزن هدف', `${toPersianDigits(form.targetWeightKg)} کیلو`],
                    ['قد', `${toPersianDigits(form.heightCm)} سانتی‌متر`],
                    ['تاریخ هدف', formatJalaliDate(form.goalDate, 'long')],
                  ].map(([label, value]) => (
                    <div
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                      key={label}
                    >
                      <p className="text-[10px] font-bold text-[var(--text-muted)]">{label}</p>
                      <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{value}</p>
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
                    {stagedPlan
                      ? `برنامه «${stagedPlan.planName}» همراه پروفایل روی همین دستگاه ذخیره می‌شود.`
                      : 'پروفایل بدون برنامه غذایی ساخته می‌شود و هر زمان خواستی می‌توانی از تنظیمات فایل اضافه کنی.'}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <p className="mx-auto mt-5 max-w-lg rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-4 py-3 text-xs font-bold text-[var(--danger)]">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4 desktop:px-10">
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

            {step < 3 ? (
              <button
                className="flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--emerald)] px-5 text-sm font-black text-[#07110d] shadow-[0_10px_28px_rgba(70,205,145,0.2)]"
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
                ورود به داشبورد
                <Check aria-hidden="true" size={18} />
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
