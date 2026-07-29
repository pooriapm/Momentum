import { useMemo, useState } from 'react'
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Dumbbell,
  Flag,
  Scale,
  Target,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import { Button } from '../../components/ui/Button'
import { IconButton } from '../../components/ui/IconButton'
import { IconTile } from '../../components/ui/IconTile'
import { Surface } from '../../components/ui/Surface'
import {
  formatJalaliDate,
  fromJalali,
  getJalaliMonthGrid,
  getTodayIso,
  isSameJalaliDay,
  PERSIAN_WEEKDAYS,
  toJalali,
  toPersianDigits,
} from '../../lib/dates/jalali'
import type { ISODate } from '../../types/domain'

function changeMonth(jy: number, jm: number, delta: number) {
  const monthIndex = jy * 12 + (jm - 1) + delta
  return {
    jy: Math.floor(monthIndex / 12),
    jm: (monthIndex % 12) + 1,
  }
}

export function CalendarScreen() {
  const { appState } = useAppState()
  const today = getTodayIso()
  const todayJalali = toJalali(today)
  const [visibleMonth, setVisibleMonth] = useState({
    jy: todayJalali.jy,
    jm: todayJalali.jm,
  })
  const [selectedDate, setSelectedDate] = useState<ISODate>(today)
  const monthCells = useMemo(
    () => getJalaliMonthGrid(visibleMonth.jy, visibleMonth.jm),
    [visibleMonth],
  )

  if (!appState) {
    return null
  }

  const { profile, dailyLogs, plans, planPriority } = appState
  const selectedLog = dailyLogs[selectedDate]
  const activePlanId = planPriority.find((planId) => {
    const plan = plans[planId]
    return plan && selectedDate >= plan.validFrom && selectedDate <= plan.validTo
  })
  const activePlan = activePlanId ? plans[activePlanId] : undefined
  const isJourneyStart = isSameJalaliDay(selectedDate, profile.journeyStartDate)
  const isGoalDate = isSameJalaliDay(selectedDate, profile.goalDate)

  const goToday = () => {
    setSelectedDate(today)
    setVisibleMonth({ jy: todayJalali.jy, jm: todayJalali.jm })
  }

  const selectDate = (isoDate: ISODate) => {
    const selectedJalali = toJalali(isoDate)
    setSelectedDate(isoDate)

    if (
      selectedJalali.jy !== visibleMonth.jy ||
      selectedJalali.jm !== visibleMonth.jm
    ) {
      setVisibleMonth({ jy: selectedJalali.jy, jm: selectedJalali.jm })
    }
  }

  return (
    <div className="grid gap-4 desktop:grid-cols-[minmax(0,1fr)_310px]">
      <Surface as="section" className="overflow-hidden rounded-[28px] p-4 desktop:p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--color-accent)]">تقویم جلالی</p>
            <h1 className="mt-1 text-xl font-black text-[var(--color-text)]">
              {formatJalaliDate(
                fromJalali(visibleMonth.jy, visibleMonth.jm, 1),
                'monthYear',
              )}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <IconButton
              aria-label="ماه قبل"
              className="border border-[var(--color-border)]"
              onClick={() =>
                setVisibleMonth(changeMonth(visibleMonth.jy, visibleMonth.jm, -1))
              }
            >
              <ChevronRight aria-hidden="true" size={19} />
            </IconButton>
            <Button
              onClick={goToday}
              size="sm"
              variant="outline"
            >
              امروز
            </Button>
            <IconButton
              aria-label="ماه بعد"
              className="border border-[var(--color-border)]"
              onClick={() =>
                setVisibleMonth(changeMonth(visibleMonth.jy, visibleMonth.jm, 1))
              }
            >
              <ChevronLeft aria-hidden="true" size={19} />
            </IconButton>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-7" role="row">
          {PERSIAN_WEEKDAYS.map((weekday, index) => (
            <div
              className={`py-2 text-center text-[10px] font-bold ${
                index === 6 ? 'text-[var(--color-highlight)]' : 'text-[var(--color-text-muted)]'
              }`}
              key={weekday}
              role="columnheader"
            >
              <span className="hidden desktop:inline">{weekday}</span>
              <span className="desktop:hidden">{weekday.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1.5 desktop:gap-2" role="grid">
          {monthCells.map((cell) => {
            const isToday = isSameJalaliDay(cell.isoDate, today)
            const isSelected = isSameJalaliDay(cell.isoDate, selectedDate)
            const hasWeight = Boolean(dailyLogs[cell.isoDate]?.weightKg)
            const hasWorkout =
              dailyLogs[cell.isoDate]?.workout &&
              dailyLogs[cell.isoDate]?.workout?.type !== 'none'
            const hasPlan = planPriority.some((planId) => {
              const plan = plans[planId]
              return plan && cell.isoDate >= plan.validFrom && cell.isoDate <= plan.validTo
            })
            const isStart = isSameJalaliDay(cell.isoDate, profile.journeyStartDate)
            const isGoal = isSameJalaliDay(cell.isoDate, profile.goalDate)

            return (
              <button
                aria-label={formatJalaliDate(cell.isoDate, 'full')}
                aria-pressed={isSelected}
                className={`relative flex aspect-[0.82] min-h-12 flex-col items-center justify-center rounded-[14px] border text-sm font-bold transition desktop:aspect-square ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[var(--shadow-accent)]'
                    : isToday
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : cell.isCurrentMonth
                        ? 'border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]'
                        : 'border-transparent text-[var(--color-text-muted)] opacity-45'
                }`}
                key={cell.isoDate}
                onClick={() => selectDate(cell.isoDate)}
                role="gridcell"
                type="button"
              >
                {toPersianDigits(cell.jd)}
                <span className="absolute bottom-1.5 flex items-center gap-0.5">
                  {(hasPlan || isStart || isGoal) && (
                    <span
                      className={`size-1 rounded-full ${isSelected ? 'bg-[var(--color-on-accent)]' : 'bg-[var(--color-highlight)]'}`}
                    />
                  )}
                  {(hasWeight || hasWorkout) && (
                    <span
                      className={`size-1 rounded-full ${isSelected ? 'bg-[var(--color-on-accent)]' : 'bg-[var(--color-accent)]'}`}
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--color-border)] pt-4 text-[9px] font-bold text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--color-accent)]" />
            امروز یا ثبت روزانه
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--color-highlight)]" />
            برنامه یا رویداد مسیر
          </span>
        </div>
      </Surface>

      <Surface as="aside" className="h-fit rounded-[28px] p-5 desktop:sticky desktop:top-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-[var(--color-accent)]">جزئیات روز</p>
            <h2 className="mt-2 text-lg font-black leading-7 text-[var(--color-text)]">
              {formatJalaliDate(selectedDate, 'full')}
            </h2>
          </div>
          <IconTile className="size-10 rounded-[14px]">
            <CalendarCheck aria-hidden="true" size={19} />
          </IconTile>
        </div>

        <div className="mt-5 space-y-2">
          {isJourneyStart && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-highlight-soft)] p-3 text-xs font-bold text-[var(--color-highlight)]">
              <Flag aria-hidden="true" size={17} />
              شروع مسیر
            </div>
          )}
          {isGoalDate && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--color-accent-soft)] p-3 text-xs font-bold text-[var(--color-accent)]">
              <Target aria-hidden="true" size={17} />
              تاریخ هدف
            </div>
          )}
          {selectedLog?.weightKg && (
            <Surface className="flex items-center gap-3 rounded-2xl p-3" variant="muted">
              <Scale aria-hidden="true" className="text-[var(--color-accent)]" size={17} />
              <div>
                <p className="text-[9px] text-[var(--color-text-muted)]">وزن ثبت‌شده</p>
                <p className="mt-1 text-xs font-black text-[var(--color-text)]">
                  {toPersianDigits(selectedLog.weightKg)} کیلوگرم
                </p>
              </div>
            </Surface>
          )}
          {selectedLog?.workout && selectedLog.workout.type !== 'none' && (
            <Surface className="flex items-center gap-3 rounded-2xl p-3" variant="muted">
              <Dumbbell aria-hidden="true" className="text-[var(--color-accent)]" size={17} />
              <p className="text-xs font-bold text-[var(--color-text)]">تمرین ثبت‌شده</p>
            </Surface>
          )}
          {activePlan && (
            <Surface className="flex items-center gap-3 rounded-2xl p-3" variant="muted">
              <CircleDot aria-hidden="true" className="text-[var(--color-highlight)]" size={17} />
              <div>
                <p className="text-[9px] text-[var(--color-text-muted)]">برنامه فعال</p>
                <p className="mt-1 text-xs font-black text-[var(--color-text)]">
                  {activePlan.planName}
                </p>
              </div>
            </Surface>
          )}
          {!isJourneyStart &&
            !isGoalDate &&
            !selectedLog &&
            !activePlan && (
              <Surface className="rounded-2xl p-4 text-center" variant="dashed">
                <p className="text-xs font-bold text-[var(--color-text-secondary)]">
                  رویدادی ثبت نشده است
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[var(--color-text-muted)]">
                  برای ثبت اطلاعات این روز از صفحه امروز استفاده کن.
                </p>
              </Surface>
            )}
        </div>
      </Surface>
    </div>
  )
}
