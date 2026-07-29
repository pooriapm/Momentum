import { useState, type FormEvent } from 'react'
import { ArrowLeft, FileOutput, Sparkles, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '../../components/ui/FormField'
import { IconButton } from '../../components/ui/IconButton'
import { IconTile } from '../../components/ui/IconTile'
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
    <Dialog contentClassName="p-5 desktop:p-7" size="md">
        <div className="flex items-start gap-3">
          <IconTile className="size-12 rounded-[16px]">
            <FileOutput aria-hidden="true" size={22} />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[var(--color-accent)]">
              Generate AI Prompt
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--color-text)]">
              تکمیل اطلاعات لازم
            </h2>
            <p className="mt-2 text-[11px] leading-5 text-[var(--color-text-secondary)]">
              فقط سؤال‌های بدون پاسخ نمایش داده می‌شوند. پردازش کاملاً محلی است و
              هیچ اطلاعاتی به سرویس هوش مصنوعی ارسال نمی‌شود.
            </p>
          </div>
          <IconButton
            aria-label="بستن تولید پرامپت"
            onClick={onCancel}
          >
            <X aria-hidden="true" size={19} />
          </IconButton>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface-muted)] px-4 py-3">
          <span className="text-[10px] font-bold text-[var(--color-text-muted)]">
            گروه: {question.group}
          </span>
          <span className="text-[10px] font-black text-[var(--color-accent)]">
            {questions.length} پاسخ باقی مانده · {answeredCount} تکمیل شده
          </span>
        </div>

        <form className="mt-5" onSubmit={submit}>
          <Field
            error={error || undefined}
            label={question.question}
            labelClassName="mb-3 text-base font-black leading-7 text-[var(--color-text)]"
          >
            {question.inputType === 'select' ? (
              <SelectInput
                autoFocus
                className="min-h-13 bg-[var(--color-surface)] font-bold"
                hasError={Boolean(error)}
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
              </SelectInput>
            ) : question.inputType === 'textarea' ||
              question.inputType === 'list' ? (
              <TextArea
                autoFocus
                className="min-h-32 bg-[var(--color-surface)]"
                hasError={Boolean(error)}
                onChange={(event) => {
                  setValue(event.target.value)
                  setError('')
                }}
                placeholder={question.placeholder}
                value={value}
              />
            ) : (
              <TextInput
                autoFocus
                className="min-h-13 bg-[var(--color-surface)]"
                hasError={Boolean(error)}
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
          </Field>
          <Button
            block
            className="mt-5"
            size="lg"
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
          </Button>
        </form>
    </Dialog>
  )
}
