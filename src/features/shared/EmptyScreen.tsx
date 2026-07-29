import { CloudOff, TrendingUp, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import type { AppTab } from '../../types/ui'

const emptyScreens: Record<
  Extract<AppTab, 'meal-plan' | 'progress'>,
  { icon: LucideIcon; eyebrow: string; title: string; body: string }
> = {
  'meal-plan': {
    icon: UtensilsCrossed,
    eyebrow: 'برنامه غذایی',
    title: 'برنامه‌ای وارد نشده است',
    body: 'فایل هفتگی JSON را از تنظیمات انتخاب کن تا پس از اعتبارسنجی اینجا نمایش داده شود.',
  },
  progress: {
    icon: TrendingUp,
    eyebrow: 'پیشرفت',
    title: 'هنوز داده‌ای برای نمایش نیست',
    body: 'پس از ثبت وزن و فعالیت، روند وزن، پایبندی، امتیاز و دستاوردها در این بخش نمایش داده می‌شوند.',
  },
}

export function EmptyScreen({ tab }: { tab: Extract<AppTab, 'meal-plan' | 'progress'> }) {
  const screen = emptyScreens[tab]
  const Icon = screen.icon

  return (
    <section className="glass-panel relative flex min-h-[500px] overflow-hidden rounded-[28px] p-6 desktop:min-h-[620px] desktop:p-10">
      <div className="fine-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative m-auto max-w-md text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-[22px] border border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Icon aria-hidden="true" size={28} strokeWidth={1.7} />
        </div>
        <p className="mt-6 text-xs font-bold text-[var(--color-accent)]">{screen.eyebrow}</p>
        <h1 className="mt-3 text-2xl font-black text-[var(--color-text)] desktop:text-3xl">
          {screen.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--color-text-secondary)]">{screen.body}</p>
        <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-[11px] font-bold text-[var(--color-text-muted)]">
          <CloudOff aria-hidden="true" size={15} />
          بدون سرور و فقط روی همین دستگاه
        </div>
      </div>
    </section>
  )
}
