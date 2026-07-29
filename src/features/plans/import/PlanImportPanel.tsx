import { useId, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  FileJson,
  FlaskConical,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { buttonClassNames } from '../../../components/ui/button-styles'
import { IconButton } from '../../../components/ui/IconButton'
import { IconTile } from '../../../components/ui/IconTile'
import { Surface } from '../../../components/ui/Surface'
import { APP_CONFIG } from '../../../config/app'
import { formatJalaliDate, toPersianDigits } from '../../../lib/dates/jalali'
import type {
  AppState,
  PlanConflictResolution,
  WeeklyMealPlan,
} from '../../../types/domain'
import { getConflictingPlanKeys } from '../state/plan-state'
import {
  countMealOptions,
  loadSamplePlan,
  readPlanFile,
  type PlanFileResult,
} from './read-plan-file'
import { PlanHealthScoreCard } from '../health/PlanHealthScoreCard'
import { ImportCompletionWizard } from './ImportCompletionWizard'

interface PlanImportPanelProps {
  existingState?: AppState | null
  onConfirm: (plan: WeeklyMealPlan, resolution: PlanConflictResolution) => void
  confirmLabel?: string
  stagedPlan?: WeeklyMealPlan
  onClearStagedPlan?: () => void
}

export function PlanImportPanel({
  existingState,
  onConfirm,
  confirmLabel = 'وارد کردن برنامه',
  stagedPlan,
  onClearStagedPlan,
}: PlanImportPanelProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<PlanFileResult>()
  const [isReading, setIsReading] = useState(false)
  const [resolution, setResolution] =
    useState<PlanConflictResolution>('imported-first')
  const [confirmed, setConfirmed] = useState(false)

  const plan = result?.data
  const conflictKeys =
    existingState && plan ? getConflictingPlanKeys(existingState, plan) : []

  const loadResult = async (loader: () => Promise<PlanFileResult>) => {
    setIsReading(true)
    setConfirmed(false)
    const nextResult = await loader()
    setResult(nextResult)
    setIsReading(false)
  }

  if (stagedPlan) {
    return (
      <Surface className="rounded-[22px] p-4" variant="accent">
        <div className="flex items-start gap-3">
          <IconTile className="size-10 rounded-xl" tone="accent-solid">
            <Check aria-hidden="true" size={19} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[var(--color-text)]">{stagedPlan.planName}</p>
            <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
              فایل معتبر است و اطلاعات {stagedPlan.profile.name}، ترجیحات غذایی و
              برنامه تمرین از آن خوانده شد.
            </p>
          </div>
          {onClearStagedPlan && (
            <IconButton
              aria-label="حذف فایل انتخاب‌شده"
              onClick={onClearStagedPlan}
            >
              <X aria-hidden="true" size={17} />
            </IconButton>
          )}
        </div>
      </Surface>
    )
  }

  return (
    <div className="space-y-4">
      <input
        accept={`${APP_CONFIG.planFile.extension},${APP_CONFIG.planFile.mimeType}`}
        className="sr-only"
        id={inputId}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void loadResult(() => readPlanFile(file))
          }
        }}
        ref={inputRef}
        type="file"
      />

      {!result && !isReading && (
        <Surface className="rounded-[24px] p-4 text-center desktop:p-5" variant="dashed">
          <IconTile className="mx-auto size-14 rounded-[18px]">
            <UploadCloud aria-hidden="true" size={25} />
          </IconTile>
          <p className="mt-4 text-sm font-black text-[var(--color-text)]">
            فایل برنامه هفتگی JSON
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[10px] leading-5 text-[var(--color-text-muted)]">
            فایل فقط روی همین دستگاه خوانده می‌شود و حداکثر حجم مجاز{' '}
            {toPersianDigits(Math.round(APP_CONFIG.planFile.maxBytes / (1024 * 1024)))} مگابایت است.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <label
              className={buttonClassNames({
                className: 'cursor-pointer',
                variant: 'primary',
              })}
              htmlFor={inputId}
            >
              <FileJson aria-hidden="true" size={17} />
              انتخاب فایل
            </label>
            <Button
              disabled={isReading}
              onClick={() => void loadResult(loadSamplePlan)}
              variant="outline"
            >
              <FlaskConical aria-hidden="true" size={17} />
              استفاده از دمو
            </Button>
          </div>
        </Surface>
      )}

      {isReading && (
        <Surface
          aria-label="در حال بررسی فایل"
          className="rounded-[24px] p-5"
          role="status"
          variant="muted"
        >
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-4 h-16 w-full" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        </Surface>
      )}

      {result &&
        !result.success &&
        result.errors.length === 0 &&
        result.recoverableFields &&
        Boolean(result.draft) && (
          <ImportCompletionWizard
            draft={result.draft!}
            fileName={result.fileName}
            key={result.recoverableFields
              .map((question) => question.path)
              .join('|')}
            onResult={setResult}
            questions={result.recoverableFields}
          />
        )}

      {result &&
        !result.success &&
        (result.errors.length > 0 || !result.recoverableFields) && (
        <Surface className="rounded-[22px] p-4" variant="danger">
          <div className="flex items-center gap-2 text-xs font-black text-[var(--color-danger)]">
            <AlertTriangle aria-hidden="true" size={18} />
            فایل قابل وارد کردن نیست
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-auto">
            {result.errors.map((error, index) => (
              <div
                className="rounded-xl bg-[var(--color-surface)] px-3 py-2"
                key={`${error.path}-${index}`}
              >
                <code className="block text-left text-[9px] text-[var(--color-highlight)]" dir="ltr">
                  {error.path || 'root'}
                </code>
                <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
                  {error.message}
                </p>
              </div>
            ))}
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              setResult(undefined)
              if (inputRef.current) inputRef.current.value = ''
            }}
            variant="outline"
          >
            انتخاب فایل دیگر
          </Button>
        </Surface>
        )}

      {plan && result?.success && (
        <div className="space-y-4">
          <Surface className="rounded-[24px] p-4 desktop:p-5" variant="muted">
            <div className="flex items-start gap-3">
              <IconTile>
                <ShieldCheck aria-hidden="true" size={21} />
              </IconTile>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--color-text)]">{plan.planName}</p>
                <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                  نسخه {plan.planVersion} · schema {plan.schemaVersion}
                </p>
              </div>
              <IconButton
                aria-label="بستن پیش‌نمایش"
                onClick={() => setResult(undefined)}
              >
                <X aria-hidden="true" size={17} />
              </IconButton>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 desktop:grid-cols-3">
              {[
                ['شروع', formatJalaliDate(plan.validFrom, 'long')],
                ['پایان', formatJalaliDate(plan.validTo, 'long')],
                ['بازه میلادی', `${plan.validFrom} تا ${plan.validTo}`],
                ['تعداد روز', toPersianDigits(plan.days.length)],
                ['گزینه وعده', toPersianDigits(countMealOptions(plan))],
                [
                  'پروفایل',
                  `${plan.profile.name} · ${toPersianDigits(plan.profile.age)} سال`,
                ],
                [
                  'الگوی وعده',
                  `${plan.planningContext.requestedMealPattern} · ${toPersianDigits(plan.planningContext.preferredOptionCount)} گزینه`,
                ],
                [
                  'هدف پیش‌فرض',
                  `${toPersianDigits(plan.defaultTargets.calories)} کالری · ${toPersianDigits(plan.defaultTargets.protein)} گرم پروتئین`,
                ],
              ].map(([label, value]) => (
                <div
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                  key={label}
                >
                  <p className="text-[9px] font-bold text-[var(--color-text-muted)]">{label}</p>
                  <p
                    className={`mt-1 text-[10px] font-black leading-5 text-[var(--color-text)] ${label === 'بازه میلادی' ? 'text-left' : ''}`}
                    dir={label === 'بازه میلادی' ? 'ltr' : undefined}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Surface>

          <PlanHealthScoreCard plan={plan} />

          {result.warnings.length > 0 && (
            <Surface className="rounded-2xl p-4" variant="highlight">
              <p className="text-xs font-black text-[var(--color-highlight)]">هشدارهای قابل قبول</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Surface>
          )}

          {conflictKeys.length > 0 && existingState && (
            <fieldset className="rounded-2xl border border-[var(--color-border)] p-4">
              <legend className="px-2 text-xs font-black text-[var(--color-highlight)]">
                هم‌پوشانی با {toPersianDigits(conflictKeys.length)} برنامه
              </legend>
              <div className="space-y-2">
                {[
                  {
                    value: 'replace-conflicts' as const,
                    title: 'جایگزینی بازه فعال',
                    body: 'برنامه جدید فعال می‌شود و برنامه‌های هم‌پوشان در تاریخچه می‌مانند.',
                  },
                  {
                    value: 'imported-first' as const,
                    title: 'نگهداری هر دو؛ جدید اولویت بالاتر',
                    body: 'هر دو برنامه فعال می‌مانند و برنامه جدید برای تاریخ مشترک انتخاب می‌شود.',
                  },
                  {
                    value: 'existing-first' as const,
                    title: 'نگهداری هر دو؛ فعلی اولویت بالاتر',
                    body: 'برنامه وارد می‌شود اما برنامه فعلی برای تاریخ مشترک انتخاب خواهد شد.',
                  },
                ].map((option) => (
                  <label
                    className={`block cursor-pointer rounded-xl border p-3 ${
                      resolution === option.value
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-muted)]'
                    }`}
                    key={option.value}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        checked={resolution === option.value}
                        className="mt-1 accent-[var(--color-accent)]"
                        name="plan-conflict"
                        onChange={() => setResolution(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <div>
                        <p className="text-xs font-black text-[var(--color-text)]">
                          {option.title}
                        </p>
                        <p className="mt-1 text-[9px] leading-5 text-[var(--color-text-muted)]">
                          {option.body}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {confirmed ? (
            <Surface className="flex items-center gap-2 rounded-2xl border-0 px-4 py-3 text-xs font-black text-[var(--color-accent)]" variant="accent">
              <Check aria-hidden="true" size={18} />
              برنامه با موفقیت آماده شد.
            </Surface>
          ) : (
            <Button
              block
              onClick={() => {
                onConfirm(plan, conflictKeys.length > 0 ? resolution : 'imported-first')
                setConfirmed(true)
              }}
              size="lg"
            >
              <Check aria-hidden="true" size={18} />
              {confirmLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
