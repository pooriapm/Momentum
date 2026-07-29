import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowUp,
  Check,
  DatabaseBackup,
  Edit3,
  FileOutput,
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
import { TemplateDownloadButton } from '../../components/feedback/TemplateDownloadButton'
import { JalaliDatePicker } from '../../components/forms/JalaliDatePicker'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { buttonClassNames } from '../../components/ui/button-styles'
import { SelectInput, TextInput } from '../../components/ui/FormField'
import { IconButton } from '../../components/ui/IconButton'
import { Surface } from '../../components/ui/Surface'
import { APP_CONFIG } from '../../config/app'
import { formatJalaliDate, toPersianDigits } from '../../lib/dates/jalali'
import {
  optionalLocalizedNumber,
  parseLocalizedNumber,
} from '../../lib/numbers/localized-number'
import { APP_VERSION } from '../../lib/version'
import type { ActivityLevel, Sex } from '../../types/domain'
import type { Theme } from '../../types/ui'
import { PromptGenerationWizard } from '../ai-prompt/PromptGenerationWizard'
import {
  downloadMomentumPrompt,
  getMissingPromptQuestions,
  mergeProfileWithPlanContext,
} from '../ai-prompt/prompt-generator'
import { PlanImportPanel } from '../plans/import/PlanImportPanel'
import { SettingsSection } from './components/SettingsSection'

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
  const [showPromptWizard, setShowPromptWizard] = useState(false)
  const [promptStatus, setPromptStatus] = useState<string>()

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

  const orderedPlanKeys = [
    ...appState.planPriority,
    ...Object.keys(appState.plans).filter((key) => !appState.planPriority.includes(key)),
  ]
  const promptProfile = mergeProfileWithPlanContext(
    appState.profile,
    appState.plans[appState.planPriority[0]],
  )
  const isStandalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3 text-xs font-bold text-[var(--color-accent)]">
          <Check aria-hidden="true" size={17} />
          پروفایل با موفقیت ذخیره شد.
        </div>
      )}

      <Surface as="section" className="p-5 desktop:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[var(--color-accent)]">پروفایل</p>
            <h1 className="mt-2 text-2xl font-black text-[var(--color-text)]">
              اطلاعات {appState.profile.name}
            </h1>
          </div>
          {!isEditing && (
            <Button
              onClick={() => {
                setDraft(appState.profile)
                setIsEditing(true)
              }}
              variant="outline"
            >
              <Edit3 aria-hidden="true" size={16} />
              ویرایش
            </Button>
          )}
        </div>

        {isEditing ? (
          <form className="mt-6 space-y-4" onSubmit={saveProfile}>
            <div className="grid gap-4 desktop:grid-cols-2">
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  نام
                </span>
                <TextInput
                  className="font-bold"
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  value={draft.name}
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  سن
                </span>
                <TextInput
                  className="font-bold"
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
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  جنسیت
                </span>
                <SelectInput
                  className="font-bold"
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
                </SelectInput>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  سطح فعالیت
                </span>
                <SelectInput
                  className="font-bold"
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
                </SelectInput>
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  قد (سانتی‌متر)
                </span>
                <TextInput
                  className="font-bold"
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
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  وزن شروع
                </span>
                <TextInput
                  className="font-bold"
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
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  وزن فعلی
                </span>
                <TextInput
                  className="font-bold"
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
                <span className="mb-2 block text-xs font-bold text-[var(--color-text-secondary)]">
                  وزن هدف
                </span>
                <TextInput
                  className="font-bold"
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
              <p className="rounded-xl bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] px-4 py-3 text-xs font-bold text-[var(--color-danger)]">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => {
                  setDraft(appState.profile)
                  setError(undefined)
                  setIsEditing(false)
                }}
                variant="ghost"
              >
                <X aria-hidden="true" size={16} />
                انصراف
              </Button>
              <Button
                type="submit"
              >
                <Save aria-hidden="true" size={16} />
                ذخیره تغییرات
              </Button>
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
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                key={label}
              >
                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{label}</p>
                <p className="mt-2 text-xs font-black text-[var(--color-text)]">{value}</p>
              </div>
            ))}
          </div>
        )}
        {!isEditing && appState.profile.bodyComposition && (
          <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] p-4">
            <p className="text-[10px] font-black text-[var(--color-accent)]">
              آخرین بادی‌کامپوزیشن
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-[var(--color-text-secondary)]">
              {appState.profile.bodyComposition.bodyFatPercent !== undefined && (
                <span className="rounded-full bg-[var(--color-surface)] px-3 py-1.5">
                  چربی بدن {toPersianDigits(appState.profile.bodyComposition.bodyFatPercent)}٪
                </span>
              )}
              {appState.profile.bodyComposition.skeletalMuscleMassKg !== undefined && (
                <span className="rounded-full bg-[var(--color-surface)] px-3 py-1.5">
                  عضله اسکلتی{' '}
                  {toPersianDigits(
                    appState.profile.bodyComposition.skeletalMuscleMassKg,
                  )}{' '}
                  کیلو
                </span>
              )}
              {appState.profile.bodyComposition.waistCm !== undefined && (
                <span className="rounded-full bg-[var(--color-surface)] px-3 py-1.5">
                  دور کمر {toPersianDigits(appState.profile.bodyComposition.waistCm)} سانتی‌متر
                </span>
              )}
            </div>
          </div>
        )}
      </Surface>

      <SettingsSection
        description="فایل قبل از ذخیره به‌طور کامل بررسی و پیش‌نمایش داده می‌شود."
        eyebrow="مدیریت برنامه غذایی"
        icon={<FileJson aria-hidden="true" size={21} />}
        title="وارد کردن فایل JSON"
      >
        <div className="mt-6">
          <PlanImportPanel
            existingState={appState}
            onConfirm={(plan, resolution) => {
              importPlan(plan, resolution)
            }}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        description={
          <>
            {APP_CONFIG.name} روی همین دستگاه یک پرامپت شخصی و کامل می‌سازد. فایل را خودت برای
              ChatGPT یا هر LLM دیگری می‌فرستی و پاسخ JSON را دوباره داخل برنامه Import
              می‌کنی؛ هیچ اتصال هوش مصنوعی داخل سایت وجود ندارد.
          </>
        }
        eyebrow="ساخت برنامه هفته بعد"
        icon={<FileText aria-hidden="true" size={21} />}
        title="Generate AI Prompt"
        tone="highlight"
      >
          <div className="min-w-0">
            <div className="mt-5 flex flex-wrap items-start gap-3">
              <Button
                onClick={() => {
                  if (getMissingPromptQuestions(promptProfile).length > 0) {
                    setShowPromptWizard(true)
                    setPromptStatus(undefined)
                    return
                  }

                  downloadMomentumPrompt(promptProfile)
                  setPromptStatus('پرامپت شخصی با موفقیت ساخته و دانلود شد.')
                }}
                size="lg"
                variant="highlight"
              >
                <FileOutput aria-hidden="true" size={17} />
                ساخت پرامپت شخصی
              </Button>
              <TemplateDownloadButton
                buttonClassName={buttonClassNames({
                  className: 'disabled:cursor-wait disabled:opacity-80',
                  size: 'lg',
                  variant: 'outline',
                })}
                iconSize={17}
              >
                دانلود قرارداد خام
              </TemplateDownloadButton>
            </div>
            {promptStatus && (
              <p
                className="mt-3 text-[11px] font-bold text-[var(--color-accent)]"
                role="status"
              >
                {promptStatus}
              </p>
            )}
          </div>
      </SettingsSection>

      {orderedPlanKeys.length > 0 && (
        <Surface as="section" className="p-5 desktop:p-7">
          <p className="text-xs font-bold text-[var(--color-highlight)]">تاریخچه برنامه‌ها</p>
          <h2 className="mt-2 text-xl font-black text-[var(--color-text)]">
            {toPersianDigits(orderedPlanKeys.length)} برنامه ذخیره‌شده
          </h2>
          <div className="mt-5 space-y-2">
            {orderedPlanKeys.map((storageKey, index) => {
              const plan = appState.plans[storageKey]
              const isPrioritized = appState.planPriority[0] === storageKey
              const isArchived = !appState.planPriority.includes(storageKey)

              return (
                <article
                  className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                  key={storageKey}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-black text-[var(--color-text)]">
                          {plan.planName}
                        </p>
                        {isPrioritized && (
                          <Badge className="px-2 py-1 text-[8px]" tone="accent">
                            اولویت اول
                          </Badge>
                        )}
                        {isArchived && (
                          <Badge className="px-2 py-1 text-[8px]" tone="highlight">
                            بایگانی
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-[9px] leading-5 text-[var(--color-text-muted)]">
                        {formatJalaliDate(plan.validFrom, 'long')} تا{' '}
                        {formatJalaliDate(plan.validTo, 'long')} · نسخه {plan.planVersion}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!isPrioritized && !isArchived && (
                        <IconButton
                          aria-label={`قرار دادن ${plan.planName} در اولویت`}
                          className="hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                          onClick={() => prioritizePlan(storageKey)}
                        >
                          <ArrowUp aria-hidden="true" size={17} />
                        </IconButton>
                      )}
                      <IconButton
                        aria-label={`حذف ${plan.planName}`}
                        className="grid size-11 place-items-center rounded-xl text-[var(--color-text-muted)] hover:bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)] hover:text-[var(--color-danger)]"
                        onClick={() => {
                          if (
                            window.confirm(
                              `برنامه «${plan.planName}» حذف شود؟ ثبت‌های روزانه باقی می‌مانند.`,
                            )
                          ) {
                            removePlan(storageKey)
                          }
                        }}
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </IconButton>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: Math.max(1, appState.planPriority.length) }, (_, priorityIndex) => (
                      <span
                        className={`h-1 flex-1 rounded-full ${
                          priorityIndex === index && !isArchived
                            ? 'bg-[var(--color-accent)]'
                            : 'bg-[var(--color-border)]'
                        }`}
                        key={priorityIndex}
                      />
                    ))}
                  </div>
                </article>
              )
            })}
          </div>
        </Surface>
      )}

      {!isStandalone && (
        <SettingsSection
          description="آدرس امن HTTPS برنامه را در Safari باز کن و مراحل زیر را انجام بده."
          eyebrow="نصب روی آیفون"
          icon={<Smartphone aria-hidden="true" size={21} />}
          title="مثل یک اپ از Home Screen بازش کن"
        >
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
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
                key={title}
              >
                <Icon aria-hidden="true" className="text-[var(--color-accent)]" size={17} />
                <p className="mt-3 text-xs font-black text-[var(--color-text)]">{title}</p>
                <p className="mt-1 text-[9px] leading-5 text-[var(--color-text-muted)]">{body}</p>
              </li>
            ))}
          </ol>
        </SettingsSection>
      )}

      <Surface as="section" className="p-5 desktop:p-7">
        <p className="text-xs font-bold text-[var(--color-accent)]">ظاهر برنامه</p>
        <h2 className="mt-2 text-xl font-black text-[var(--color-text)]">پوسته</h2>
        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
          <div>
            <p className="text-sm font-bold text-[var(--color-text)]">حالت نمایش</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {theme === 'dark' ? 'تیره — پیشنهادشده' : 'روشن'}
            </p>
          </div>
          {themeControl}
        </div>
      </Surface>

      <Surface as="section" className="p-5 desktop:p-6" variant="accent">
        <div className="flex items-start gap-3">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-[var(--color-accent)]"
            size={19}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-[var(--color-text)]">
                ذخیره‌سازی امن و محلی
              </p>
              <ShieldCheck aria-hidden="true" className="text-[var(--color-accent)]" size={16} />
            </div>
            <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
              اطلاعات شما فقط در همین مرورگر ذخیره می‌شود. {APP_CONFIG.name} هیچ سرور، حساب
              کاربری، ردیابی یا پایگاه داده‌ای ندارد. هر ذخیره ابتدا اعتبارسنجی می‌شود و دو
              نسخه بازیابی سالم نیز نگه داشته می‌شود؛ اگر نسخه اصلی خراب شود، برنامه از
              نسخه سالم قبلی باز می‌شود و فایل خراب را خودکار حذف نمی‌کند.
            </p>
          </div>
        </div>
      </Surface>

      <Surface as="section" className="p-5 desktop:p-6" variant="danger">
        <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
          <div className="flex items-start gap-3">
            <DatabaseBackup
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[var(--color-danger)]"
              size={20}
            />
            <div>
              <p className="text-sm font-black text-[var(--color-text)]">
                پاک‌کردن تمام اطلاعات
              </p>
              <p className="mt-2 max-w-xl text-xs leading-6 text-[var(--color-text-secondary)]">
                پروفایل، برنامه‌های واردشده، لاگ روزانه، XP و تمام نسخه‌های بازیابی فقط با
                تأیید دو مرحله‌ای حذف می‌شوند. این کار قابل بازگشت نیست.
              </p>
            </div>
          </div>
          <Button
            className="shrink-0 rounded-xl"
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
            size="lg"
            variant="danger-outline"
          >
            <Trash2 aria-hidden="true" size={17} />
            پاک‌کردن همه اطلاعات
          </Button>
        </div>
      </Surface>
      <p
        className="px-2 text-center text-[10px] font-bold tracking-[0.12em] text-[var(--color-text-muted)]"
        dir="ltr"
      >
        {APP_CONFIG.wordmark} · ALPHA {APP_VERSION}
      </p>
      {showPromptWizard && (
        <PromptGenerationWizard
          initialProfile={promptProfile}
          onCancel={() => setShowPromptWizard(false)}
          onComplete={(completedProfile) => {
            if (updateProfile(completedProfile)) {
              setDraft(completedProfile)
              downloadMomentumPrompt(completedProfile)
              setPromptStatus(
                'اطلاعات تکمیل شد و پرامپت شخصی با موفقیت دانلود شد.',
              )
              setShowPromptWizard(false)
            }
          }}
        />
      )}
    </div>
  )
}
