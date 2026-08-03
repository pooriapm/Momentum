import { AlertTriangle, BookOpen, Clock3, Database, Flame, X } from 'lucide-react'
import type { AppLocale } from '../../platform/i18n/catalog'
import type { MealChoice } from '../data/types'
import { formatNumber } from '../lib/format'
import { Button, StatusPill } from '../ui/primitives'
import { ModalShell } from './ModalShell'

export function MealDetailSheet({
  choice,
  mealLabel,
  locale,
  onClose,
}: {
  choice: MealChoice
  mealLabel: string
  locale: AppLocale
  onClose: () => void
}) {
  return (
    <ModalShell className="meal-detail-sheet" labelId="meal-detail-title" onClose={onClose}>
      <section>
        <header>
          <div><p className="orbit-eyebrow">{mealLabel}</p><h2 id="meal-detail-title">{choice.name[locale]}</h2></div>
          <button aria-label={locale === 'fa' ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <p className="meal-detail-sheet__description">{choice.description[locale]}</p>
        <div className="meal-detail-sheet__metrics">
          <span><Flame size={17} /><strong>{formatNumber(choice.nutrition.calories, locale)}</strong><small>kcal</small></span>
          <span><strong>{formatNumber(choice.nutrition.protein, locale)}g</strong><small>{locale === 'fa' ? 'پروتئین' : 'protein'}</small></span>
          <span><Clock3 size={17} /><strong>{formatNumber(choice.cookingMinutes, locale)}</strong><small>{locale === 'fa' ? 'دقیقه' : 'min'}</small></span>
        </div>
        <div className="meal-detail-sheet__confidence">
          <Database size={17} />
          <div><strong>{locale === 'fa' ? 'اطمینان داده تغذیه' : 'Nutrition confidence'}</strong><small>{choice.nutritionSource ?? choice.confidence} · {choice.confidenceLevel ?? choice.confidence}</small></div>
          <StatusPill tone={choice.confidence === 'estimated' ? 'neutral' : 'success'}>{choice.confidence}</StatusPill>
        </div>
        {choice.ingredients?.length ? (
          <section><h3>{locale === 'fa' ? 'مواد لازم' : 'Ingredients'}</h3><ul className="meal-detail-sheet__ingredients">{choice.ingredients.map((item, index) => <li key={`${item.name.en}-${index}`}><span>{item.name[locale]}</span><strong>{formatNumber(item.amount, locale)} {item.unit}</strong></li>)}</ul></section>
        ) : null}
        {choice.recipe ? (
          <section><h3><BookOpen size={18} />{locale === 'fa' ? 'روش آماده‌سازی' : 'Recipe'}</h3><ol className="meal-detail-sheet__steps">{choice.recipe.steps.map((step, index) => <li key={`${step.en}-${index}`}><span>{formatNumber(index + 1, locale)}</span><p>{step[locale]}</p></li>)}</ol></section>
        ) : null}
        {choice.warnings?.length ? <div className="inline-notice inline-notice--warning"><AlertTriangle size={18} /><div>{choice.warnings.map((warning) => <p key={warning.en}>{warning[locale]}</p>)}</div></div> : null}
        <Button block onClick={onClose} variant="secondary">{locale === 'fa' ? 'بستن' : 'Close'}</Button>
      </section>
    </ModalShell>
  )
}
