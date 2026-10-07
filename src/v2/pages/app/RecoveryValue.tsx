import type { AppLocale } from '../../../platform/i18n/catalog'
import { formatNumber } from '../../lib/format'

export function RecoveryValue({
  locale,
  score,
}: {
  locale: AppLocale
  score: number | null | undefined
}) {
  const fa = locale === 'fa'
  if (score == null) {
    return <span className="recovery-value is-empty">{fa ? 'وارد نشده' : 'Not entered'}</span>
  }
  return (
    <span className="recovery-value">
      <bdi dir="ltr">{formatNumber(score, locale)}</bdi>
      <small>{fa ? 'از ۵' : 'of 5'}</small>
    </span>
  )
}
