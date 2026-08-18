import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { AlertTriangle, Check, RefreshCw, WifiOff } from 'lucide-react'
import { LocalizedStory } from '../../../.storybook/LocalizedStory'
import type { AppLocale } from '../../platform/i18n/catalog'
import { Button, ContentCard, PageSkeleton, StatusPill } from '../../v2/ui/primitives'
import '../app/app-stories.css'
import './system-states.css'

function localeFromGlobal(value: unknown): AppLocale { return value === 'en' ? 'en' : 'fa' }
function Stage({ locale, children }: { locale: AppLocale; children: ReactNode }) { return <LocalizedStory locale={locale}><main className="mo-app-story mo-system-state">{children}</main></LocalizedStory> }

const meta = { title: 'Patterns/System states', parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'Canonical loading, offline, recoverable error, and success feedback. Actions are explicit and user data is never implied to be lost.' } } } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const Loading: Story = { render: () => <PageSkeleton /> }
export const Offline: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Stage locale={locale}><ContentCard><span className="mo-system-state__icon"><WifiOff /></span><StatusPill tone="neutral">{locale === 'fa' ? 'آفلاین' : 'Offline'}</StatusPill><h1>{locale === 'fa' ? 'اتصال به سرور برقرار نیست' : 'The server is unreachable'}</h1><p>{locale === 'fa' ? 'صفحه‌های ذخیره‌شده در دسترس‌اند، اما ثبت اطلاعات و ساخت برنامه تا اتصال دوباره متوقف است.' : 'Cached screens remain available, but saving and plan generation pause until you reconnect.'}</p><Button disabled><RefreshCw size={17} />{locale === 'fa' ? 'در انتظار اتصال' : 'Waiting for connection'}</Button></ContentCard></Stage> } }
export const RecoverableError: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Stage locale={locale}><ContentCard><span className="mo-system-state__icon mo-system-state__icon--warning"><AlertTriangle /></span><h1>{locale === 'fa' ? 'اطلاعات دریافت نشد' : 'Information could not be loaded'}</h1><p>{locale === 'fa' ? 'داده‌های حسابت حذف نشده‌اند. اتصال را بررسی کن و دوباره تلاش کن.' : 'Your account data is safe. Check your connection and try again.'}</p><Button><RefreshCw size={17} />{locale === 'fa' ? 'تلاش دوباره' : 'Try again'}</Button></ContentCard></Stage> } }
export const Saved: Story = { render: (_, c) => { const locale = localeFromGlobal(c.globals.locale); return <Stage locale={locale}><ContentCard><span className="mo-system-state__icon mo-system-state__icon--success"><Check /></span><h1>{locale === 'fa' ? 'تغییرها ذخیره شدند' : 'Changes saved'}</h1><p>{locale === 'fa' ? 'تغییرهای مؤثر بر دوره بعد پیش از درخواست ماهانه بازبینی می‌شوند.' : 'Changes that affect the next period are reviewed before its monthly request.'}</p></ContentCard></Stage> } }
