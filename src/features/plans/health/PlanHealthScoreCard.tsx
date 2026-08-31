import { AlertTriangle, CheckCircle2, Download, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Surface } from '../../../components/ui/Surface'
import type { MonthlyMealPlan } from '../../../types/domain'
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

export function PlanHealthScoreCard({ plan }: { plan: MonthlyMealPlan }) {
  const analysis = analyzePlanHealth(plan)
  const issues = analysis.insights.filter(
    (insight) => insight.severity !== 'positive',
  )

  return (
    <Surface as="section" className="rounded-[24px] p-4 desktop:p-5" variant="muted">
      <div className="flex items-start gap-4">
        <div
          className="grid size-16 shrink-0 place-items-center rounded-full border-[5px] border-[var(--color-accent)] bg-[var(--color-surface)] text-center shadow-[var(--shadow-health-score)]"
          title={`امتیاز ${analysis.score} از ۱۰۰`}
        >
          <span className="text-lg font-black text-[var(--color-text)]">
            {analysis.score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[var(--color-accent)]">
            <Sparkles aria-hidden="true" size={17} />
            <p className="text-xs font-black">Plan Health Score</p>
          </div>
          <h3 className="mt-2 text-lg font-black text-[var(--color-text)]">
            کیفیت برنامه: {analysis.label}
          </h3>
          <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">
            این امتیاز جایگزین نظر پزشک یا متخصص تغذیه نیست؛ فقط سازگاری و منطق داخلی
            فایل را بررسی می‌کند.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 desktop:grid-cols-2">
        {analysis.insights.slice(0, 6).map((insight) => {
          const positive = insight.severity === 'positive'
          return (
            <Surface
              className="rounded-2xl p-3"
              key={insight.id}
              variant={positive ? 'accent' : 'highlight'}
            >
              <div className="flex items-start gap-2">
                {positive ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--color-accent)]"
                    size={15}
                  />
                ) : (
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[var(--color-highlight)]"
                    size={15}
                  />
                )}
                <div>
                  <p className="text-[11px] font-black text-[var(--color-text)]">
                    {insight.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-5 text-[var(--color-text-secondary)]">
                    {insight.message}
                  </p>
                </div>
              </div>
            </Surface>
          )
        })}
      </div>

      {issues.length > 0 && (
        <Button
          className="mt-4"
          onClick={() =>
            downloadText(
              createPlanImprovementPrompt(plan, analysis),
              'momentum-plan-improvement-prompt.md',
            )
          }
          variant="highlight-soft"
        >
          <Download aria-hidden="true" size={16} />
          دریافت پرامپت اصلاح برنامه برای ChatGPT
        </Button>
      )}
    </Surface>
  )
}
