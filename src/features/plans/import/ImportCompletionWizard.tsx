import { useState, type FormEvent } from 'react'
import { ArrowLeft, CircleHelp, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import {
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '../../../components/ui/FormField'
import { IconTile } from '../../../components/ui/IconTile'
import { Surface } from '../../../components/ui/Surface'
import {
  parseQuestionValue,
  setValueAtPath,
  type SchemaQuestion,
} from '../../questions/question-schema'
import { sanitizeLocalizedNumberInput } from '../../../lib/numbers/localized-number'
import {
  validateMonthlyMealPlan,
  type PlanValidationResult,
} from '../validation/monthly-plan-schema'

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
      ...validateMonthlyMealPlan(nextDraft),
      fileName,
    })
  }

  if (!question) return null

  return (
    <Surface as="section" className="rounded-[24px] p-4 desktop:p-5" variant="accent">
      <div className="flex items-start gap-3">
        <IconTile tone="accent-solid">
          <CircleHelp aria-hidden="true" size={21} />
        </IconTile>
        <div>
          <p className="text-xs font-black text-[var(--color-accent)]">
            تکمیل هوشمند فایل
          </p>
          <h3 className="mt-1 text-base font-black text-[var(--color-text)]">
            فقط اطلاعات جاافتاده را می‌پرسیم
          </h3>
          <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
            سؤال {currentIndex + 1} از {questions.length} · گروه {question.group}
          </p>
        </div>
      </div>

      <form className="mt-5" onSubmit={submitAnswer}>
        <Field
          error={error || undefined}
          label={question.question}
          labelClassName="text-sm font-black text-[var(--color-text)]"
        >
          {question.inputType === 'select' ? (
            <SelectInput
              autoFocus
              className="rounded-xl bg-[var(--color-surface)] px-3 font-bold"
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
              className="min-h-28 rounded-xl bg-[var(--color-surface)]"
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
              className="rounded-xl bg-[var(--color-surface)] px-3"
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
          className="mt-5"
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
        </Button>
      </form>
    </Surface>
  )
}
