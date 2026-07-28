import { useId, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  FileJson,
  LockKeyhole,
  Scale,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react'
import { JalaliDatePicker } from '../../components/forms/JalaliDatePicker'
import {
  formatJalaliDate,
  getTodayIso,
  toJalali,
  toPersianDigits,
} from '../../lib/dates/jalali'
import type { ISODate, UserProfile } from '../../types/domain'
import { Brand } from '../../components/layout/Brand'
import type { WeeklyMealPlan } from '../../types/domain'
import { PlanImportPanel } from '../plans/import/PlanImportPanel'

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

const initialForm: OnboardingForm = {
  name: '',
  heightCm: '',
  startWeightKg: '',
  currentWeightKg: '',
  targetWeightKg: '',
  goalDate: getDefaultGoalDate(),
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
    <div className="block">
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
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState<string>()
  const [stagedPlan, setStagedPlan] = useState<WeeklyMealPlan>()
  const currentJalaliYear = toJalali(getTodayIso()).jy

  const progress = ((step + 1) / 6) * 100

  const validateStep = () => {
    if (step === 1 && (!form.name.trim() || Number(form.heightCm) < 100)) {
      return 'نام و قد معتبر را وارد کنید.'
    }

    if (step === 2) {
      const start = Number(form.startWeightKg)
      const current = Number(form.currentWeightKg)
      const target = Number(form.targetWeightKg)

      if ([start, current, target].some((value) => !value || value < 35 || value > 350)) {
        return 'وزن‌ها را به‌صورت عددی و در بازه معتبر وارد کنید.'
      }

    }

    return undefined
  }

  const goNext = () => {
    const validationError = validateStep()

    if (validationError) {
      setError(validationError)
      return
    }

    setError(undefined)
    setStep((current) => Math.min(current + 1, 5))
  }

  const finish = (event: FormEvent) => {
    event.preventDefault()
    onComplete(
      {
        name: form.name.trim(),
        startWeightKg: Number(form.startWeightKg),
        currentWeightKg: Number(form.currentWeightKg),
        targetWeightKg: Number(form.targetWeightKg),
        heightCm: Number(form.heightCm),
        journeyStartDate: getTodayIso(),
        goalDate: form.goalDate,
      },
      stagedPlan,
    )
  }

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
                  چند اطلاعات کوتاه برای شخصی‌سازی مسیر وارد می‌کنیم. تمام اطلاعات فقط در
                  مرورگر همین دستگاه باقی می‌ماند.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="mx-auto max-w-lg">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <UserRound aria-hidden="true" size={25} />
                </div>
                <p className="mt-6 text-xs font-bold text-[var(--emerald)]">اطلاعات پایه</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  اول خودت را معرفی کن
                </h1>
                <div className="mt-7 space-y-5">
                  <label className="block">
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
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="mx-auto max-w-lg">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <Scale aria-hidden="true" size={25} />
                </div>
                <p className="mt-6 text-xs font-bold text-[var(--emerald)]">نقطه شروع</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  نقطه شروع و هدف
                </h1>
                <div className="mt-7 grid gap-4 desktop:grid-cols-2">
                  <NumberField
                    label="وزن شروع"
                    onChange={(startWeightKg) => setForm({ ...form, startWeightKg })}
                    suffix="کیلوگرم"
                    value={form.startWeightKg}
                  />
                  <NumberField
                    label="وزن فعلی"
                    onChange={(currentWeightKg) => setForm({ ...form, currentWeightKg })}
                    suffix="کیلوگرم"
                    value={form.currentWeightKg}
                  />
                  <div className="desktop:col-span-2">
                    <NumberField
                      label="وزن هدف"
                      onChange={(targetWeightKg) => setForm({ ...form, targetWeightKg })}
                      suffix="کیلوگرم"
                      value={form.targetWeightKg}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="mx-auto max-w-lg">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--gold-soft)] text-[var(--gold)]">
                  <Target aria-hidden="true" size={25} />
                </div>
                <p className="mt-6 text-xs font-bold text-[var(--gold)]">خط پایان</p>
                <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                  تاریخ هدف را انتخاب کن
                </h1>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  تاریخ در برنامه همیشه با تقویم جلالی نمایش داده می‌شود.
                </p>
                <div className="mt-8">
                  <JalaliDatePicker
                    label="تاریخ هدف"
                    maxYear={currentJalaliYear + 5}
                    minYear={currentJalaliYear}
                    onChange={(goalDate) => setForm({ ...form, goalDate })}
                    value={form.goalDate}
                  />
                </div>
                <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-center">
                  <p className="text-xs text-[var(--text-muted)]">تاریخ انتخاب‌شده</p>
                  <p className="mt-2 text-base font-black text-[var(--text-primary)]">
                    {formatJalaliDate(form.goalDate, 'full')}
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="mx-auto max-w-lg">
                <div className="grid size-14 place-items-center rounded-[20px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <FileJson aria-hidden="true" size={25} />
                </div>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-[var(--emerald)]">برنامه غذایی</p>
                    <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                      فایل هفتگی داری؟
                    </h1>
                  </div>
                  <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    اختیاری
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  می‌توانی همین حالا فایل JSON را انتخاب کنی، از فایل نمونه استفاده کنی یا
                  بدون برنامه ادامه بدهی و بعداً از تنظیمات آن را وارد کنی.
                </p>
                <div className="mt-6">
                  <PlanImportPanel
                    confirmLabel="افزودن به راه‌اندازی"
                    onClearStagedPlan={() => setStagedPlan(undefined)}
                    onConfirm={(plan) => setStagedPlan(plan)}
                    stagedPlan={stagedPlan}
                  />
                </div>
              </div>
            )}

            {step === 5 && (
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
                      ? `برنامه «${stagedPlan.planName}» از فایل انتخابی همراه پروفایل ذخیره می‌شود.`
                      : 'بدون برنامه غذایی وارد می‌شوی و هر زمان خواستی می‌توانی از تنظیمات فایل JSON اضافه کنی.'}
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
              onClick={() => {
                setError(undefined)
                setStep((current) => Math.max(current - 1, 0))
              }}
              type="button"
            >
              <ArrowRight aria-hidden="true" size={18} />
              قبلی
            </button>
            {step < 5 ? (
              <button
                className="flex min-h-12 items-center gap-2 rounded-2xl bg-[var(--emerald)] px-5 text-sm font-black text-[#07110d] shadow-[0_10px_28px_rgba(70,205,145,0.2)]"
                onClick={goNext}
                type="button"
              >
                {step === 0 ? 'شروع مسیر' : 'ادامه'}
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
