import { useQueryClient } from '@tanstack/react-query'
import { History, RefreshCcw, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { AppLocale } from '../../platform/i18n/catalog'
import {
  confirmPlanRecalibration,
  loadPlanRevisionStatus,
  previewPlanRecalibration,
  rollbackPlanRecalibration,
  type PlanRevisionState,
} from '../data/repository'
import { Button, ContentCard, StatusPill } from '../ui/primitives'

export function PlanRecalibrationCard({ locale }: { locale: AppLocale }) {
  const queryClient = useQueryClient()
  const [revision, setRevision] = useState<PlanRevisionState | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let current = true
    void loadPlanRevisionStatus()
      .then((value) => { if (current) setRevision(value) })
      .catch(() => undefined)
    return () => { current = false }
  }, [])

  async function mutate(action: 'preview' | 'confirm' | 'rollback') {
    setBusy(true)
    setError('')
    try {
      const next = action === 'preview'
        ? await previewPlanRecalibration(reason)
        : action === 'confirm' && revision
          ? await confirmPlanRecalibration(revision.id)
          : revision ? await rollbackPlanRecalibration(revision.id) : null
      setRevision(next)
      if (action !== 'preview') {
        await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
      }
    } catch {
      setError(locale === 'fa'
        ? 'این عملیات انجام نشد. چک‌این‌ها و وضعیت اشتراک را بررسی کنید.'
        : 'The action could not be completed. Check your check-ins and entitlement.')
    } finally {
      setBusy(false)
    }
  }

  const canStart = !revision || ['cancelled', 'expired', 'rolled_back'].includes(revision.status)
  return (
    <ContentCard className="plan-recalibration-card">
      <div className="section-heading-row">
        <div>
          <p className="orbit-eyebrow"><RefreshCcw size={14} />{locale === 'fa' ? 'بازتنظیم ایمن' : 'Safe recalibration'}</p>
          <h2>{locale === 'fa' ? 'برنامه را با روند اخیر هماهنگ کن' : 'Align the plan with your recent trend'}</h2>
        </div>
        <StatusPill tone={revision?.status === 'active' ? 'success' : 'neutral'}>
          {revision?.status === 'preview'
            ? (locale === 'fa' ? 'نیازمند تأیید' : 'Needs confirmation')
            : revision?.status === 'active'
              ? (locale === 'fa' ? 'نسخه فعال' : 'Active revision')
              : (locale === 'fa' ? 'آماده' : 'Ready')}
        </StatusPill>
      </div>

      {revision?.status === 'preview' ? (
        <div>
          <p>{revision.rationale}</p>
          <ul>
            <li>{locale === 'fa' ? `${revision.changedWorkouts} تمرین بررسی شد` : `${revision.changedWorkouts} workouts reviewed`}</li>
            <li>{locale === 'fa' ? `${revision.changedExercises} حرکت تغییر کرد` : `${revision.changedExercises} exercise changes`}</li>
            <li>{revision.nutritionChanged
              ? (locale === 'fa' ? 'تغییر تغذیه' : 'Nutrition changed')
              : (locale === 'fa' ? 'تغذیه بدون تغییر' : 'Nutrition unchanged')}</li>
          </ul>
          <div className="plan-meal-row__actions">
            <span><ShieldCheck size={16} />{locale === 'fa' ? 'هیچ تغییری تا تأیید شما فعال نمی‌شود.' : 'Nothing activates until you confirm.'}</span>
            <Button loading={busy} onClick={() => void mutate('confirm')}>
              {locale === 'fa' ? 'تأیید و فعال‌سازی' : 'Confirm and activate'}
            </Button>
          </div>
        </div>
      ) : revision?.status === 'active' ? (
        <div className="plan-meal-row__actions">
          <span><History size={16} />{locale === 'fa' ? 'تا پیش از ثبت فعالیت با نسخه جدید، بازگشت ایمن ممکن است.' : 'Safe rollback is available until activity is logged on this revision.'}</span>
          <Button loading={busy} onClick={() => void mutate('rollback')} variant="secondary">
            {locale === 'fa' ? 'بازگشت به نسخه قبل' : 'Roll back'}
          </Button>
        </div>
      ) : canStart ? (
        <div>
          <label>
            <span>{locale === 'fa' ? 'تغییر شرایط یا دلیل درخواست (اختیاری)' : 'Changed circumstances or reason (optional)'}</span>
            <textarea maxLength={500} onChange={(event) => setReason(event.target.value)} rows={2} value={reason} />
          </label>
          <div className="plan-meal-row__actions">
            <span>{locale === 'fa' ? 'بر اساس حداقل سه چک‌این روزانه یا یک چک‌این هفتگی' : 'Uses at least three daily check-ins or one weekly check-in.'}</span>
            <Button loading={busy} onClick={() => void mutate('preview')}>
              {locale === 'fa' ? 'ساخت پیش‌نمایش' : 'Build preview'}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <p className="inline-notice inline-notice--error" role="alert">{error}</p> : null}
    </ContentCard>
  )
}
