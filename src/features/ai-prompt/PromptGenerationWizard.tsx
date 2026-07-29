import { useState, type FormEvent } from 'react'
import { ArrowLeft, FileOutput, Sparkles, X } from 'lucide-react'
import { ViewportPortal } from '../../components/overlay/ViewportPortal'
import { sanitizeLocalizedNumberInput } from '../../lib/numbers/localized-number'
import type { UserProfile } from '../../types/domain'
import {
  parseQuestionValue,
  setValueAtPath,
} from '../questions/question-schema'
import { getMissingPromptQuestions } from './prompt-generator'

export function PromptGenerationWizard({
  initialProfile,
  onCancel,
  onComplete,
}: {
  initialProfile: UserProfile
  onCancel: () => void
  onComplete: (profile: UserProfile) => void
}) {
  const [draft, setDraft] = useState(initialProfile)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const questions = getMissingPromptQuestions(draft)
  const question = questions[0]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!question) return

    const parsed = parseQuestionValue(question, value)
    if (
      value.trim() === '' ||
      (Array.isArray(parsed) && parsed.length === 0) ||
      (typeof parsed === 'number' && !Number.isFinite(parsed))
    ) {
      setError('برای ساخت پرامپت کامل، پاسخ این سؤال لازم است.')
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

    const nextDraft = setValueAtPath(
      draft,
      question.path,
      parsed,
    ) as unknown as UserProfile
    const remaining = getMissingPromptQuestions(nextDraft)

    if (remaining.length === 0) {
      onComplete(nextDraft)
      return
    }

    setDraft(nextDraft)
    setAnsweredCount((count) => count + 1)
    setValue('')
    setError('')
  }

  if (!question) return null

  return (
    <ViewportPortal>
      <div
        aria-modal="true"
        className="fixed inset-0 z-[80] grid h-[100dvh] place-items-center overflow-y-auto overscroll-contain bg-[rgba(2,8,6,0.82)] p-4 backdrop-blur-md"
        role="dialog"
      >
        <div className="recipe-screen-enter w-full max-w-xl rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface-strong)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.45)] desktop:p-7">
        <div className="flex items-start gap-3">
          <div className="animated-icon grid size-12 shrink-0 place-items-center rounded-[16px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <FileOutput aria-hidden="true" size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[var(--emerald)]">
              Generate AI Prompt
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">
              تکمیل اطلاعات لازم
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">
              فقط سؤال‌های بدون پاسخ نمایش داده می‌شوند. پردازش کاملاً محلی است و
              هیچ اطلاعاتی به سرویس هوش مصنوعی ارسال نمی‌شود.
            </p>
          </div>
          <button
            aria-label="بستن تولید پرامپت"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={19} />
          </button>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface-soft)] px-4 py-3">
          <span className="text-[10px] font-bold text-[var(--text-muted)]">
            گروه: {question.group}
          </span>
          <span className="text-[10px] font-black text-[var(--emerald)]">
            {questions.length} پاسخ باقی مانده · {answeredCount} تکمیل شده
          </span>
        </div>

        <form className="mt-5" onSubmit={submit}>
          <label className="block">
            <span className="mb-3 block text-base font-black leading-7 text-[var(--text-primary)]">
              {question.question}
            </span>
            {question.inputType === 'select' ? (
              <select
                autoFocus
                className={`min-h-13 w-full rounded-2xl border bg-[var(--surface)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none ${
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
                className={`min-h-32 w-full resize-y rounded-2xl border bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--text-primary)] outline-none ${
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
                className={`min-h-13 w-full rounded-2xl border bg-[var(--surface)] px-4 text-sm text-[var(--text-primary)] outline-none ${
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
            className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--emerald)] px-5 text-sm font-black text-[#07110d]"
            type="submit"
          >
            {questions.length === 1 ? (
              <Sparkles aria-hidden="true" size={18} />
            ) : (
              <ArrowLeft aria-hidden="true" size={18} />
            )}
            {questions.length === 1
              ? 'ساخت و دانلود پرامپت'
              : 'ذخیره پاسخ و ادامه'}
          </button>
        </form>
        </div>
      </div>
    </ViewportPortal>
  )
}
