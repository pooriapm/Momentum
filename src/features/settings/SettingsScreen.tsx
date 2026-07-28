import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowUp,
  Check,
  DatabaseBackup,
  Download,
  Edit3,
  FileJson,
  FileText,
  LockKeyhole,
  PlusSquare,
  Save,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { JalaliDatePicker } from '../../components/forms/JalaliDatePicker'
import { formatJalaliDate, toPersianDigits } from '../../lib/dates/jalali'
import {
  optionalLocalizedNumber,
  parseLocalizedNumber,
} from '../../lib/numbers/localized-number'
import { APP_VERSION } from '../../lib/version'
import type { ActivityLevel, Sex } from '../../types/domain'
import type { Theme } from '../../types/ui'
import { PlanImportPanel } from '../plans/import/PlanImportPanel'

interface SettingsScreenProps {
  theme: Theme
  themeControl: ReactNode
}

const sexLabels: Record<Sex, string> = {
  female: 'زن',
  male: 'مرد',
  other: 'سایر',
  prefer_not_to_say: 'ترجیح می‌دهم نگویم',
}

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: 'کم‌تحرک',
  light: 'فعالیت سبک',
  moderate: 'فعالیت متوسط',
  high: 'فعالیت زیاد',
  athlete: 'ورزشکار',
}

export function SettingsScreen({ theme, themeControl }: SettingsScreenProps) {
  const {
    appState,
    updateProfile,
    importPlan,
    removePlan,
    prioritizePlan,
    clearAllData,
  } = useAppState()
  const [isEditing, setIsEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string>()
  const [draft, setDraft] = useState(() => appState?.profile)

  if (!appState || !draft) {
    return null
  }

  const saveProfile = (event: FormEvent) => {
    event.preventDefault()

    if (
      !draft.name.trim() ||
      draft.heightCm < 100 ||
      draft.startWeightKg <= 0 ||
      draft.currentWeightKg <= 0 ||
      draft.targetWeightKg <= 0 ||
      (draft.age !== undefined && (draft.age < 13 || draft.age > 100))
    ) {
      setError('نام، قد و وزن‌ها را با مقدار معتبر وارد کنید.')
      return
    }

    if (updateProfile({ ...draft, name: draft.name.trim() })) {
      setError(undefined)
      setSaved(true)
      setIsEditing(false)
      window.setTimeout(() => setSaved(false), 2500)
    }
  }

  const inputClass =
    'min-h-12 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition focus:border-[var(--emerald)]'

  const orderedPlanKeys = [
    ...appState.planPriority,
    ...Object.keys(appState.plans).filter((key) => !appState.planPriority.includes(key)),
  ]
  const isStandalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--emerald-soft)] px-4 py-3 text-xs font-bold text-[var(--emerald)]">
          <Check aria-hidden="true" size={17} />
          پروفایل با موفقیت ذخیره شد.
        </div>
      )}

      <section className="glass-panel rounded-[26px] p-5 desktop:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[var(--emerald)]">پروفایل</p>
            <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
              اطلاعات {appState.profile.name}
            </h1>
          </div>
          {!isEditing && (
            <button
              className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
              onClick={() => {
                setDraft(appState.profile)
                setIsEditing(true)
              }}
              type="button"
            >
              <Edit3 aria-hidden="true" size={16} />
              ویرایش
            </button>
          )}
        </div>

        {isEditing ? (
          <form className="mt-6 space-y-4" onSubmit={saveProfile}>
            <div className="grid gap-4 desktop:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  نام
                </span>
                <input
                  className={inputClass}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  value={draft.name}
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  سن
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      age: optionalLocalizedNumber(event.target.value),
                    })
                  }
                  type="text"
                  value={draft.age ?? ''}
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  جنسیت
                </span>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sex: (event.target.value || undefined) as Sex | undefined,
                    })
                  }
                  value={draft.sex ?? ''}
                >
                  <option value="">ثبت نشده</option>
                  {Object.entries(sexLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  سطح فعالیت
                </span>
                <select
                  className={inputClass}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      activityLevel: (event.target.value || undefined) as
                        | ActivityLevel
                        | undefined,
                    })
                  }
                  value={draft.activityLevel ?? ''}
                >
                  <option value="">ثبت نشده</option>
                  {Object.entries(activityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  قد (سانتی‌متر)
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      heightCm: parseLocalizedNumber(event.target.value) || 0,
                    })
                  }
                  type="text"
                  value={draft.heightCm}
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  وزن شروع
                </span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      startWeightKg: parseLocalizedNumber(event.target.value) || 0,
                    })
                  }
                  step="0.1"
                  type="text"
                  value={draft.startWeightKg}
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  وزن فعلی
                </span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      currentWeightKg: parseLocalizedNumber(event.target.value) || 0,
                    })
                  }
                  step="0.1"
                  type="text"
                  value={draft.currentWeightKg}
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--text-secondary)]">
                  وزن هدف
                </span>
                <input
                  className={inputClass}
                  inputMode="decimal"
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      targetWeightKg: parseLocalizedNumber(event.target.value) || 0,
                    })
                  }
                  step="0.1"
                  type="text"
                  value={draft.targetWeightKg}
                />
              </label>
            </div>
            <JalaliDatePicker
              label="تاریخ هدف"
              onChange={(goalDate) => setDraft({ ...draft, goalDate })}
              value={draft.goalDate}
            />
            {error && (
              <p className="rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-4 py-3 text-xs font-bold text-[var(--danger)]">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                className="flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
                onClick={() => {
                  setDraft(appState.profile)
                  setError(undefined)
                  setIsEditing(false)
                }}
                type="button"
              >
                <X aria-hidden="true" size={16} />
                انصراف
              </button>
              <button
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--emerald)] px-4 text-xs font-black text-[#07110d]"
                type="submit"
              >
                <Save aria-hidden="true" size={16} />
                ذخیره تغییرات
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 desktop:grid-cols-4">
            {[
              ['وزن شروع', `${toPersianDigits(appState.profile.startWeightKg)} کیلو`],
              ['وزن فعلی', `${toPersianDigits(appState.profile.currentWeightKg)} کیلو`],
              ['وزن هدف', `${toPersianDigits(appState.profile.targetWeightKg)} کیلو`],
              ['قد', `${toPersianDigits(appState.profile.heightCm)} سانتی‌متر`],
              ...(appState.profile.age
                ? [['سن', `${toPersianDigits(appState.profile.age)} سال`]]
                : []),
              ...(appState.profile.sex
                ? [['جنسیت', sexLabels[appState.profile.sex]]]
                : []),
              ...(appState.profile.activityLevel
                ? [['سطح فعالیت', activityLabels[appState.profile.activityLevel]]]
                : []),
              ['تاریخ هدف', formatJalaliDate(appState.profile.goalDate, 'long')],
            ].map(([label, value]) => (
              <div
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                key={label}
              >
                <p className="text-[10px] font-bold text-[var(--text-muted)]">{label}</p>
                <p className="mt-2 text-xs font-black text-[var(--text-primary)]">{value}</p>
              </div>
            ))}
          </div>
        )}
        {!isEditing && appState.profile.bodyComposition && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--emerald-soft)] p-4">
            <p className="text-[10px] font-black text-[var(--emerald)]">
              آخرین بادی‌کامپوزیشن
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-[var(--text-secondary)]">
              {appState.profile.bodyComposition.bodyFatPercent !== undefined && (
                <span className="rounded-full bg-[var(--surface)] px-3 py-1.5">
                  چربی بدن {toPersianDigits(appState.profile.bodyComposition.bodyFatPercent)}٪
                </span>
              )}
              {appState.profile.bodyComposition.skeletalMuscleMassKg !== undefined && (
                <span className="rounded-full bg-[var(--surface)] px-3 py-1.5">
                  عضله اسکلتی{' '}
                  {toPersianDigits(
                    appState.profile.bodyComposition.skeletalMuscleMassKg,
                  )}{' '}
                  کیلو
                </span>
              )}
              {appState.profile.bodyComposition.waistCm !== undefined && (
                <span className="rounded-full bg-[var(--surface)] px-3 py-1.5">
                  دور کمر {toPersianDigits(appState.profile.bodyComposition.waistCm)} سانتی‌متر
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="glass-panel rounded-[26px] p-5 desktop:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <FileJson aria-hidden="true" size={21} />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--emerald)]">مدیریت برنامه غذایی</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              وارد کردن فایل JSON
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              فایل قبل از ذخیره به‌طور کامل بررسی و پیش‌نمایش داده می‌شود.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <PlanImportPanel
            existingState={appState}
            onConfirm={(plan, resolution) => {
              importPlan(plan, resolution)
            }}
          />
        </div>
      </section>

      <section className="glass-panel rounded-[26px] p-5 desktop:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--gold-soft)] text-[var(--gold)]">
            <FileText aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[var(--gold)]">ساخت برنامه هفته بعد</p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              تمپلیت پرامپت هفتگی
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              قرارداد کامل JSON و جای‌خالی‌های لازم داخل فایل است. هر هفته ترجیحات و
              محدودیت‌ها را به‌روز کن، برای ChatGPT بفرست و پاسخ JSON را همین‌جا وارد کن.
            </p>
            <a
              className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--gold)] px-5 text-xs font-black text-[#171006]"
              download
              href="/templates/momentum-weekly-plan-prompt.md"
            >
              <Download aria-hidden="true" size={17} />
              دانلود تمپلیت پرامپت
            </a>
          </div>
        </div>
      </section>

      {orderedPlanKeys.length > 0 && (
        <section className="glass-panel rounded-[26px] p-5 desktop:p-7">
          <p className="text-xs font-bold text-[var(--gold)]">تاریخچه برنامه‌ها</p>
          <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
            {toPersianDigits(orderedPlanKeys.length)} برنامه ذخیره‌شده
          </h2>
          <div className="mt-5 space-y-2">
            {orderedPlanKeys.map((storageKey, index) => {
              const plan = appState.plans[storageKey]
              const isPrioritized = appState.planPriority[0] === storageKey
              const isArchived = !appState.planPriority.includes(storageKey)

              return (
                <article
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
                  key={storageKey}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black text-[var(--text-primary)]">
                          {plan.planName}
                        </p>
                        {isPrioritized && (
                          <span className="rounded-full bg-[var(--emerald-soft)] px-2 py-1 text-[8px] font-black text-[var(--emerald)]">
                            اولویت اول
                          </span>
                        )}
                        {isArchived && (
                          <span className="rounded-full bg-[var(--gold-soft)] px-2 py-1 text-[8px] font-black text-[var(--gold)]">
                            بایگانی
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[9px] leading-5 text-[var(--text-muted)]">
                        {formatJalaliDate(plan.validFrom, 'long')} تا{' '}
                        {formatJalaliDate(plan.validTo, 'long')} · نسخه {plan.planVersion}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!isPrioritized && !isArchived && (
                        <button
                          aria-label={`قرار دادن ${plan.planName} در اولویت`}
                          className="grid size-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--emerald-soft)] hover:text-[var(--emerald)]"
                          onClick={() => prioritizePlan(storageKey)}
                          type="button"
                        >
                          <ArrowUp aria-hidden="true" size={17} />
                        </button>
                      )}
                      <button
                        aria-label={`حذف ${plan.planName}`}
                        className="grid size-11 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] hover:text-[var(--danger)]"
                        onClick={() => {
                          if (
                            window.confirm(
                              `برنامه «${plan.planName}» حذف شود؟ ثبت‌های روزانه باقی می‌مانند.`,
                            )
                          ) {
                            removePlan(storageKey)
                          }
                        }}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: Math.max(1, appState.planPriority.length) }, (_, priorityIndex) => (
                      <span
                        className={`h-1 flex-1 rounded-full ${
                          priorityIndex === index && !isArchived
                            ? 'bg-[var(--emerald)]'
                            : 'bg-[var(--border)]'
                        }`}
                        key={priorityIndex}
                      />
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <section className="glass-panel rounded-[26px] p-5 desktop:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <Smartphone aria-hidden="true" size={21} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-[var(--emerald)]">نصب روی آیفون</p>
              {isStandalone && (
                <span className="rounded-full bg-[var(--emerald-soft)] px-2 py-1 text-[8px] font-black text-[var(--emerald)]">
                  نصب شده
                </span>
              )}
            </div>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">
              مثل یک اپ از Home Screen بازش کن
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              آدرس امن HTTPS برنامه را در Safari باز کن و مراحل زیر را انجام بده.
            </p>
          </div>
        </div>
        <ol className="mt-5 grid gap-2 desktop:grid-cols-3">
          {[
            {
              icon: Share2,
              title: '۱. Share',
              body: 'دکمه اشتراک‌گذاری Safari را بزن.',
            },
            {
              icon: PlusSquare,
              title: '۲. Add to Home Screen',
              body: 'افزودن به صفحه اصلی را انتخاب کن.',
            },
            {
              icon: Smartphone,
              title: '۳. Open as Web App',
              body: 'این گزینه را روشن کن و Add را بزن.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <li
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"
              key={title}
            >
              <Icon aria-hidden="true" className="text-[var(--emerald)]" size={17} />
              <p className="mt-3 text-xs font-black text-[var(--text-primary)]">{title}</p>
              <p className="mt-1 text-[9px] leading-5 text-[var(--text-muted)]">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="glass-panel rounded-[26px] p-5 desktop:p-7">
        <p className="text-xs font-bold text-[var(--emerald)]">ظاهر برنامه</p>
        <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">پوسته</h2>
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4">
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">حالت نمایش</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {theme === 'dark' ? 'تیره — پیشنهادشده' : 'روشن'}
            </p>
          </div>
          {themeControl}
        </div>
      </section>

      <section className="rounded-[26px] border border-[var(--border)] bg-[var(--emerald-soft)] p-5 desktop:p-6">
        <div className="flex items-start gap-3">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--emerald)]"
            size={19}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-[var(--text-primary)]">
                ذخیره‌سازی امن و محلی
              </p>
              <ShieldCheck aria-hidden="true" className="text-[var(--emerald)]" size={16} />
            </div>
            <p className="mt-2 text-xs leading-6 text-[var(--text-secondary)]">
              اطلاعات شما فقط در همین مرورگر ذخیره می‌شود. Momentum هیچ سرور، حساب
              کاربری، ردیابی یا پایگاه داده‌ای ندارد. هر ذخیره ابتدا اعتبارسنجی می‌شود و دو
              نسخه بازیابی سالم نیز نگه داشته می‌شود؛ اگر نسخه اصلی خراب شود، برنامه از
              نسخه سالم قبلی باز می‌شود و فایل خراب را خودکار حذف نمی‌کند.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[26px] border border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface))] p-5 desktop:p-6">
        <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
          <div className="flex items-start gap-3">
            <DatabaseBackup
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--danger)]"
              size={20}
            />
            <div>
              <p className="text-sm font-black text-[var(--text-primary)]">
                پاک‌کردن تمام اطلاعات
              </p>
              <p className="mt-2 max-w-xl text-xs leading-6 text-[var(--text-secondary)]">
                پروفایل، برنامه‌های واردشده، لاگ روزانه، XP و تمام نسخه‌های بازیابی فقط با
                تأیید دو مرحله‌ای حذف می‌شوند. این کار قابل بازگشت نیست.
              </p>
            </div>
          </div>
          <button
            className="flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--danger)] px-4 text-xs font-black text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)]"
            onClick={() => {
              const firstConfirmation = window.confirm(
                'تمام اطلاعات Momentum از این مرورگر پاک شود؟',
              )

              if (
                firstConfirmation &&
                window.confirm(
                  'این کار پروفایل، برنامه‌ها، لاگ‌ها و نسخه‌های بازیابی را برای همیشه حذف می‌کند. مطمئن هستی؟',
                )
              ) {
                clearAllData()
              }
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" size={17} />
            پاک‌کردن همه اطلاعات
          </button>
        </div>
      </section>
      <p
        className="px-2 text-center text-[10px] font-bold tracking-[0.12em] text-[var(--text-muted)]"
        dir="ltr"
      >
        MOMENTUM · ALPHA {APP_VERSION}
      </p>
    </div>
  )
}
