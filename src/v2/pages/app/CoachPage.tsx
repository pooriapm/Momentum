import { BrainCircuit, CalendarClock, ChevronRight, Send, ShieldAlert, Sparkles, UtensilsCrossed, Zap } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { loadCoachHistory, sendCoachMessage } from '../../data/repository'
import type { MomentumPlanView } from '../../data/types'
import { Button, ContentCard, GlassChrome, StatusPill } from '../../ui/primitives'
import { EmptyPlanState } from './EmptyPlanState'
import { useOnlineStatus } from '../../../platform/pwa/network'

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  safetyLevel?: string
}

export function CoachPage({ locale, plan, preview }: { locale: AppLocale; plan: MomentumPlanView | null; preview: boolean }) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [threadId, setThreadId] = useState<string>()
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const pendingRequest = useRef<{ key: string; message: string; threadId?: string } | null>(null)
  const historyQuery = useQuery({
    queryKey: ['coach-history', locale],
    queryFn: () => loadCoachHistory(locale),
    enabled: !preview,
    staleTime: 30_000,
  })

  if (!plan) return <EmptyPlanState locale={locale} />

  const effectiveThreadId = threadId ?? historyQuery.data?.threadId
  const historicalMessages: Message[] = historyQuery.data?.messages.length
    ? historyQuery.data.messages
    : [{ id: 'welcome', role: 'assistant', content: t('app.coachWelcome') }]
  const displayMessages = [...historicalMessages, ...messages]

  const suggestions = locale === 'fa'
    ? ['برای شام وقت آشپزی ندارم', 'انرژی تمرینم پایین است', 'ناهارم را بیرون می‌خورم']
    : ['I have no time to cook dinner', 'My training energy feels low', 'I am eating lunch out']

  async function submit(event: FormEvent) {
    event.preventDefault()
    const message = input.trim()
    if (!message || sending) return
    const isRetry = pendingRequest.current?.message === message && pendingRequest.current.threadId === effectiveThreadId
    if (!isRetry) setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', content: message }])
    setInput('')
    setError('')
    setSending(true)
    const request = isRetry && pendingRequest.current
      ? pendingRequest.current
      : { key: crypto.randomUUID(), message, threadId: effectiveThreadId }
    pendingRequest.current = request
    try {
      const response = preview
        ? { message: locale === 'fa' ? 'متوجه شدم. با توجه به برنامه‌ی امروز، دو گزینه‌ی هم‌ارزش داری: رپ بوقلمون آماده یا کاسه ماست یونانی، نان و سبزیجات. اگر بگویی کدام مواد را در دسترس داری، دقیق‌تر انتخاب می‌کنیم.' : 'Got it. Based on today’s plan, you have two equivalent options: a ready turkey wrap or a Greek-yogurt, bread, and vegetable bowl. Tell me what you have available and we can narrow it down.', safety: undefined, suggestedActions: [] }
        : await sendCoachMessage(message, locale, effectiveThreadId, request.key)
      if ('threadId' in response) setThreadId(response.threadId)
      setSuggestedActions(response.suggestedActions)
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: response.message, safetyLevel: response.safety?.level }])
      pendingRequest.current = null
    } catch {
      setInput(message)
      setError(locale === 'fa' ? 'پاسخ کامل دریافت نشد. برای ادامه امن، همان پیام را دوباره ارسال کن؛ درخواست تکراری محاسبه نمی‌شود.' : 'The full response was not received. Send the same message again; the retry reuses the original request key.')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="app-page coach-page screen-enter">
      <section className="page-heading">
        <div><p className="orbit-eyebrow"><Sparkles size={15} />{locale === 'fa' ? 'همراهی متناسب با شرایط تو' : 'Context-aware support'}</p><h1>{t('app.coachTitle')}</h1><p>{t('app.coachSubtitle')}</p></div>
        <StatusPill tone={online ? 'success' : 'neutral'}><span className="online-dot" />{online ? (locale === 'fa' ? 'متصل' : 'Online') : (locale === 'fa' ? 'آفلاین' : 'Offline')}</StatusPill>
      </section>
      <div className="coach-layout">
        <ContentCard className="coach-conversation">
          <div className="coach-messages" aria-live="polite">
            {displayMessages.map((message) => (
              <div className={`coach-message coach-message--${message.role} ${message.safetyLevel && message.safetyLevel !== 'normal' ? `coach-message--${message.safetyLevel}` : ''}`} key={message.id}>
                {message.role === 'assistant' ? <span><BrainCircuit size={18} /></span> : null}
                <div>{message.safetyLevel && message.safetyLevel !== 'normal' ? <strong className="coach-safety-label"><ShieldAlert size={15} />{message.safetyLevel === 'urgent' ? (locale === 'fa' ? 'اقدام فوری' : 'Urgent') : (locale === 'fa' ? 'احتیاط' : 'Caution')}</strong> : null}<p>{message.content}</p></div>
              </div>
            ))}
            {sending ? <div className="coach-message coach-message--assistant"><span><BrainCircuit size={18} /></span><p className="typing-indicator"><i /><i /><i /></p></div> : null}
          </div>
          <div className="coach-suggestions">{[...new Set([...suggestedActions, ...(historyQuery.data?.suggestedActions ?? []), ...suggestions])].slice(0, 6).map((suggestion) => <button key={suggestion} onClick={() => setInput(suggestion)} type="button">{suggestion}</button>)}</div>
          {error ? <div className="inline-notice inline-notice--error" role="alert">{error}</div> : null}
          <GlassChrome className="coach-composer">
            <form onSubmit={submit}>
              <textarea aria-label={t('app.coachPlaceholder')} disabled={!preview && !online} onChange={(event) => setInput(event.target.value)} placeholder={t('app.coachPlaceholder')} rows={1} value={input} />
              <Button aria-label={locale === 'fa' ? 'ارسال پیام' : 'Send message'} disabled={!input.trim() || (!preview && !online)} loading={sending} type="submit"><Send size={17} /></Button>
            </form>
            <small>{locale === 'fa' ? 'Momentum ممکن است اشتباه کند؛ توصیه‌ی مهم سلامت را با متخصص بررسی کن.' : 'Momentum can make mistakes. Verify important health guidance with a professional.'}</small>
          </GlassChrome>
        </ContentCard>
        <aside className="coach-context-stack">
          <ContentCard>
            <p className="orbit-eyebrow">{locale === 'fa' ? 'اطلاعات فعال' : 'Active context'}</p>
            <h3>{locale === 'fa' ? 'آنچه مربی می‌داند' : 'What your coach knows'}</h3>
            <ul>
              <li><CalendarClock size={17} /><span>{locale === 'fa' ? 'برنامه و زمان امروز' : 'Today’s plan and schedule'}</span><ChevronRight className="directional-icon" size={16} /></li>
              <li><UtensilsCrossed size={17} /><span>{locale === 'fa' ? 'ترجیحات و آلرژی‌ها' : 'Preferences and allergies'}</span><ChevronRight className="directional-icon" size={16} /></li>
              <li><Zap size={17} /><span>{locale === 'fa' ? 'چک‌این و آمادگی اخیر' : 'Recent check-ins and readiness'}</span><ChevronRight className="directional-icon" size={16} /></li>
            </ul>
          </ContentCard>
          <ContentCard className="usage-card"><span>{plan.progress.entitlementLabel ? (locale === 'fa' ? plan.progress.entitlementLabel.fa : plan.progress.entitlementLabel.en) : 'Momentum'}</span><strong>{plan.progress.coachMessagesUsed} / {plan.progress.coachMessagesLimit}</strong><small>{locale === 'fa' ? 'پیام استفاده‌شده این ماه' : 'coach messages used this month'}</small><div><i style={{ width: `${Math.min(100, (plan.progress.coachMessagesUsed / plan.progress.coachMessagesLimit) * 100)}%` }} /></div></ContentCard>
        </aside>
      </div>
    </main>
  )
}
