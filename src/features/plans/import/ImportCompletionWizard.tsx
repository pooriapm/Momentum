import { useState, type FormEvent } from 'react'
import { ArrowLeft, CircleHelp, Sparkles } from 'lucide-react'
import {
  parseQuestionValue,
  setValueAtPath,
  type SchemaQuestion,
} from '../../questions/question-schema'
import { sanitizeLocalizedNumberInput } from '../../../lib/numbers/localized-number'
import {
  validateWeeklyMealPlan,
  type PlanValidationResult,
} from '../validation/weekly-plan-schema'

export function ImportCompletionWizard({
  questions,
  draft,
  fileName,
  onResult,
}: {
  questions: SchemaQuestion[]
  draft: unknown
  fileName?: string
  onResult: (result: PlanValidationResult & { fileName?: string }) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [workingDraft, setWorkingDraft] = useState(draft)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const question = questions[currentIndex]

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault()
    const parsed = parseQuestionValue(question, value)

    if (
      question.required &&
      (value.trim() === '' ||
        (Array.isArray(parsed) && parsed.length === 0) ||
        (typeof parsed === 'number' && !Number.isFinite(parsed)))
    ) {
      setError('پاسخ این سؤال برای تکمیل فایل لازم است.')
      return
    }

    if (
      typeof parsed === 'number' &&
      ((question.minimum !== undefined && parsed < question.minimum) ||
        (question.maximum !== undefined && parsed > question.maximum))
    ) {
      setError(
        `مقدار باید بین ${question.minimum ?? 0} و ${question.maximum ?? '∞'} باشد.`,
      )
      return
    }

    const nextDraft = setValueAtPath(workingDraft, question.path, parsed)
    if (currentIndex < questions.length - 1) {
      setWorkingDraft(nextDraft)
      setCurrentIndex((index) => index + 1)
      setValue('')
      setError('')
      return
    }

    onResult({
      ...validateWeeklyMealPlan(nextDraft),
      fileName,
    })
  }

  if (!question) return null

  return (
    <section className="rounded-[24px] border border-[var(--emerald)] bg-[var(--emerald-soft)] p-4 desktop:p-5">
      <div className="flex items-start gap-3">
        <div className="animated-icon grid size-11 shrink-0 place-items-center rounded-[15px] bg-[var(--emerald)] text-[#07110d]">
          <CircleHelp aria-hidden="true" size={21} />
        </div>
        <div>
          <p className="text-xs font-black text-[var(--emerald)]">
            تکمیل هوشمند فایل
          </p>
          <h3 className="mt-1 text-base font-black text-[var(--text-primary)]">
            فقط اطلاعات جاافتاده را می‌پرسیم
          </h3>
          <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
            سؤال {currentIndex + 1} از {questions.length} · گروه {question.group}
          </p>
        </div>
      </div>

      <form className="mt-5" onSubmit={submitAnswer}>
        <label className="block">
          <span className="mb-2 block text-sm font-black text-[var(--text-primary)]">
            {question.question}
          </span>
          {question.inputType === 'select' ? (
            <select
              autoFocus
              className={`min-h-12 w-full rounded-xl border bg-[var(--surface)] px-3 text-sm font-bold text-[var(--text-primary)] outline-none ${
                error ? 'border-[var(--danger)]' : 'border-[var(--border)]'
              }`}
              onChange={(event) => {
                setValue(event.target.value)
                setError('')
              }}
              value={value}
            >
              <option value="">انتخاب کنید</option>
              {question.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : question.inputType === 'textarea' ||
            question.inputType === 'list' ? (
            <textarea
              autoFocus
              className={`min-h-28 w-full resize-y rounded-xl border bg-[var(--surface)] p-3 text-sm leading-7 text-[var(--text-primary)] outline-none ${
                error ? 'border-[var(--danger)]' : 'border-[var(--border)]'
              }`}
              onChange={(event) => {
                setValue(event.target.value)
                setError('')
              }}
              placeholder={question.placeholder}
              value={value}
            />
          ) : (
            <input
              autoFocus
              className={`min-h-12 w-full rounded-xl border bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none ${
                error ? 'border-[var(--danger)]' : 'border-[var(--border)]'
              }`}
              inputMode={
                question.inputType === 'number' ? 'decimal' : undefined
              }
              onChange={(event) => {
                setValue(
                  question.inputType === 'number'
                    ? sanitizeLocalizedNumberInput(event.target.value)
                    : event.target.value,
                )
                setError('')
              }}
              placeholder={question.placeholder}
              type="text"
              value={value}
            />
          )}
        </label>
        <div className="min-h-7 pt-2">
          {error && (
            <p className="text-[10px] font-bold text-[var(--danger)]" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          className="mt-2 flex min-h-11 items-center gap-2 rounded-xl bg-[var(--emerald)] px-4 text-xs font-black text-[#07110d]"
          type="submit"
        >
          {currentIndex === questions.length - 1 ? (
            <Sparkles aria-hidden="true" size={16} />
          ) : (
            <ArrowLeft aria-hidden="true" size={16} />
          )}
          {currentIndex === questions.length - 1
            ? 'تکمیل و بررسی دوباره'
            : 'سؤال بعدی'}
        </button>
      </form>
    </section>
  )
}
