import { AlertTriangle, CheckCircle2, Download, Sparkles } from 'lucide-react'
import type { WeeklyMealPlan } from '../../../types/domain'
import {
  analyzePlanHealth,
  createPlanImprovementPrompt,
} from './plan-health-score'

function downloadText(content: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/markdown;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PlanHealthScoreCard({ plan }: { plan: WeeklyMealPlan }) {
  const analysis = analyzePlanHealth(plan)
  const issues = analysis.insights.filter(
    (insight) => insight.severity !== 'positive',
  )

  return (
    <section className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 desktop:p-5">
      <div className="flex items-start gap-4">
        <div
          className="grid size-16 shrink-0 place-items-center rounded-full border-[5px] border-[var(--emerald)] bg-[var(--surface)] text-center shadow-[0_0_30px_rgba(75,214,154,0.12)]"
          title={`امتیاز ${analysis.score} از ۱۰۰`}
        >
          <span className="text-lg font-black text-[var(--text-primary)]">
            {analysis.score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[var(--emerald)]">
            <Sparkles aria-hidden="true" size={17} />
            <p className="text-xs font-black">Plan Health Score</p>
          </div>
          <h3 className="mt-2 text-lg font-black text-[var(--text-primary)]">
            کیفیت برنامه: {analysis.label}
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
            این امتیاز جایگزین نظر پزشک یا متخصص تغذیه نیست؛ فقط سازگاری و منطق داخلی
            فایل را بررسی می‌کند.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 desktop:grid-cols-2">
        {analysis.insights.slice(0, 6).map((insight) => {
          const positive = insight.severity === 'positive'
          return (
            <div
              className={`rounded-2xl border p-3 ${
                positive
                  ? 'border-[color-mix(in_srgb,var(--emerald)_20%,transparent)] bg-[var(--emerald-soft)]'
                  : 'border-[color-mix(in_srgb,var(--gold)_25%,transparent)] bg-[var(--gold-soft)]'
              }`}
              key={insight.id}
            >
              <div className="flex items-start gap-2">
                {positive ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--emerald)]"
                    size={15}
                  />
                ) : (
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--gold)]"
                    size={15}
                  />
                )}
                <div>
                  <p className="text-[11px] font-black text-[var(--text-primary)]">
                    {insight.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {issues.length > 0 && (
        <button
          className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-[var(--gold)] px-4 text-[11px] font-black text-[var(--gold)] hover:bg-[var(--gold-soft)]"
          onClick={() =>
            downloadText(
              createPlanImprovementPrompt(plan, analysis),
              'momentum-plan-improvement-prompt.md',
            )
          }
          type="button"
        >
          <Download aria-hidden="true" size={16} />
          دریافت پرامپت اصلاح برنامه برای ChatGPT
        </button>
      )}
    </section>
  )
}
