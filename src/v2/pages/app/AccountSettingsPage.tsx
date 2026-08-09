import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ChevronLeft, LockKeyhole, Save, ShieldOff, Sparkles } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'wouter'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { useOnlineStatus } from '../../../platform/pwa/network'
import { accountSettingsUpdateSchema, type AccountSettings, type AccountSettingsUpdate } from '../../settings/contracts'
import { loadAccountSettings, updateAccountSettings, withdrawHealthConsent } from '../../settings/repository'
import { countryName } from '../../onboarding/countries'
import { localizedPath } from '../../router/route-utils'
import { Input, Select, Textarea } from '../../ui/FormControls'
import { Button, ContentCard, StatusPill } from '../../ui/primitives'

const weekdays = [
  { value: 0, fa: 'یکشنبه', en: 'Sunday' }, { value: 1, fa: 'دوشنبه', en: 'Monday' },
  { value: 2, fa: 'سه‌شنبه', en: 'Tuesday' }, { value: 3, fa: 'چهارشنبه', en: 'Wednesday' },
  { value: 4, fa: 'پنجشنبه', en: 'Thursday' }, { value: 5, fa: 'جمعه', en: 'Friday' },
  { value: 6, fa: 'شنبه', en: 'Saturday' },
] as const

const previewSettings: AccountSettings = {
  profile: { display_name: 'Ava', date_of_birth: '1992-04-12', sex: 'prefer_not_to_say', height_cm: 170, locale: 'en-US', timezone: 'Asia/Tehran', unit_system: 'metric', country_code: 'US', pricing_market: 'global', ai_country_verified: false, health_data_consent_at: new Date().toISOString(), health_consent_version: 'preview-health-v1' },
  goal: { goal_type: 'fat_loss', custom_goal: null, start_weight_kg: 76.2, target_weight_kg: 69 },
  dietary: { dietary_pattern: 'omnivore', favorite_foods: ['rice', 'chicken'], allergies: [], available_equipment: ['dumbbells'], work_schedule: 'Weekdays 9–5', cuisine_region: 'international' },
  schedule: [{ weekday: 1, activity_type: 'strength', local_start_time: '18:30:00', duration_minutes: 60 }],
}

function listText(values: string[]) { return values.join(', ') }
function parseList(value: string) { return [...new Set(value.split(/[,;\n]+/).map((item) => item.trim()).filter(Boolean))] }

function initialForm(settings: AccountSettings): AccountSettingsUpdate {
  return {
    displayName: settings.profile.display_name,
    sex: ['female', 'male', 'other', 'prefer_not_to_say'].includes(settings.profile.sex ?? '') ? settings.profile.sex as AccountSettingsUpdate['sex'] : 'prefer_not_to_say',
    heightCm: settings.profile.height_cm ?? 170,
    locale: settings.profile.locale,
    unitSystem: settings.profile.unit_system,
    goalType: (settings.goal?.goal_type ?? 'maintenance') as AccountSettingsUpdate['goalType'],
    customGoal: settings.goal?.custom_goal ?? undefined,
    targetWeightKg: settings.goal?.target_weight_kg ?? settings.goal?.start_weight_kg ?? 70,
    dietaryPattern: settings.dietary?.dietary_pattern ?? 'omnivore',
    favoriteFoods: settings.dietary?.favorite_foods ?? [],
    allergies: settings.dietary?.allergies ?? [],
    availableEquipment: settings.dietary?.available_equipment ?? [],
    workSchedule: settings.dietary?.work_schedule ?? '',
    cuisineRegion: settings.dietary?.cuisine_region ?? 'international',
    schedule: settings.schedule.map((item) => ({
      weekday: item.weekday,
      activityType: item.activity_type as AccountSettingsUpdate['schedule'][number]['activityType'],
      localStartTime: (item.local_start_time ?? '18:00').slice(0, 5),
      durationMinutes: item.duration_minutes ?? 60,
    })),
  }
}

export function AccountSettingsPage({ locale, preview }: { locale: AppLocale; preview: boolean }) {
  const fa = locale === 'fa'
  const online = useOnlineStatus()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['account-settings'], queryFn: loadAccountSettings, enabled: !preview })
  const settings = preview ? previewSettings : query.data
  const [form, setForm] = useState<AccountSettingsUpdate | null>(preview ? initialForm(previewSettings) : null)
  const [favoriteFoods, setFavoriteFoods] = useState<string | null>(preview ? listText(previewSettings.dietary?.favorite_foods ?? []) : null)
  const [allergies, setAllergies] = useState<string | null>(preview ? '' : null)
  const [equipment, setEquipment] = useState<string | null>(preview ? listText(previewSettings.dietary?.available_equipment ?? []) : null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false)
  const [withdrawn, setWithdrawn] = useState(false)

  if (!settings) {
    return <main className="app-page account-settings-page"><p>{query.isError ? (fa ? 'تنظیمات دریافت نشد.' : 'Settings could not be loaded.') : (fa ? 'در حال دریافت تنظیمات…' : 'Loading settings…')}</p></main>
  }
  const activeForm = form ?? initialForm(settings)
  const favoriteFoodsValue = favoriteFoods ?? listText(settings.dietary?.favorite_foods ?? [])
  const allergiesValue = allergies ?? listText(settings.dietary?.allergies ?? [])
  const equipmentValue = equipment ?? listText(settings.dietary?.available_equipment ?? [])

  function update<K extends keyof AccountSettingsUpdate>(key: K, value: AccountSettingsUpdate[K]) {
    setForm((current) => ({ ...(current ?? activeForm), [key]: value }))
  }

  function toggleDay(weekday: number) {
    const existing = activeForm.schedule.find((item) => item.weekday === weekday)
    update('schedule', existing
      ? activeForm.schedule.filter((item) => item.weekday !== weekday)
      : [...activeForm.schedule, { weekday, activityType: 'strength' as const, localStartTime: '18:00', durationMinutes: 60 }].sort((a, b) => a.weekday - b.weekday))
  }

  function updateDay(weekday: number, patch: Partial<AccountSettingsUpdate['schedule'][number]>) {
    update('schedule', activeForm.schedule.map((item) => item.weekday === weekday ? { ...item, ...patch } : item))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const parsed = accountSettingsUpdateSchema.safeParse({ ...activeForm, favoriteFoods: parseList(favoriteFoodsValue), allergies: parseList(allergiesValue), availableEquipment: parseList(equipmentValue) })
    if (!parsed.success) {
      setError(fa ? 'فیلدها را بررسی کن؛ مقدار نامعتبر یا تکراری وجود دارد.' : 'Check the fields; one or more values are invalid or duplicated.')
      return
    }
    setSaving(true); setError(''); setNotice('')
    try {
      const result = preview ? { updated: true as const, plan_review_required: true, changed_sections: ['preview'] } : await updateAccountSettings(parsed.data)
      setForm(parsed.data)
      setNotice(result.plan_review_required
        ? (fa ? 'تنظیمات ذخیره شد. برنامه فعلی برای بازبینی علامت خورد تا تغییرها بدون بررسی وارد برنامه نشوند.' : 'Settings saved. Your current plan was marked for review so changes are not applied without validation.')
        : (fa ? 'تنظیمات ذخیره شد.' : 'Settings saved.'))
      if (!preview) await Promise.all([queryClient.invalidateQueries({ queryKey: ['account-settings'] }), queryClient.invalidateQueries({ queryKey: ['active-plan'] })])
    } catch {
      setError(fa ? 'تنظیمات ذخیره نشد. اتصال را بررسی و دوباره تلاش کن.' : 'Settings were not saved. Check your connection and try again.')
    } finally { setSaving(false) }
  }

  async function withdraw() {
    setSaving(true); setError('')
    try {
      if (!preview) await withdrawHealthConsent()
      setWithdrawn(true); setConfirmWithdrawal(false)
      setNotice(fa ? 'رضایت پردازش داده سلامت پس گرفته شد. شخصی‌سازی خودکار متوقف و برنامه برای بازبینی علامت خورد.' : 'Health-data consent was withdrawn. Automated personalization stopped and your plan was marked for review.')
      if (!preview) await queryClient.invalidateQueries({ queryKey: ['active-plan'] })
    } catch { setError(fa ? 'پس‌گرفتن رضایت انجام نشد.' : 'Consent could not be withdrawn.') }
    finally { setSaving(false) }
  }

  return (
    <main className="app-page account-settings-page screen-enter">
      <section className="page-heading"><div><p className="orbit-eyebrow"><Sparkles size={15} />{fa ? 'کنترل حساب' : 'Account controls'}</p><h1>{fa ? 'پروفایل و ترجیحات' : 'Profile and preferences'}</h1><p>{fa ? 'تغییرات اثرگذار روی برنامه قبل از استفاده دوباره بازبینی می‌شوند.' : 'Changes that affect plan content are marked for review before reuse.'}</p></div><Link className="orbit-button orbit-button--secondary" href={`${localizedPath(locale, '/app/me')}${preview ? '?preview=1' : ''}`}><ChevronLeft className="directional-icon" size={17} />{fa ? 'حساب من' : 'Back to Me'}</Link></section>
      <form className="account-settings-form" onSubmit={submit}>
        <ContentCard className="account-settings-section"><div className="section-title-row"><h2>{fa ? 'پروفایل' : 'Profile'}</h2><StatusPill tone="neutral"><LockKeyhole size={13} />{fa ? 'کشور و سن محافظت‌شده' : 'Country and age protected'}</StatusPill></div><div className="account-settings-grid"><Input label={fa ? 'نام نمایشی' : 'Display name'} maxLength={120} onChange={(e) => update('displayName', e.target.value)} required value={activeForm.displayName} /><Select label={fa ? 'جنسیت برای محاسبات' : 'Sex used for calculations'} onChange={(e) => update('sex', e.target.value as AccountSettingsUpdate['sex'])} value={activeForm.sex}><option value="female">{fa ? 'زن' : 'Female'}</option><option value="male">{fa ? 'مرد' : 'Male'}</option><option value="other">{fa ? 'سایر' : 'Other'}</option><option value="prefer_not_to_say">{fa ? 'ترجیح می‌دهم نگویم' : 'Prefer not to say'}</option></Select><Input inputMode="decimal" label={fa ? 'قد (سانتی‌متر)' : 'Height (cm)'} max={250} min={100} onChange={(e) => update('heightCm', Number(e.target.value))} required type="number" value={activeForm.heightCm} /><Select label={fa ? 'زبان برنامه‌های بعدی' : 'Language for future plans'} onChange={(e) => update('locale', e.target.value as AccountSettingsUpdate['locale'])} value={activeForm.locale}><option value="fa-IR">فارسی</option><option value="en-US">English</option></Select><Select label={fa ? 'واحد نمایش' : 'Display units'} onChange={(e) => update('unitSystem', e.target.value as AccountSettingsUpdate['unitSystem'])} value={activeForm.unitSystem}><option value="metric">{fa ? 'متریک' : 'Metric'}</option><option value="imperial">{fa ? 'امپریال' : 'Imperial'}</option></Select><Input disabled label={fa ? 'کشور محل استفاده (فقط خواندنی)' : 'Country of use (read only)'} value={settings.profile.country_code ? countryName(settings.profile.country_code, locale) : '—'} /></div><div className="protected-setting-note"><LockKeyhole size={18} /><p>{fa ? 'کشور، تاریخ تولد، eligibility و کشور صورتحساب AI از این صفحه قابل تغییر نیستند؛ این داده‌ها روی دسترسی، ایمنی یا پرداخت اثر دارند و فقط از مسیر تأییدشده تغییر می‌کنند.' : 'Country, date of birth, eligibility, and AI billing country cannot be changed here. They affect access, safety, or billing and require a verified workflow.'}</p></div></ContentCard>

        <ContentCard className="account-settings-section"><h2>{fa ? 'هدف' : 'Goal'}</h2><div className="account-settings-grid"><Select label={fa ? 'نوع هدف' : 'Goal type'} onChange={(e) => update('goalType', e.target.value as AccountSettingsUpdate['goalType'])} value={activeForm.goalType}><option value="fat_loss">{fa ? 'کاهش چربی' : 'Fat loss'}</option><option value="muscle_gain">{fa ? 'افزایش عضله' : 'Muscle gain'}</option><option value="maintenance">{fa ? 'حفظ وزن' : 'Maintenance'}</option><option value="performance">{fa ? 'عملکرد' : 'Performance'}</option><option value="custom">{fa ? 'هدف شخصی' : 'Custom'}</option></Select><Input inputMode="decimal" label={fa ? 'وزن هدف (کیلوگرم)' : 'Target weight (kg)'} max={350} min={35} onChange={(e) => update('targetWeightKg', Number(e.target.value))} required type="number" value={activeForm.targetWeightKg} />{activeForm.goalType === 'custom' ? <Textarea label={fa ? 'شرح هدف' : 'Describe your goal'} maxLength={1000} onChange={(e) => update('customGoal', e.target.value)} required value={activeForm.customGoal ?? ''} /> : null}</div></ContentCard>

        <ContentCard className="account-settings-section"><h2>{fa ? 'غذا و تجهیزات' : 'Food and equipment'}</h2><div className="account-settings-grid"><Select label={fa ? 'الگوی غذایی' : 'Dietary pattern'} onChange={(e) => update('dietaryPattern', e.target.value)} value={activeForm.dietaryPattern}><option value="omnivore">{fa ? 'همه‌چیزخوار' : 'Omnivore'}</option><option value="vegetarian">{fa ? 'گیاه‌خوار' : 'Vegetarian'}</option><option value="vegan">{fa ? 'وگان' : 'Vegan'}</option><option value="pescatarian">{fa ? 'پسکترین' : 'Pescatarian'}</option></Select><Select label={fa ? 'فرهنگ غذایی' : 'Cuisine preference'} onChange={(e) => update('cuisineRegion', e.target.value as AccountSettingsUpdate['cuisineRegion'])} value={activeForm.cuisineRegion}><option value="iran">{fa ? 'ایرانی' : 'Iranian'}</option><option value="middle_east">{fa ? 'خاورمیانه' : 'Middle Eastern'}</option><option value="international">{fa ? 'بین‌المللی' : 'International'}</option></Select><Textarea label={fa ? 'غذاهای مورد علاقه؛ با ویرگول جدا کن' : 'Favorite foods; separate with commas'} maxLength={4000} onChange={(e) => setFavoriteFoods(e.target.value)} value={favoriteFoodsValue} /><Textarea label={fa ? 'آلرژی‌ها و عدم تحمل‌ها؛ با ویرگول جدا کن' : 'Allergies and intolerances; separate with commas'} maxLength={4000} onChange={(e) => setAllergies(e.target.value)} value={allergiesValue} /><Textarea label={fa ? 'تجهیزات در دسترس؛ با ویرگول جدا کن' : 'Available equipment; separate with commas'} maxLength={4000} onChange={(e) => setEquipment(e.target.value)} value={equipmentValue} /><Textarea label={fa ? 'برنامه کاری و محدودیت‌ها' : 'Work schedule and constraints'} maxLength={1000} onChange={(e) => update('workSchedule', e.target.value)} value={activeForm.workSchedule} /></div></ContentCard>

        <ContentCard className="account-settings-section"><h2>{fa ? 'برنامه تمرین' : 'Training schedule'}</h2><div className="schedule-editor">{weekdays.map((day) => { const item = activeForm.schedule.find((entry) => entry.weekday === day.value); return <div className={item ? 'is-selected' : ''} key={day.value}><label><input checked={Boolean(item)} onChange={() => toggleDay(day.value)} type="checkbox" /><strong>{fa ? day.fa : day.en}</strong></label>{item ? <div><Select label={fa ? 'نوع' : 'Type'} onChange={(e) => updateDay(day.value, { activityType: e.target.value as typeof item.activityType })} value={item.activityType}><option value="strength">{fa ? 'قدرتی' : 'Strength'}</option><option value="crossfit">CrossFit</option><option value="full_body">{fa ? 'ترکیبی' : 'Full body'}</option><option value="cardio">{fa ? 'هوازی' : 'Cardio'}</option><option value="walk">{fa ? 'پیاده‌روی' : 'Walk'}</option><option value="mobility">{fa ? 'موبیلیتی' : 'Mobility'}</option><option value="other">{fa ? 'سایر' : 'Other'}</option></Select><Input label={fa ? 'شروع' : 'Start'} onChange={(e) => updateDay(day.value, { localStartTime: e.target.value })} type="time" value={item.localStartTime} /><Input label={fa ? 'دقیقه' : 'Minutes'} max={300} min={10} onChange={(e) => updateDay(day.value, { durationMinutes: Number(e.target.value) })} type="number" value={item.durationMinutes} /></div> : null}</div> })}</div></ContentCard>

        {notice ? <div className="inline-notice inline-notice--success" role="status"><Check size={18} />{notice}</div> : null}
        {error ? <div className="inline-notice inline-notice--error" role="alert"><AlertTriangle size={18} />{error}</div> : null}
        <Button disabled={!preview && !online} loading={saving} type="submit"><Save size={18} />{fa ? 'ذخیره تنظیمات' : 'Save settings'}</Button>

        <ContentCard className="account-settings-section account-settings-consent"><div><ShieldOff size={22} /><span><h2>{fa ? 'رضایت پردازش داده سلامت' : 'Health-data processing consent'}</h2><p>{withdrawn || !settings.profile.health_data_consent_at ? (fa ? 'رضایت فعال نیست و شخصی‌سازی خودکار متوقف است.' : 'Consent is not active and automated personalization is stopped.') : (fa ? `نسخه فعال: ${settings.profile.health_consent_version}` : `Active version: ${settings.profile.health_consent_version}`)}</p></span></div>{confirmWithdrawal ? <div className="consent-withdraw-confirm"><p>{fa ? 'با پس‌گرفتن رضایت، شخصی‌سازی خودکار متوقف می‌شود. داده‌های موجود طبق سیاست نگهداری باقی می‌مانند و از صفحه داده‌ها می‌توانی خروجی بگیری یا حساب را حذف کنی.' : 'Withdrawing consent stops automated personalization. Existing data follows the retention policy; you can export or delete your account from Data controls.'}</p><Button disabled={withdrawn || (!preview && !online)} loading={saving} onClick={() => void withdraw()} type="button" variant="danger">{fa ? 'تأیید پس‌گرفتن رضایت' : 'Confirm withdrawal'}</Button><Button onClick={() => setConfirmWithdrawal(false)} type="button" variant="ghost">{fa ? 'انصراف' : 'Cancel'}</Button></div> : <Button disabled={withdrawn || !settings.profile.health_data_consent_at} onClick={() => setConfirmWithdrawal(true)} type="button" variant="danger">{fa ? 'پس‌گرفتن رضایت' : 'Withdraw consent'}</Button>}</ContentCard>
      </form>
    </main>
  )
}
