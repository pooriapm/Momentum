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
      <section className="glass-panel overflow-hidden rounded-[28px] p-4 desktop:p-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[var(--emerald)]">تقویم جلالی</p>
            <h1 className="mt-1 text-xl font-black text-[var(--text-primary)]">
              {formatJalaliDate(
                fromJalali(visibleMonth.jy, visibleMonth.jm, 1),
                'monthYear',
              )}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              aria-label="ماه بعد"
              className="grid size-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
              onClick={() =>
                setVisibleMonth(changeMonth(visibleMonth.jy, visibleMonth.jm, 1))
              }
              type="button"
            >
              <ChevronRight aria-hidden="true" size={19} />
            </button>
            <button
              className="min-h-11 rounded-xl border border-[var(--border)] px-3 text-[11px] font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
              onClick={goToday}
              type="button"
            >
              امروز
            </button>
            <button
              aria-label="ماه قبل"
              className="grid size-11 place-items-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-soft)]"
              onClick={() =>
                setVisibleMonth(changeMonth(visibleMonth.jy, visibleMonth.jm, -1))
              }
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={19} />
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-7" role="row">
          {PERSIAN_WEEKDAYS.map((weekday, index) => (
            <div
              className={`py-2 text-center text-[10px] font-bold ${
                index === 6 ? 'text-[var(--gold)]' : 'text-[var(--text-muted)]'
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
                    ? 'border-[var(--emerald)] bg-[var(--emerald)] text-[#07110d] shadow-[0_8px_24px_rgba(70,205,145,0.2)]'
                    : isToday
                      ? 'border-[var(--emerald)] bg-[var(--emerald-soft)] text-[var(--emerald)]'
                      : cell.isCurrentMonth
                        ? 'border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]'
                        : 'border-transparent text-[var(--text-muted)] opacity-45'
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
                      className={`size-1 rounded-full ${isSelected ? 'bg-[#07110d]' : 'bg-[var(--gold)]'}`}
                    />
                  )}
                  {(hasWeight || hasWorkout) && (
                    <span
                      className={`size-1 rounded-full ${isSelected ? 'bg-[#07110d]' : 'bg-[var(--emerald)]'}`}
                    />
                  )}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-[var(--border)] pt-4 text-[9px] font-bold text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--emerald)]" />
            امروز یا ثبت روزانه
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--gold)]" />
            برنامه یا رویداد مسیر
          </span>
        </div>
      </section>

      <aside className="glass-panel h-fit rounded-[28px] p-5 desktop:sticky desktop:top-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-[var(--emerald)]">جزئیات روز</p>
            <h2 className="mt-2 text-lg font-black leading-7 text-[var(--text-primary)]">
              {formatJalaliDate(selectedDate, 'full')}
            </h2>
          </div>
          <div className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[var(--emerald-soft)] text-[var(--emerald)]">
            <CalendarCheck aria-hidden="true" size={19} />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {isJourneyStart && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--gold-soft)] p-3 text-xs font-bold text-[var(--gold)]">
              <Flag aria-hidden="true" size={17} />
              شروع مسیر
            </div>
          )}
          {isGoalDate && (
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--emerald-soft)] p-3 text-xs font-bold text-[var(--emerald)]">
              <Target aria-hidden="true" size={17} />
              تاریخ هدف
            </div>
          )}
          {selectedLog?.weightKg && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <Scale aria-hidden="true" className="text-[var(--emerald)]" size={17} />
              <div>
                <p className="text-[9px] text-[var(--text-muted)]">وزن ثبت‌شده</p>
                <p className="mt-1 text-xs font-black text-[var(--text-primary)]">
                  {toPersianDigits(selectedLog.weightKg)} کیلوگرم
                </p>
              </div>
            </div>
          )}
          {selectedLog?.workout && selectedLog.workout.type !== 'none' && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <Dumbbell aria-hidden="true" className="text-[var(--emerald)]" size={17} />
              <p className="text-xs font-bold text-[var(--text-primary)]">تمرین ثبت‌شده</p>
            </div>
          )}
          {activePlan && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3">
              <CircleDot aria-hidden="true" className="text-[var(--gold)]" size={17} />
              <div>
                <p className="text-[9px] text-[var(--text-muted)]">برنامه فعال</p>
                <p className="mt-1 text-xs font-black text-[var(--text-primary)]">
                  {activePlan.planName}
                </p>
              </div>
            </div>
          )}
          {!isJourneyStart &&
            !isGoalDate &&
            !selectedLog &&
            !activePlan && (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-4 text-center">
                <p className="text-xs font-bold text-[var(--text-secondary)]">
                  رویدادی ثبت نشده است
                </p>
                <p className="mt-2 text-[10px] leading-5 text-[var(--text-muted)]">
                  برای ثبت اطلاعات این روز از صفحه امروز استفاده کن.
                </p>
              </div>
            )}
        </div>
      </aside>
    </div>
  )
}
