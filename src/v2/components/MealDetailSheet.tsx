import { AlertTriangle, BookOpen, Clock3, Database, Flame, X } from 'lucide-react'
import type { AppLocale } from '../../platform/i18n/catalog'
import type { MealChoice } from '../data/types'
import { formatNumber } from '../lib/format'
import { Button, StatusPill } from '../ui/primitives'
import { ModalShell } from './ModalShell'

function nutritionConfidencePill(choice: MealChoice, locale: AppLocale) {
  const labels = {
    estimated: { fa: 'برآورد', en: 'Estimated' },
    verified: { fa: 'تأییدشده', en: 'Verified' },
    usda: { fa: 'پایگاه داده', en: 'Database' },
    manufacturer: { fa: 'برچسب غذا', en: 'Food label' },
  } as const
  return labels[choice.confidence][locale]
}

function nutritionConfidenceDetail(choice: MealChoice, locale: AppLocale) {
  const level = choice.confidenceLevel
  if (level === 'low') return locale === 'fa' ? 'سطح اطمینان: پایین' : 'Confidence level: low'
  if (level === 'medium') return locale === 'fa' ? 'سطح اطمینان: متوسط' : 'Confidence level: medium'
  if (level === 'high') return locale === 'fa' ? 'سطح اطمینان: بالا' : 'Confidence level: high'
  if (choice.confidence === 'usda') return locale === 'fa' ? 'منبع: پایگاه داده تأییدشده' : 'Source: verified database'
  if (choice.confidence === 'manufacturer') return locale === 'fa' ? 'منبع: برچسب غذا' : 'Source: food label'
  return locale === 'fa' ? 'مقدارها برآورد هستند' : 'Values are estimates'
}

export function MealDetailSheet({
  choice,
  mealLabel,
  locale,
  onClose,
  alternatives = [],
  onSelectAlternative,
  readOnly = false,
}: {
  choice: MealChoice
  mealLabel: string
  locale: AppLocale
  onClose: () => void
  alternatives?: MealChoice[]
  onSelectAlternative?: (choice: MealChoice) => void
  readOnly?: boolean
}) {
  const fa = locale === 'fa'
  const others = alternatives.filter((item) => item.id !== choice.id)
  return (
    <ModalShell className="meal-detail-sheet" labelId="meal-detail-title" material="content" onClose={onClose}>
      <section>
        <header>
          <div><p className="orbit-eyebrow">{mealLabel}</p><h2 id="meal-detail-title">{choice.name[locale]}</h2></div>
          <button aria-label={fa ? 'بستن' : 'Close'} onClick={onClose} type="button"><X size={20} /></button>
        </header>
        <p className="meal-detail-sheet__description">{choice.description[locale]}</p>
        <div className="meal-detail-sheet__metrics">
          <span><Flame size={17} /><strong>{formatNumber(choice.nutrition.calories, locale)}</strong><small>kcal</small></span>
          <span><strong>{formatNumber(choice.nutrition.protein, locale)}g</strong><small>{fa ? 'پروتئین' : 'protein'}</small></span>
          <span><Clock3 size={17} /><strong>{formatNumber(choice.cookingMinutes, locale)}</strong><small>{fa ? 'دقیقه' : 'min'}</small></span>
        </div>
        <div className="meal-detail-sheet__confidence">
          <Database size={17} />
          <div>
            <strong>{fa ? 'اطمینان داده تغذیه' : 'Nutrition confidence'}</strong>
            <small>{nutritionConfidenceDetail(choice, locale)}</small>
          </div>
          <StatusPill tone={choice.confidence === 'estimated' ? 'neutral' : 'success'}>{nutritionConfidencePill(choice, locale)}</StatusPill>
        </div>
        <div className="inline-notice" role="note">
          {fa
            ? `منبع و قیود: برنامه فعال · ${choice.nutritionSource === 'catalog_reference' ? 'کاتالوگ' : choice.nutritionSource === 'verified_database' ? 'پایگاه داده تأییدشده' : choice.nutritionSource === 'food_label' ? 'برچسب غذا' : 'برآورد مدل'}. محدودیت‌های ثبت‌شده حفظ می‌شوند.`
            : `Provenance: active plan · ${choice.nutritionSource === 'catalog_reference' ? 'catalog' : choice.nutritionSource === 'verified_database' ? 'verified database' : choice.nutritionSource === 'food_label' ? 'food label' : 'model estimate'}. Confirmed constraints stay in force.`}
        </div>
        {choice.ingredients?.length ? (
          <section><h3>{fa ? 'مواد لازم' : 'Ingredients'}</h3><ul className="meal-detail-sheet__ingredients">{choice.ingredients.map((item, index) => <li key={`${item.name.en}-${index}`}><span>{item.name[locale]}</span><strong>{formatNumber(item.amount, locale)} {item.unit}</strong></li>)}</ul></section>
        ) : null}
        {choice.recipe ? (
          <section><h3><BookOpen size={18} />{fa ? 'روش آماده‌سازی' : 'Recipe'}</h3><ol className="meal-detail-sheet__steps">{choice.recipe.steps.map((step, index) => <li key={`${step.en}-${index}`}><span>{formatNumber(index + 1, locale)}</span><p>{step[locale]}</p></li>)}</ol></section>
        ) : null}
        {others.length ? (
          <section>
            <h3>{fa ? 'جایگزین‌های هم‌ارزش' : 'Equivalent alternatives'}</h3>
            <div className="inline-notice">{fa ? 'فقط همین وعده تغییر می‌کند؛ برنامه ماهانه بازتولید نمی‌شود.' : 'Only this meal changes; the monthly plan is not regenerated.'}</div>
            <ul className="meal-detail-sheet__ingredients">
              {others.map((option) => (
                <li key={option.id}>
                  <span>{option.name[locale]}</span>
                  {onSelectAlternative && !readOnly ? (
                    <Button onClick={() => onSelectAlternative(option)} variant="secondary">{fa ? 'انتخاب' : 'Choose'}</Button>
                  ) : <strong>{formatNumber(option.nutrition.calories, locale)} kcal</strong>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {choice.warnings?.length ? <div className="inline-notice inline-notice--warning"><AlertTriangle size={18} /><div>{choice.warnings.map((warning) => <p key={warning.en}>{warning[locale]}</p>)}</div></div> : null}
        <Button block onClick={onClose} variant="secondary">{fa ? 'بستن' : 'Close'}</Button>
      </section>
    </ModalShell>
  )
}
