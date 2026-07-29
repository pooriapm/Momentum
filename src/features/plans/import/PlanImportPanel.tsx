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
      <div className="rounded-[22px] border border-[var(--emerald)] bg-[var(--emerald-soft)] p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--emerald)] text-[#07110d]">
            <Check aria-hidden="true" size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[var(--text-primary)]">{stagedPlan.planName}</p>
            <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
              فایل معتبر است و اطلاعات {stagedPlan.profile.name}، ترجیحات غذایی و
              برنامه تمرین از آن خوانده شد.
            </p>
          </div>
          {onClearStagedPlan && (
            <button
              aria-label="حذف فایل انتخاب‌شده"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
              onClick={onClearStagedPlan}
              type="button"
            >
              <X aria-hidden="true" size={17} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input
        accept=".json,application/json"
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
        <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)] p-4 text-center desktop:p-5">
          <div className="mx-auto grid size-14 place-items-center rounded-[18px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <UploadCloud aria-hidden="true" size={25} />
          </div>
          <p className="mt-4 text-sm font-black text-[var(--text-primary)]">
            فایل برنامه هفتگی JSON
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[10px] leading-5 text-[var(--text-muted)]">
            فایل فقط روی همین دستگاه خوانده می‌شود و حداکثر حجم مجاز ۱ مگابایت است.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <label
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--emerald)] px-4 text-xs font-black text-[#07110d]"
              htmlFor={inputId}
            >
              <FileJson aria-hidden="true" size={17} />
              انتخاب فایل
            </label>
            <button
              className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              disabled={isReading}
              onClick={() => void loadResult(loadSamplePlan)}
              type="button"
            >
              <FlaskConical aria-hidden="true" size={17} />
              استفاده از دمو
            </button>
          </div>
        </div>
      )}

      {isReading && (
        <div
          aria-label="در حال بررسی فایل"
          className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5"
          role="status"
        >
          <div className="skeleton h-3 w-28" />
          <div className="skeleton mt-4 h-16 w-full" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
        </div>
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
        <div className="rounded-[22px] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-4">
          <div className="flex items-center gap-2 text-xs font-black text-[var(--danger)]">
            <AlertTriangle aria-hidden="true" size={18} />
            فایل قابل وارد کردن نیست
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-auto">
            {result.errors.map((error, index) => (
              <div
                className="rounded-xl bg-[var(--surface)] px-3 py-2"
                key={`${error.path}-${index}`}
              >
                <code className="block text-left text-[9px] text-[var(--gold)]" dir="ltr">
                  {error.path || 'root'}
                </code>
                <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
                  {error.message}
                </p>
              </div>
            ))}
          </div>
          <button
            className="mt-4 min-h-11 rounded-xl border border-[var(--border)] px-4 text-xs font-bold text-[var(--text-secondary)]"
            onClick={() => {
              setResult(undefined)
              if (inputRef.current) inputRef.current.value = ''
            }}
            type="button"
          >
            انتخاب فایل دیگر
          </button>
        </div>
        )}

      {plan && result?.success && (
        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 desktop:p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
                <ShieldCheck aria-hidden="true" size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--text-primary)]">{plan.planName}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                  نسخه {plan.planVersion} · schema {plan.schemaVersion}
                </p>
              </div>
              <button
                aria-label="بستن پیش‌نمایش"
                className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                onClick={() => setResult(undefined)}
                type="button"
              >
                <X aria-hidden="true" size={17} />
              </button>
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
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
                  key={label}
                >
                  <p className="text-[9px] font-bold text-[var(--text-muted)]">{label}</p>
                  <p
                    className={`mt-1 text-[10px] font-black leading-5 text-[var(--text-primary)] ${label === 'بازه میلادی' ? 'text-left' : ''}`}
                    dir={label === 'بازه میلادی' ? 'ltr' : undefined}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <PlanHealthScoreCard plan={plan} />

          {result.warnings.length > 0 && (
            <div className="rounded-2xl border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[var(--gold-soft)] p-4">
              <p className="text-xs font-black text-[var(--gold)]">هشدارهای قابل قبول</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[10px] leading-5 text-[var(--text-secondary)]">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {conflictKeys.length > 0 && existingState && (
            <fieldset className="rounded-2xl border border-[var(--border)] p-4">
              <legend className="px-2 text-xs font-black text-[var(--gold)]">
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
                        ? 'border-[var(--emerald)] bg-[var(--emerald-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-soft)]'
                    }`}
                    key={option.value}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        checked={resolution === option.value}
                        className="mt-1 accent-[var(--emerald)]"
                        name="plan-conflict"
                        onChange={() => setResolution(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <div>
                        <p className="text-xs font-black text-[var(--text-primary)]">
                          {option.title}
                        </p>
                        <p className="mt-1 text-[9px] leading-5 text-[var(--text-muted)]">
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
            <div className="flex items-center gap-2 rounded-2xl bg-[var(--emerald-soft)] px-4 py-3 text-xs font-black text-[var(--emerald)]">
              <Check aria-hidden="true" size={18} />
              برنامه با موفقیت آماده شد.
            </div>
          ) : (
            <button
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--emerald)] px-5 text-sm font-black text-[#07110d]"
              onClick={() => {
                onConfirm(plan, conflictKeys.length > 0 ? resolution : 'imported-first')
                setConfirmed(true)
              }}
              type="button"
            >
              <Check aria-hidden="true" size={18} />
              {confirmLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
