import { useState, type ReactNode } from 'react'
import {
  Beef,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  ListChecks,
  Scale,
  ShieldAlert,
  Target,
  Trophy,
  UtensilsCrossed,
} from 'lucide-react'
import { useAppState } from '../../app/useAppState'
import {
  calculateDailyNutrition,
  getNextIncompleteMeal,
  getSelectedMealOption,
} from '../../lib/calculations/nutrition'
import {
  formatJalaliDate,
  getTodayIso,
  toPersianDigits,
} from '../../lib/dates/jalali'
import { DailyCheckIn } from '../daily-log/DailyCheckIn'
import { TodayMealCard } from '../daily-log/TodayMealCard'
import { EmergencyHungerMode } from '../emergency/EmergencyHungerMode'

function differenceInDays(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00Z`).getTime()
  const toDate = new Date(`${to}T00:00:00Z`).getTime()
  return Math.max(0, Math.ceil((toDate - fromDate) / 86_400_000))
}

function formatWeight(value: number) {
  return new Intl.NumberFormat('fa-IR', {
    maximumFractionDigits: 1,
  }).format(value)
}

function ProgressBar({
  value,
  target,
  color = 'var(--emerald)',
}: {
  value: number
  target: number
  color?: string
}) {
  const progress = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0

  return (
    <div
      aria-label={`${toPersianDigits(Math.round(progress))} درصد`}
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--border)]"
      role="progressbar"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress)}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ background: color, width: `${progress}%` }}
      />
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
  progress,
  target,
  color,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
  progress?: number
  target?: number
  color?: string
}) {
  return (
    <article className="glass-panel rounded-[22px] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-[var(--text-muted)]">{label}</p>
        <span className="text-[var(--emerald)]">{icon}</span>
      </div>
      <p className="mt-3 text-lg font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[9px] font-bold text-[var(--text-muted)]">{detail}</p>
      {progress !== undefined && target !== undefined && (
        <ProgressBar color={color} target={target} value={progress} />
      )}
    </article>
  )
}

export function TodayScreen() {
  const { appState } = useAppState()
  const [showEmergency, setShowEmergency] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)

  if (!appState) {
    return null
  }

  const { profile } = appState
  const goalDirection = Math.sign(profile.targetWeightKg - profile.startWeightKg)
  const totalWeightChange = Math.abs(profile.targetWeightKg - profile.startWeightKg)
  const recordedWeightChange = Math.max(
    0,
    (profile.currentWeightKg - profile.startWeightKg) * goalDirection,
  )
  const remainingWeight = Math.max(
    0,
    (profile.targetWeightKg - profile.currentWeightKg) * goalDirection,
  )
  const progress =
    totalWeightChange > 0
      ? Math.min(100, Math.max(0, (recordedWeightChange / totalWeightChange) * 100))
      : 100
  const today = getTodayIso()
  const daysRemaining = differenceInDays(today, profile.goalDate)
  const nutrition = calculateDailyNutrition(appState, today)
  const { activePlan, planDay, consumed, targets, remaining } = nutrition
  const dailyLog = appState.dailyLogs[today]
  const nextMeal = getNextIncompleteMeal(appState, today)
  const nextOption = nextMeal
    ? getSelectedMealOption(appState, today, nextMeal)
    : undefined
  const completedMeals =
    planDay?.meals.filter((meal) => dailyLog?.consumedMeals[meal.id]?.completed).length ?? 0
  const waterTarget = targets?.waterMl ?? 0
  const waterConsumed = dailyLog?.waterMl ?? 0
  const loggedMeals =
    planDay?.meals.flatMap((meal) => {
      const completion = dailyLog?.consumedMeals[meal.id]

      if (!completion?.completed) return []

      const selectedOption = getSelectedMealOption(appState, today, meal)
      return [
        {
          id: meal.id,
          slotTitle: meal.title,
          optionTitle: completion.optionTitle ?? selectedOption.title,
          nutrition: completion.nutrition ?? selectedOption.nutrition,
        },
      ]
    }) ?? []

  const activities = planDay
    ? [
        {
          label: `آب روزانه${waterTarget ? ` · ${toPersianDigits(waterTarget)} میلی‌لیتر` : ''}`,
          complete: waterTarget > 0 && waterConsumed >= waterTarget,
          icon: Droplets,
        },
        {
          label: `قدم‌ها${targets?.steps ? ` · ${toPersianDigits(targets.steps)}` : ''}`,
          complete: Boolean(targets?.steps && (dailyLog?.steps ?? 0) >= targets.steps),
          icon: Footprints,
        },
        {
          label: `تردمیل${targets?.treadmillMinutes ? ` · ${toPersianDigits(targets.treadmillMinutes)} دقیقه` : ''}`,
          complete: Boolean(
            targets?.treadmillMinutes &&
              (dailyLog?.treadmillMinutes ?? 0) >= targets.treadmillMinutes,
          ),
          icon: Gauge,
        },
        {
          label:
            planDay.trainingType && planDay.trainingType !== 'rest'
              ? 'تمرین برنامه‌ریزی‌شده'
              : 'روز استراحت و ریکاوری',
          complete:
            planDay.trainingType === 'rest' ||
            Boolean(dailyLog?.workout && dailyLog.workout.type !== 'none'),
          icon: Dumbbell,
        },
      ]
    : []

  return (
    <div className="space-y-4 desktop:space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-strong),var(--surface))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.18)] desktop:p-8">
        <div className="fine-grid pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative grid gap-7 desktop:grid-cols-[1fr_auto] desktop:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--emerald-soft)] px-3 py-1.5 text-[11px] font-bold text-[var(--emerald)]">
              <CalendarClock aria-hidden="true" size={14} />
              {formatJalaliDate(today, 'full')}
            </div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">
              سلام {profile.name}،
            </p>
            <h1 className="mt-2 max-w-xl text-[30px] font-black leading-[1.45] tracking-[-0.035em] text-[var(--text-primary)] desktop:text-[42px]">
              حرکت امروزت،{' '}
              <span className="block text-[var(--emerald)]">Momentum فرداست.</span>
            </h1>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)]">
                {toPersianDigits(daysRemaining)} روز تا هدف
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)]">
                هدف: {formatJalaliDate(profile.goalDate, 'long')}
              </span>
            </div>
          </div>
          <div className="relative mx-auto grid size-40 place-items-center desktop:size-48">
            <div
              className="absolute inset-0 rounded-full p-[9px] shadow-[0_0_60px_rgba(70,205,145,0.12)]"
              style={{
                background: `conic-gradient(var(--emerald) 0 ${progress}%, var(--border) ${progress}% 100%)`,
              }}
            >
              <div className="size-full rounded-full bg-[var(--surface-strong)]" />
            </div>
            <div className="relative text-center">
              <Target className="mx-auto text-[var(--emerald)]" aria-hidden="true" size={25} />
              <p className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)]">
                {toPersianDigits(Math.round(progress))}٪
              </p>
              <p className="mt-1 text-[10px] font-bold text-[var(--text-muted)]">پیشرفت وزن</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
        {[
          {
            label: 'وزن فعلی',
            value: `${formatWeight(profile.currentWeightKg)} کیلو`,
            icon: Scale,
          },
          {
            label: 'وزن هدف',
            value: `${formatWeight(profile.targetWeightKg)} کیلو`,
            icon: Target,
          },
          {
            label: 'تغییر ثبت‌شده',
            value: `${formatWeight(recordedWeightChange)} کیلو`,
            icon: Gauge,
          },
          {
            label: 'مانده تا هدف',
            value: `${formatWeight(remainingWeight)} کیلو`,
            icon: ChevronLeft,
          },
        ].map(({ label, value, icon: Icon }) => (
          <article className="glass-panel rounded-[22px] p-4 desktop:p-5" key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold text-[var(--text-muted)]">{label}</p>
              <Icon aria-hidden="true" className="text-[var(--emerald)]" size={16} />
            </div>
            <p className="mt-3 text-base font-black text-[var(--text-primary)]">{value}</p>
          </article>
        ))}
      </section>

      {planDay && activePlan && targets && remaining ? (
        <>
          <section className="grid grid-cols-2 gap-3 desktop:grid-cols-4">
            <SummaryCard
              detail={`از هدف ${toPersianDigits(targets.calories)}`}
              icon={<Flame aria-hidden="true" size={17} />}
              label="کالری مصرف‌شده"
              progress={consumed.calories}
              target={targets.calories}
              value={toPersianDigits(Math.round(consumed.calories))}
            />
            <SummaryCard
              detail={`${toPersianDigits(Math.max(0, Math.round(remaining.protein)))} گرم مانده`}
              icon={<Beef aria-hidden="true" size={17} />}
              label="پروتئین"
              progress={consumed.protein}
              target={targets.protein}
              value={`${toPersianDigits(Math.round(consumed.protein))} گرم`}
            />
            <SummaryCard
              detail={waterTarget ? `از ${toPersianDigits(waterTarget)} میلی‌لیتر` : 'هدف در فایل تعریف نشده'}
              icon={<Droplets aria-hidden="true" size={17} />}
              label="آب"
              progress={waterConsumed}
              target={waterTarget}
              value={`${toPersianDigits(waterConsumed)} ml`}
            />
            <SummaryCard
              detail={`${toPersianDigits(completedMeals)} از ${toPersianDigits(planDay.meals.length)} وعده`}
              icon={<Trophy aria-hidden="true" size={17} />}
              label="XP امروز"
              value={toPersianDigits(dailyLog?.earnedXp ?? 0)}
            />
          </section>

          <section className="glass-panel rounded-[26px] p-5 desktop:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--gold)]">{activePlan.planName}</p>
                <h2 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                  {nextMeal && nextOption
                    ? `وعده بعدی: ${nextMeal.title} — ${nextOption.title}`
                    : 'همه وعده‌های امروز ثبت شده‌اند'}
                </h2>
                <p className="mt-2 text-[10px] leading-5 text-[var(--text-muted)]">
                  {remaining.calories >= 0
                    ? `${toPersianDigits(Math.round(remaining.calories))} کالری تا هدف روز باقی مانده`
                    : `${toPersianDigits(Math.abs(Math.round(remaining.calories)))} کالری بیشتر از هدف ثبت شده`}
                </p>
              </div>
              <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[var(--gold-soft)] text-[var(--gold)]">
                <UtensilsCrossed aria-hidden="true" size={20} />
              </div>
            </div>
          </section>

          {activePlan.emergencyOptions.length > 0 && (
            <button
              className="flex min-h-16 w-full items-center gap-4 rounded-[22px] border border-[color-mix(in_srgb,var(--gold)_45%,transparent)] bg-[var(--gold-soft)] px-5 text-right transition hover:-translate-y-0.5"
              onClick={() => setShowEmergency(true)}
              type="button"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[var(--gold)] text-[#171006]">
                <ShieldAlert aria-hidden="true" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[var(--text-primary)]">
                  گرسنگی اضطراری دارم
                </span>
                <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                  انتخاب کنترل‌شده فقط از گزینه‌های فایل همین هفته
                </span>
              </span>
              <ChevronLeft aria-hidden="true" className="text-[var(--gold)]" size={19} />
            </button>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--emerald)]">برنامه امروز</p>
                <h2 className="mt-1 text-xl font-black text-[var(--text-primary)]">وعده‌ها</h2>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                {toPersianDigits(completedMeals)} / {toPersianDigits(planDay.meals.length)}
              </span>
            </div>
            <div className="space-y-3">
              {planDay.meals.map((meal) => (
                <TodayMealCard date={today} key={meal.id} meal={meal} />
              ))}
            </div>
          </section>

          {(loggedMeals.length > 0 || (dailyLog?.extraFoodLogs.length ?? 0) > 0) && (
            <section className="glass-panel rounded-[26px] p-5 desktop:p-6">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[var(--emerald-soft)] text-[var(--emerald)]">
                  <ListChecks aria-hidden="true" size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-[var(--text-primary)]">
                    لاگ غذایی امروز
                  </p>
                  <p className="mt-1 text-[9px] text-[var(--text-muted)]">
                    فقط گزینه‌هایی که انتخاب و مصرفشان را تأیید کرده‌ای
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {loggedMeals.map((item) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                    key={item.id}
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="shrink-0 text-[var(--emerald)]"
                      size={17}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-[var(--text-muted)]">
                        {item.slotTitle}
                      </p>
                      <p className="mt-1 truncate text-xs font-black text-[var(--text-primary)]">
                        {item.optionTitle}
                      </p>
                    </div>
                    <div className="shrink-0 text-left text-[8px] font-bold text-[var(--text-muted)]">
                      <p>{toPersianDigits(item.nutrition.calories)} کالری</p>
                      <p className="mt-1">{toPersianDigits(item.nutrition.protein)}g پروتئین</p>
                    </div>
                  </div>
                ))}
                {dailyLog?.extraFoodLogs.map((item) => (
                  <div
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--gold-soft)] p-3"
                    key={item.id}
                  >
                    <ShieldAlert
                      aria-hidden="true"
                      className="shrink-0 text-[var(--gold)]"
                      size={17}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-[var(--gold)]">
                        انتخاب اضطراری
                      </p>
                      <p className="mt-1 truncate text-xs font-black text-[var(--text-primary)]">
                        {item.title}
                      </p>
                    </div>
                    <div className="shrink-0 text-left text-[8px] font-bold text-[var(--text-muted)]">
                      <p>{toPersianDigits(item.nutrition.calories)} کالری</p>
                      <p className="mt-1">{toPersianDigits(item.nutrition.protein)}g پروتئین</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="glass-panel rounded-[26px] p-5 desktop:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[var(--emerald)]">فعالیت و وضعیت</p>
                <h2 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                  چک‌لیست امروز
                </h2>
              </div>
              <button
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--emerald)] px-3 text-[10px] font-black text-[#07110d]"
                onClick={() => setShowCheckIn(true)}
                type="button"
              >
                <ClipboardCheck aria-hidden="true" size={15} />
                {dailyLog?.checkInCompletedAt ? 'ویرایش چک‌این' : 'ثبت روزانه'}
              </button>
            </div>
            <div className="mt-5 grid gap-2 desktop:grid-cols-2">
              {activities.map(({ label, complete, icon: Icon }) => (
                <div
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"
                  key={label}
                >
                  <Icon
                    aria-hidden="true"
                    className={complete ? 'text-[var(--emerald)]' : 'text-[var(--text-muted)]'}
                    size={17}
                  />
                  <p className="min-w-0 flex-1 text-[10px] font-bold text-[var(--text-secondary)]">
                    {label}
                  </p>
                  {complete && (
                    <CheckCircle2 aria-label="انجام‌شده" className="text-[var(--emerald)]" size={17} />
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="glass-panel rounded-[26px] p-5 desktop:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[var(--gold)]">برنامه امروز</p>
              <h2 className="mt-2 text-lg font-black text-[var(--text-primary)]">
                برای امروز برنامه‌ای وارد نشده است
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-6 text-[var(--text-secondary)]">
                از تنظیمات فایل JSON را وارد کن؛ همه وعده‌ها و محاسبات امروز از همان فایل
                ساخته می‌شوند.
              </p>
              <button
                className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-xs font-black text-[var(--text-secondary)]"
                onClick={() => setShowCheckIn(true)}
                type="button"
              >
                <ClipboardCheck aria-hidden="true" size={16} />
                ثبت روزانه بدون برنامه غذایی
              </button>
            </div>
            <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-[var(--gold-soft)] text-[var(--gold)]">
              <ChevronLeft aria-hidden="true" size={21} />
            </div>
          </div>
        </section>
      )}

      {showEmergency && activePlan && (
        <EmergencyHungerMode
          date={today}
          onClose={() => setShowEmergency(false)}
          options={activePlan.emergencyOptions}
        />
      )}
      {showCheckIn && (
        <DailyCheckIn
          date={today}
          existing={dailyLog}
          onClose={() => setShowCheckIn(false)}
        />
      )}
    </div>
  )
}
