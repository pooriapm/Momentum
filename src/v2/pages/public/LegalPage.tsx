import { FileText, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FALLBACK_LEGAL_DOCUMENT_VERSIONS, loadLegalDocumentVersions } from '../../../config/legal'
import type { AppLocale } from '../../../platform/i18n/catalog'
import { PublicFooter, PublicHeader } from '../../components/PublicChrome'
import { ContentCard, Eyebrow } from '../../ui/primitives'
import { Reveal } from '../../ui/Reveal'

export function LegalPage({ locale, kind }: { locale: AppLocale; kind: 'privacy' | 'terms' }) {
  const privacy = kind === 'privacy'
  const fa = locale === 'fa'
  const [legalVersions, setLegalVersions] = useState(FALLBACK_LEGAL_DOCUMENT_VERSIONS)
  const version = privacy ? legalVersions.privacy : legalVersions.terms
  useEffect(() => {
    void loadLegalDocumentVersions().then(setLegalVersions)
  }, [])
  const sections = privacy
    ? [
        [fa ? 'چه داده‌ای نگهداری می‌شود؟' : 'What data is stored?', fa ? 'حساب، پروفایل و رضایت‌ها، هدف و ترجیحات، برنامه‌ها و ثبت‌های روزانه و در صورت انتخاب شما گزارش خصوصی ترکیب بدنی.' : 'Account, profile and consent records, goals and preferences, plans and daily logs, and—only if you choose—private body-composition reports.'],
        [fa ? 'چرا پردازش می‌شود؟' : 'Why is it processed?', fa ? 'برای احراز هویت، تولید و نمایش برنامه ماهانه، پیگیری، ایمنی و کنترل اشتراک. Momentum داده سلامت را برای تبلیغات هدفمند نمی‌فروشد یا استفاده نمی‌کند.' : 'To authenticate you, generate and display the monthly plan, track progress, enforce safety, and verify subscription access. Momentum does not sell or use health data for targeted advertising.'],
        [fa ? 'پردازش AI' : 'AI processing', fa ? 'فقط زمینه لازم از سمت سرور به سرویس‌دهنده AI ارسال می‌شود؛ ایمیل و نام از پرامپت برنامه حذف می‌شوند. سیاست نگهداری سرویس‌دهنده می‌تواند شامل پایش سوءاستفاده تا ۳۰ روز باشد مگر قرارداد دیگری فعال شده باشد.' : 'Only necessary context is sent server-side to the AI provider; email and name are excluded from plan prompts. Provider retention may include abuse monitoring for up to 30 days unless a different approved control is enabled.'],
        [fa ? 'کنترل شما' : 'Your controls', fa ? 'می‌توانید اطلاعات را اصلاح کنید، گزارش اختیاری را حذف کنید و درخواست خروجی یا حذف حساب بدهید. جزئیات نگهداری backup پیش از عرضه عمومی نهایی و اعلام می‌شود.' : 'You can correct information, remove optional reports, and request an export or account deletion. Backup-retention details will be finalized and disclosed before public launch.'],
      ]
    : [
        [fa ? 'دامنه محصول' : 'Product scope', fa ? 'Momentum یک محصول سلامت عمومی برای بزرگسالان است و تشخیص، درمان یا توصیه پزشکی ارائه نمی‌کند. برای تصمیم مهم سلامت با متخصص واجد شرایط مشورت کنید.' : 'Momentum is an adult general-wellness product. It does not diagnose, treat, or provide medical advice. Consult a qualified professional for important health decisions.'],
        [fa ? 'شرایط استفاده' : 'Eligibility', fa ? 'استفاده از برنامه‌ریزی خودکار فقط برای افراد ۱۸ سال یا بیشتر و پس از غربالگری ایمنی امکان‌پذیر است.' : 'Automated planning is limited to people aged 18 or older who pass safety screening.'],
        [fa ? 'خروجی AI' : 'AI output', fa ? 'پاسخ و برنامه AI ممکن است ناقص یا اشتباه باشد. خروجی قبل از ذخیره اعتبارسنجی ساختاری می‌شود، اما تضمین نتیجه یا دقت پزشکی وجود ندارد.' : 'AI plans and replies can be incomplete or wrong. Output is structurally validated before storage, but results and medical accuracy are not guaranteed.'],
        [fa ? 'آلفا و پرداخت' : 'Alpha and payments', fa ? 'این نسخه آلفا است. قیمت‌ها فرضیه محصول‌اند و پرداخت فعال نیست. شرایط اشتراک، لغو و بازپرداخت پیش از فعال‌شدن پرداخت جداگانه ارائه می‌شود.' : 'This is an alpha release. Prices are product hypotheses and payments are disabled. Subscription, cancellation, and refund terms will be presented before checkout is enabled.'],
      ]

  return (
    <div className="public-page">
      <PublicHeader locale={locale} />
      <main className="simple-public-page legal-page">
        <Reveal className="simple-public-page__heading">
          <Eyebrow>{privacy ? <LockKeyhole size={15} /> : <FileText size={15} />}{fa ? 'نسخه آلفا' : 'Alpha notice'}</Eyebrow>
          <h1>{privacy ? (fa ? 'اطلاعیه حریم خصوصی' : 'Privacy notice') : (fa ? 'شرایط استفاده' : 'Terms of use')}</h1>
          <p>{fa ? `نسخه ${version} · پیش‌نویس محصول؛ پیش از عرضه عمومی نیازمند بررسی حقوقی است.` : `Version ${version} · Product draft; legal review is required before public launch.`}</p>
        </Reveal>
        <div className="legal-sections">
          {sections.map(([title, copy]) => <ContentCard key={title}><ShieldCheck size={21} /><div><h2>{title}</h2><p>{copy}</p></div></ContentCard>)}
        </div>
      </main>
      <PublicFooter locale={locale} />
    </div>
  )
}
