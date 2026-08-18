import { useMemo, useState } from 'react'
import { Check, Clock3, Flame, ShieldCheck, Star, X } from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { IconButton } from '../../components/ui/IconButton'
import { Surface } from '../../components/ui/Surface'
import { toPersianDigits } from '../../lib/dates/jalali'
import type { EmergencyOption, ISODate } from '../../types/domain'

type DinnerWindow = 'under60' | 'oneToTwo' | 'overTwo'

const dinnerWindows: Array<{
  id: DinnerWindow
  label: string
  minutes: number
}> = [
  { id: 'under60', label: 'کمتر از ۶۰ دقیقه', minutes: 45 },
  { id: 'oneToTwo', label: '۱ تا ۲ ساعت', minutes: 90 },
  { id: 'overTwo', label: 'بیشتر از ۲ ساعت', minutes: 150 },
]

export function EmergencyHungerMode({
  date,
  options,
  onClose,
}: {
  date: ISODate
  options: EmergencyOption[]
  onClose: () => void
}) {
  const { logEmergencyFood } = useAppState()
  const [hunger, setHunger] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [dinnerWindow, setDinnerWindow] = useState<DinnerWindow>('oneToTwo')
  const [loggedOptionId, setLoggedOptionId] = useState<string>()
  const minutes = dinnerWindows.find((window) => window.id === dinnerWindow)?.minutes ?? 90

  const matches = useMemo(() => {
    const exact = options.filter(
      (option) =>
        option.suitableForHungerLevels.includes(hunger) &&
        (option.minimumMinutesBeforeDinner === undefined ||
          minutes >= option.minimumMinutesBeforeDinner) &&
        (option.maximumMinutesBeforeDinner === undefined ||
          minutes <= option.maximumMinutesBeforeDinner),
    )

    if (exact.length > 0) return exact
    return options.filter((option) => option.suitableForHungerLevels.includes(hunger))
  }, [hunger, minutes, options])

  return (
    <Dialog
      contentClassName="p-5 desktop:p-7"
      onClose={onClose}
      placement="sheet"
      size="lg"
    >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-[var(--color-highlight)]">حالت کنترل گرسنگی</p>
            <h2 className="mt-2 text-2xl font-black text-[var(--color-text)]">
              گرسنگی اضطراری
            </h2>
            <p className="mt-2 text-xs leading-6 text-[var(--color-text-secondary)]">
              پیشنهادها فقط از برنامه غذایی واردشده انتخاب می‌شوند.
            </p>
          </div>
          <IconButton
            aria-label="بستن حالت گرسنگی اضطراری"
            onClick={onClose}
          >
            <X aria-hidden="true" size={19} />
          </IconButton>
        </div>

        <fieldset className="mt-6">
          <legend className="text-xs font-black text-[var(--color-text)]">
            شدت گرسنگی چقدر است؟
          </legend>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {([1, 2, 3, 4, 5] as const).map((level) => (
              <Button
                aria-pressed={hunger === level}
                block
                key={level}
                onClick={() => setHunger(level)}
                size="lg"
                variant={hunger === level ? 'highlight' : 'secondary'}
              >
                {toPersianDigits(level)}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs font-black text-[var(--color-text)]">
            شام چقدر فاصله دارد؟
          </legend>
          <div className="mt-3 grid gap-2 desktop:grid-cols-3">
            {dinnerWindows.map((window) => (
              <Button
                aria-pressed={dinnerWindow === window.id}
                block
                key={window.id}
                onClick={() => setDinnerWindow(window.id)}
                size="lg"
                variant={dinnerWindow === window.id ? 'accent' : 'secondary'}
              >
                {window.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <div className="mt-7">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[var(--color-text)]">پیشنهادهای مناسب</p>
            <span className="text-[9px] font-bold text-[var(--color-text-muted)]">
              {toPersianDigits(matches.length)} گزینه
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {matches.map((option) => (
              <Surface
                as="article"
                className="rounded-2xl p-4"
                key={option.id}
                variant="muted"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-[var(--color-text)]">{option.title}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[8px] font-bold text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1">
                        <Flame aria-hidden="true" size={11} />
                        {toPersianDigits(option.nutrition.calories)} کالری
                      </span>
                      <span>{toPersianDigits(option.nutrition.protein)}g پروتئین</span>
                      {option.prepTimeMinutes !== undefined && (
                        <span className="flex items-center gap-1">
                          <Clock3 aria-hidden="true" size={11} />
                          {toPersianDigits(option.prepTimeMinutes)} دقیقه
                        </span>
                      )}
                      {option.satietyScore !== undefined && (
                        <span className="flex items-center gap-1">
                          <Star aria-hidden="true" size={11} />
                          سیری {toPersianDigits(option.satietyScore)}/۵
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    className="shrink-0"
                    disabled={loggedOptionId !== undefined}
                    onClick={() => {
                      if (logEmergencyFood(date, option)) {
                        setLoggedOptionId(option.id)
                      }
                    }}
                    size="md"
                    variant={loggedOptionId === option.id ? 'accent' : 'primary'}
                  >
                    {loggedOptionId === option.id ? (
                      <>
                        <Check aria-hidden="true" size={14} />
                        ثبت شد
                      </>
                    ) : (
                      <>
                        <ShieldCheck aria-hidden="true" size={14} />
                        ثبت · ۵ XP
                      </>
                    )}
                  </Button>
                </div>
              </Surface>
            ))}
            {matches.length === 0 && (
              <Surface className="rounded-2xl p-5 text-center" variant="dashed">
                <p className="text-xs font-bold text-[var(--color-text-secondary)]">
                  گزینه متناسبی در فایل برنامه وجود ندارد.
                </p>
              </Surface>
            )}
          </div>
        </div>
    </Dialog>
  )
}
