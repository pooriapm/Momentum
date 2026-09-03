import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { AlertOctagon, AlertTriangle, BadgeCheck, CircleHelp, Check, ChevronLeft, Clock3, Dumbbell, FileCheck2, FileUp, Gift, Globe2, HeartPulse, Home, LoaderCircle, LockKeyhole, RefreshCw, Salad, Save, ShieldCheck, Sparkles, WalletCards, WandSparkles, WifiOff } from "lucide-react";
import { momentumEvidence, momentumSupportingVariant } from "./coverage";
import { CountryCombobox } from "../../v2/ui/CountryCombobox";
import { localeFromStory, ProductFrame, PublicFrame, SpecBadge, SpecButton, SpecCallout, SpecCard, SpecChips, SpecConsentOption, SpecField, SpecHeader, SpecList, SpecOverlay, SpecProgress, SpecSelect, SpecTable, SpecTabs, Timeline, tx, type SpecLocale } from "./ProductSpec";

type PricingState = "available" | "exhausted" | "region" | "loading";
type OnboardingState = "entry" | "resume" | "basics-validation" | "consent-required" | "plan-source" | "health-caution" | "food-allergy" | "training-home" | "training-gym" | "training-custom" | "body-manual" | "body-upload-review" | "review-gift" | "review-subscription" | "saved-offline" | "save-error" | "generation-handoff";

function CountryOfUseField({ defaultOpen = false, locale }: { defaultOpen?: boolean; locale: SpecLocale }) {
  const [country, setCountry] = useState(locale === "fa" ? "IR" : "DE");
  return <CountryCombobox defaultOpen={defaultOpen} label={tx(locale, "کشور محل استفاده", "Country of use")} locale={locale} onChange={setCountry} value={country} />;
}

function LandingSpec({ locale }: { locale: SpecLocale }) {
  return (
    <PublicFrame locale={locale}>
      <section className="mo-spec__hero">
        <div>
          <SpecBadge tone="energy">{tx(locale, "برنامه شخصی ۳۰روزه", "A personal 30-day plan")}</SpecBadge>
          <h1>{tx(locale, "قدرتی که با زندگی واقعی هماهنگ است", "Strength that fits real life")}</h1>
          <p>{tx(locale, "Momentum یک برنامه کامل تمرین و تغذیه می‌سازد، آن را برای ساختار و ایمنی بررسی می‌کند و در حساب تو قرار می‌دهد—فقط یک بار در هر دوره.", "Momentum creates one complete workout and nutrition plan, validates its structure and safety, and imports it into your account—once per period.")}</p>
          <div className="mo-spec__actions">
            <SpecButton>{tx(locale, "ساخت حساب", "Create account")}</SpecButton>
            <SpecButton kind="secondary">{tx(locale, "روش کار را ببین", "See how it works")}</SpecButton>
          </div>
        </div>
        <div className="mo-spec__hero-visual">
          <SpecCard tone="brand">
            <SpecBadge tone="success">{tx(locale, "امروز", "Today")}</SpecBadge>
            <h2>{tx(locale, "قدرت تمام‌بدن", "Full-body strength")}</h2>
            <p>{tx(locale, "۶ حرکت · ۴۵ دقیقه · خانه", "6 exercises · 45 min · home")}</p>
            <SpecProgress label={tx(locale, "پیشرفت هفته", "Weekly progress")} value={75} />
            <SpecCallout icon={<Salad />} title={tx(locale, "وعده بعدی: ناهار", "Next meal: Lunch")} tone="energy">
              {tx(locale, "مرغ گریل، برنج قهوه‌ای و سالاد", "Grilled chicken, brown rice, and salad")}
            </SpecCallout>
          </SpecCard>
        </div>
      </section>
      <section className="mo-spec__grid" id="features">
        <SpecCard>
          <Dumbbell />
          <h2>{tx(locale, "تمرین قابل اجرا", "Practical training")}</h2>
          <p>{tx(locale, "بر اساس زمان، محل و تجهیزاتی که واقعاً داری.", "Based on the time, place, and equipment you actually have.")}</p>
        </SpecCard>
        <SpecCard>
          <Salad />
          <h2>{tx(locale, "تغذیه قابل خرید", "Shoppable nutrition")}</h2>
          <p>{tx(locale, "با بودجه، سلیقه و محدودیت‌های غذایی تو.", "Aligned with your budget, preferences, and food constraints.")}</p>
        </SpecCard>
        <SpecCard>
          <ShieldCheck />
          <h2>{tx(locale, "مرزهای روشن ایمنی", "Clear safety boundaries")}</h2>
          <p>{tx(locale, "این سرویس مراقبت پزشکی یا تشخیص نیست.", "This service is not medical care or diagnosis.")}</p>
        </SpecCard>
      </section>
    </PublicFrame>
  );
}

function PricingSpec({ locale, state }: { locale: SpecLocale; state: PricingState }) {
  const available = state === "available";
  return (
    <PublicFrame locale={locale}>
      <SpecHeader body={tx(locale, "یک عضویت Momentum، یک درخواست ترکیبی تمرین و تغذیه برای هر برنامه کامل ۳۰روزه.", "One Momentum membership, with one combined workout and nutrition request per complete 30-day plan.")} eyebrow={tx(locale, "عضویت شفاف", "Clear membership")} title={tx(locale, "برنامه‌ای برای یک دوره کامل", "One plan for the full period")} />
      <div className="mo-spec__grid">
        <SpecCard className="is-wide" tone="brand">
          <SpecBadge tone="brand">{tx(locale, "عضویت Momentum", "Momentum membership")}</SpecBadge>
          <h2>{tx(locale, "ماهانه", "Monthly")}</h2>
          <p>{tx(locale, "یک برنامه کامل برای کل دوره", "One complete plan for the full period")}</p>
          <SpecList
            rows={[
              {
                icon: <Check />,
                tone: "success",
                label: tx(locale, "یک برنامه کامل ۳۰روزه", "One complete 30-day plan"),
                detail: tx(locale, "تمرین، تغذیه و فهرست خرید", "Workout, nutrition, and grocery list"),
              },
              {
                icon: <Check />,
                tone: "success",
                label: tx(locale, "شروع دوره پس از آماده‌شدن", "Period starts when the plan is ready"),
                detail: tx(locale, "۳۰ روز از زمان آماده‌شدن", "30 days from when the plan is ready"),
              },
              {
                icon: <Check />,
                tone: "success",
                label: tx(locale, "تاریخچه قابل مشاهده", "Visible plan history"),
                detail: tx(locale, "برنامه‌های قبلی فقط‌خواندنی می‌مانند", "Past plans remain read-only"),
              },
            ]}
          />
          <SpecButton>{tx(locale, "شروع عضویت", "Start membership")}</SpecButton>
        </SpecCard>
        <SpecCard tone={available ? "energy" : undefined}>
          <span className={`mo-spec__state-icon mo-spec__state-icon--${available ? "energy" : state === "region" ? "neutral" : "warning"}`}>{state === "loading" ? <LoaderCircle className="orbit-spin" /> : <Gift />}</span>
          <h2>{state === "loading" ? tx(locale, "در حال بررسی هدیه…", "Checking the gift…") : available || state === "region" ? tx(locale, "هدیه برنامه اول", "First-plan gift") : tx(locale, "هدیه الان در دسترس نیست", "The gift is not available now")}</h2>
          <p>{state === "loading" ? tx(locale, "اگر هدیه در دسترس باشد همین‌جا نشان داده می‌شود.", "If the gift is available, it appears here.") : state === "region" || available ? tx(locale, "اگر در دسترس باشد، برنامه اول را بدون هزینه و بدون کارت شروع می‌کنی.", "When available, you start the first plan at no charge and with no card.") : tx(locale, "برای ساخت برنامه، عضویت فعال لازم است.", "An active membership is required to create a plan.")}</p>
          {state === "loading" ? <SpecButton disabled>{tx(locale, "در حال بررسی", "Checking")}</SpecButton> : available || state === "region" ? <SpecButton>{tx(locale, "استفاده از هدیه", "Use gift")}</SpecButton> : <SpecButton kind="secondary">{tx(locale, "دیدن عضویت", "View membership")}</SpecButton>}
        </SpecCard>
      </div>
    </PublicFrame>
  );
}

type PublicState = "menu" | "region-checking" | "region-unavailable" | "faq" | "pricing-error" | "safety" | "privacy" | "terms";

function PublicStateScreen({ locale, state }: { locale: SpecLocale; state: PublicState }) {
  if (state === "menu")
    return (
      <PublicFrame locale={locale}>
        <SpecHeader eyebrow={tx(locale, "منوی اصلی", "Main menu")} title={tx(locale, "به کجا می‌خواهی بروی؟", "Where would you like to go?")} />
        <SpecCard className="mo-spec__menu-panel">
          <SpecList
            rows={[
              {
                icon: <Sparkles />,
                label: tx(locale, "Momentum چطور کار می‌کند", "How Momentum works"),
                value: "›",
              },
              {
                icon: <WalletCards />,
                label: tx(locale, "عضویت", "Membership"),
                value: "›",
              },
              {
                icon: <ShieldCheck />,
                label: tx(locale, "ایمنی", "Safety"),
                value: "›",
              },
              {
                icon: <LockKeyhole />,
                label: tx(locale, "حریم خصوصی", "Privacy"),
                value: "›",
              },
            ]}
          />
          <div className="mo-spec__actions">
            <SpecButton>{tx(locale, "ساخت حساب", "Create account")}</SpecButton>
            <SpecButton kind="secondary">{tx(locale, "بستن منو", "Close menu")}</SpecButton>
          </div>
        </SpecCard>
      </PublicFrame>
    );
  if (state === "faq")
    return (
      <PublicFrame locale={locale}>
        <SpecHeader eyebrow={tx(locale, "پرسش‌های متداول", "Frequently asked questions")} title={tx(locale, "پیش از شروع بدان", "Know before you begin")} />
        <SpecCard>
          <SpecCallout icon={<CircleHelp />} title={tx(locale, "آیا هر زمان بخواهم می‌توانم برنامه تازه بسازم؟", "Can I generate a new plan whenever I want?")} tone="brand">
            {tx(locale, "خیر. در هر دوره فقط یک درخواست، برنامه کامل تمرین و تغذیه را می‌سازد. دوره بعد از زمان آماده‌شدن برنامه شروع می‌شود.", "No. Each period has one request for the complete workout and nutrition plan. The period starts when that plan is ready.")}
          </SpecCallout>
          <SpecList
            rows={[
              {
                label: tx(locale, "آیا Momentum مربی یا پزشک من است؟", "Is Momentum my coach or clinician?"),
                value: "+",
              },
              {
                label: tx(locale, "هدیه برنامه اول همیشه فعال است؟", "Is the first-plan gift always available?"),
                value: "+",
              },
              {
                label: tx(locale, "می‌توانم داده‌هایم را حذف کنم؟", "Can I delete my data?"),
                value: "+",
              },
            ]}
          />
        </SpecCard>
      </PublicFrame>
    );
  if (state === "safety" || state === "privacy" || state === "terms") {
    const data = {
      safety: {
        icon: <ShieldCheck />,
        title: tx(locale, "ایمنی و محدوده سرویس", "Safety & service boundary"),
        body: tx(locale, "Momentum برای سلامت عمومی است؛ تشخیص، درمان یا مراقبت پزشکی ارائه نمی‌کند.", "Momentum supports general wellness; it does not diagnose, treat, or provide medical care."),
        rows: [tx(locale, "با علائم شدید یا ناگهانی تمرین را متوقف کن", "Stop with severe or sudden symptoms"), tx(locale, "در خطر فوری با خدمات اضطراری محلی تماس بگیر", "Contact local emergency services for immediate danger"), tx(locale, "محدودیت‌های سلامتی می‌توانند ساخت خودکار برنامه را متوقف کنند", "Health limitations can block automatic planning")],
      },
      privacy: {
        icon: <LockKeyhole />,
        title: tx(locale, "حریم خصوصی", "Privacy"),
        body: tx(locale, "فقط داده لازم برای حساب، برنامه و ایمنی پردازش می‌شود.", "Only data required for your account, plan, and safety is processed."),
        rows: [tx(locale, "اطلاعات لازم برای ساخت برنامه ترکیبی", "Information required for combined plan generation"), tx(locale, "مرز پردازش ارائه‌دهنده خارجی", "External provider processing boundary"), tx(locale, "نگه‌داری، دریافت و حذف داده‌ها", "Retention, export, and deletion")],
      },
      terms: {
        icon: <FileCheck2 />,
        title: tx(locale, "شرایط استفاده", "Terms of use"),
        body: tx(locale, "نسخه ۱٫۰ · لازم‌الاجرا از ۲۳ مرداد ۱۴۰۵", "Version 1.0 · effective August 14, 2026"),
        rows: [tx(locale, "یک اشتراک و یک درخواست در هر دوره", "One membership and one request per period"), tx(locale, "هدیه برنامه اول مشروط به بودجه است", "The first-plan gift depends on budget availability"), tx(locale, "مسئولیت تصمیم‌های درمانی بر عهده سرویس نیست", "The service does not make treatment decisions")],
      },
    }[state];
    return (
      <PublicFrame locale={locale}>
        <SpecHeader eyebrow={tx(locale, "اسناد Momentum", "Momentum documents")} title={data.title} body={data.body} />
        <SpecCard>
          <span className={`mo-spec__state-icon mo-spec__state-icon--${state === "safety" ? "danger" : "brand"}`}>{data.icon}</span>
          <SpecList
            rows={data.rows.map((label) => ({
              icon: <Check />,
              tone: "success",
              label,
            }))}
          />
          <div className="mo-spec__actions">
            <SpecButton kind="secondary">{tx(locale, "بازگشت", "Back")}</SpecButton>
          </div>
        </SpecCard>
      </PublicFrame>
    );
  }
  const region = state === "region-unavailable";
  const pricingError = state === "pricing-error";
  return (
    <PublicFrame locale={locale}>
      <SpecHeader eyebrow={region ? tx(locale, "مسیر پرداخت ایران", "Iran payment route") : pricingError ? tx(locale, "قیمت", "Pricing") : tx(locale, "پیشنهاد اولیه", "Initial suggestion")} title={region ? tx(locale, "درگاه ایرانی با قیمت تومانی", "Iranian gateway with toman prices") : pricingError ? tx(locale, "قیمت معتبر دریافت نشد", "Authoritative pricing is unavailable") : tx(locale, "در حال پیشنهاد زبان و پرداخت…", "Suggesting language and payment route…")} body={region ? tx(locale, "حساب، هدیه و ساخت برنامه بدون محدودیت منطقه‌ای در دسترس‌اند. زبان مستقل است و هر زمان قابل تغییر است.", "Account access, the gift, and plan generation are not region-gated. Language is independent and always editable.") : pricingError ? tx(locale, "تا دریافت قیمت معتبر، ارز یا مبلغ حدس نمی‌زنیم و پرداخت را شروع نمی‌کنیم.", "We do not guess currency or amount, and checkout cannot start until trusted pricing loads.") : tx(locale, "IP فقط زبان اولیه و مسیر پرداخت را پیشنهاد می‌کند. محدودیت منطقه‌ای اعمال نمی‌شود.", "IP only suggests the initial language and payment route. It never limits access.")} />
      <SpecCard className="mo-spec__state-card">
        <span className={`mo-spec__state-icon mo-spec__state-icon--${region ? "brand" : pricingError ? "danger" : "info"}`}>{region ? <Globe2 /> : pricingError ? <AlertTriangle /> : <LoaderCircle className="orbit-spin" />}</span>
        <div className="mo-spec__actions">
          {pricingError ? (
            <SpecButton>
              <RefreshCw />
              {tx(locale, "تلاش دوباره", "Try again")}
            </SpecButton>
          ) : region ? (
            <SpecButton>{tx(locale, "ساخت حساب", "Create account")}</SpecButton>
          ) : (
            <SpecButton disabled>{tx(locale, "در حال بررسی", "Checking")}</SpecButton>
          )}
        </div>
      </SpecCard>
    </PublicFrame>
  );
}

function setupStep(state: string): number {
  if (state === "entry" || state === "resume" || state === "loading") return 0;
  if (state.startsWith("basics")) return 1;
  if (state.startsWith("health")) return 2;
  if (state.startsWith("consent")) return 3;
  if (state.startsWith("plan-source") || state === "plan-source") return 4;
  if (state.startsWith("goal")) return 5;
  if (state.startsWith("food")) return 6;
  if (state.startsWith("training")) return 7;
  if (state.startsWith("body")) return 8;
  return 9;
}

function allergenChips(locale: SpecLocale, selected: string[], blocked?: string) {
  return [
    { fa: "شیر", en: "Milk" },
    { fa: "تخم‌مرغ", en: "Egg" },
    { fa: "بادام‌زمینی", en: "Peanut" },
    { fa: "آجیل درختی", en: "Tree nut" },
    { fa: "گندم / گلوتن", en: "Wheat / gluten" },
    { fa: "سویا", en: "Soy" },
    { fa: "ماهی", en: "Fish" },
    { fa: "صدف", en: "Shellfish" },
    { fa: "کنجد", en: "Sesame" },
    { fa: "سایر", en: "Other" },
  ].map((item) => ({
    blocked: blocked === item.en,
    label: tx(locale, item.fa, item.en),
    selected: selected.includes(item.en),
  }));
}

function OnboardingFrame({ children, locale, step, title }: { children: ReactNode; locale: SpecLocale; step: number; title: string }) {
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, "راه‌اندازی", "Setup")}>
      <SpecHeader aside={step ? <SpecBadge tone="brand">{tx(locale, `مرحله ${step} از ۸`, `Step ${step} of 8`)}</SpecBadge> : undefined} eyebrow={tx(locale, "راه‌اندازی برنامه شخصی", "Personal plan setup")} title={title} />
      <div style={{ marginBlockEnd: "1.25rem" }}>
        <SpecProgress label={tx(locale, "پیشرفت راه‌اندازی", "Setup progress")} value={Math.min(100, Math.round((step / 8) * 100))} />
      </div>
      {children}
    </ProductFrame>
  );
}

function StepActions({ locale, final = false }: { locale: SpecLocale; final?: boolean }) {
  return (
    <div className="mo-spec__actions">
      <SpecButton kind="secondary">
        <ChevronLeft className="mo-spec__directional" />
        {tx(locale, "قبلی", "Back")}
      </SpecButton>
      <SpecButton>{tx(locale, final ? "تأیید و ادامه" : "ذخیره و ادامه", final ? "Confirm and continue" : "Save and continue")}</SpecButton>
      <span className="mo-spec__save">
        <Save />
        {tx(locale, "پیشرفت خودکار ذخیره می‌شود", "Progress is saved automatically")}
      </span>
    </div>
  );
}

function OnboardingScreen({ locale, state }: { locale: SpecLocale; state: OnboardingState }) {
  if (state === "entry" || state === "resume") return <EntryResume locale={locale} resume={state === "resume"} />;
  if (state === "generation-handoff") return <GenerationHandoff locale={locale} />;
  const titles: Record<Exclude<OnboardingState, "entry" | "resume" | "generation-handoff">, string> = {
    "basics-validation": tx(locale, "اطلاعات پایه", "Basic information"),
    "consent-required": tx(locale, "رضایت و حریم خصوصی", "Consent & privacy"),
    "plan-source": tx(locale, "روش ساخت برنامه", "How your plan is created"),
    "health-caution": tx(locale, "سلامت و محدودیت‌ها", "Health & limitations"),
    "food-allergy": tx(locale, "غذا و حساسیت‌ها", "Food & allergies"),
    "training-home": tx(locale, "تمرین در خانه", "Training at home"),
    "training-gym": tx(locale, "تمرین در باشگاه", "Training at the gym"),
    "training-custom": tx(locale, "زمان تمرین", "Workout duration"),
    "body-manual": tx(locale, "اطلاعات بدن", "Body information"),
    "body-upload-review": tx(locale, "بازبینی گزارش بدن", "Review body report"),
    "review-gift": tx(locale, "بازبینی و هدیه برنامه اول", "Review & first-plan gift"),
    "review-subscription": tx(locale, "بازبینی و عضویت", "Review & membership"),
    "saved-offline": tx(locale, "بازبینی نهایی · ذخیره آفلاین", "Final review · saved offline"),
    "save-error": tx(locale, "بازبینی نهایی · تعارض ذخیره", "Final review · save conflict"),
  };
  return (
    <OnboardingFrame locale={locale} step={setupStep(state)} title={titles[state]}>
      <OnboardingBody locale={locale} state={state} />
    </OnboardingFrame>
  );
}

function EntryResume({ locale, resume }: { locale: SpecLocale; resume: boolean }) {
  return (
    <OnboardingFrame locale={locale} step={0} title={resume ? tx(locale, "از همان‌جا ادامه بده", "Continue where you left off") : tx(locale, "برای زندگی واقعی برنامه بساز", "Build a plan for real life")}>
      <div className="mo-spec__grid">
        <SpecCard className="is-wide" tone="brand">
          <span className="mo-spec__state-icon mo-spec__state-icon--brand">{resume ? <RefreshCw /> : <Sparkles />}</span>
          <h2>{resume ? tx(locale, "۶ مرحله از ۸ مرحله ذخیره شده", "6 of 8 steps saved") : tx(locale, "حدود ۸ تا ۱۲ دقیقه", "About 8–12 minutes")}</h2>
          <p>{resume ? tx(locale, "آخرین تغییر: امروز، ۱۲:۴۰ · مرحله تمرین", "Last updated today at 12:40 · Training step") : tx(locale, "هدف، سلامت، غذا، زمان تمرین و امکاناتت را می‌پرسیم. می‌توانی هر زمان توقف کنی و بعداً ادامه بدهی.", "We ask about goals, health, food, schedule, and equipment. You can stop and resume later.")}</p>
          <SpecButton>{resume ? tx(locale, "ادامه راه‌اندازی", "Continue setup") : tx(locale, "شروع راه‌اندازی", "Start setup")}</SpecButton>
        </SpecCard>
        <SpecCard>
          <h2>{tx(locale, "پیش از شروع", "Before you begin")}</h2>
          <SpecList
            rows={[
              {
                icon: <LockKeyhole />,
                label: tx(locale, "اطلاعات خصوصی می‌ماند", "Your information stays private"),
              },
              {
                icon: <ShieldCheck />,
                label: tx(locale, "این سرویس تشخیص پزشکی نیست", "This is not medical diagnosis"),
              },
              {
                icon: <Save />,
                label: tx(locale, "هر مرحله ذخیره می‌شود", "Each step is saved"),
              },
            ]}
          />
        </SpecCard>
      </div>
    </OnboardingFrame>
  );
}

function OnboardingBody({ locale, state }: { locale: SpecLocale; state: Exclude<OnboardingState, "entry" | "resume" | "generation-handoff"> }) {
  if (state === "basics-validation")
    return (
      <SpecCard>
        <div className="mo-spec__form-grid">
          <SpecField label={tx(locale, "نام", "First name")} value={tx(locale, "سارا", "Sara")} />
          <SpecField error={tx(locale, "تاریخ معتبر وارد کن؛ کاربر باید حداقل ۱۸ سال داشته باشد.", "Enter a valid date; the user must be at least 18.")} label={tx(locale, "تاریخ تولد", "Date of birth")} value={locale === "fa" ? "۱۴۰۱/۰۲/۲۸" : "May 18, 2012"} />
          <CountryOfUseField locale={locale} />
          <SpecSelect label={tx(locale, "جنس ثبت‌شده برای محاسبات", "Sex used for calculations")} options={[tx(locale, "زن", "Female"), tx(locale, "مرد", "Male"), tx(locale, "ترجیح می‌دهم نگویم", "Prefer not to say")]} value={tx(locale, "زن", "Female")} />
        </div>
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "consent-required")
    return (
      <SpecCard>
        <SpecCallout icon={<LockKeyhole />} title={tx(locale, "هر رضایت مستقل و نسخه‌دار است", "Each consent is independent and versioned")} tone="info">
          {tx(locale, "انتخاب سیاست حریم خصوصی حفظ شده است؛ شرایط استفاده و پردازش داده سلامت باید جداگانه تأیید شوند.", "Your Privacy selection is preserved; Terms and health-data processing must each be confirmed separately.")}
        </SpecCallout>
        <div className="mo-spec__consent-stack">
          <SpecConsentOption checked={false} description={tx(locale, "متن کامل پیش از انتخاب باز می‌شود.", "Open the full document before choosing.")} error={tx(locale, "برای ادامه شرایط استفاده را تأیید کن.", "Accept the Terms to continue.")} label={tx(locale, "شرایط استفاده", "Terms of Use")} version="v1.0 · 2026-08-14" />
          <SpecConsentOption checked description={tx(locale, "این انتخاب قبلی حفظ شده است.", "Your previous choice is preserved.")} label={tx(locale, "سیاست حریم خصوصی", "Privacy Policy")} version="v1.0 · 2026-08-14" />
          <SpecConsentOption checked={false} description={tx(locale, "برای ساخت برنامه لازم است و هر زمان از حساب قابل پس‌گرفتن است.", "Required for plan creation and withdrawable from your account.")} error={tx(locale, "رضایت پردازش داده سلامت لازم است.", "Health-data consent is required.")} label={tx(locale, "پردازش داده‌های سلامت", "Health-data processing")} version="v1.0 · 2026-08-14" />
        </div>
        <SpecCallout icon={<AlertTriangle />} title={tx(locale, "دو انتخاب ضروری باقی مانده", "Two required choices remain")} tone="warning" />
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "plan-source")
    return (
      <SpecCard>
        <p>{tx(locale, "یکی را الان انتخاب کن. تا قبل از پایان راه‌اندازی می‌توانی با بازگشت تغییرش بدهی.", "Pick one now. You can change it with Back before you finish setup.")}</p>
        <div className="mo-spec__grid" style={{ marginBlockStart: "1rem" }}>
          <SpecCard>
            <span className="mo-spec__state-icon"><FileUp /></span>
            <h2>{tx(locale, "برنامه خودم را استفاده می‌کنم", "Use my own plan")}</h2>
            <p>{tx(locale, "برنامه‌ات را وارد کن یا پرامپت ما را در ابزار دیگری اجرا کن.", "Import a plan, or use our prompt in another AI tool.")}</p>
            <SpecBadge>{tx(locale, "همیشه رایگان · بدون اشتراک", "Always free · No subscription")}</SpecBadge>
          </SpecCard>
          <SpecCard tone="brand">
            <span className="mo-spec__state-icon mo-spec__state-icon--brand"><WandSparkles /></span>
            <h2>{tx(locale, "Momentum برنامه‌ام را بسازد", "Create my plan")}</h2>
            <p>{tx(locale, "Momentum از پاسخ‌هایت یک برنامه شخصی ۳۰روزه می‌سازد.", "Momentum creates a personal 30-day plan from your answers.")}</p>
            <SpecBadge tone="brand">{tx(locale, "هدیه برنامه اول در صورت باقی‌ماندن بودجه · عضویت از دوره دوم", "First-plan gift when campaign budget remains · Membership from cycle two")}</SpecBadge>
          </SpecCard>
        </div>
        <SpecCallout icon={<Check />} title={tx(locale, "برای ادامه یکی را انتخاب کن.", "Choose one option to continue.")} tone="info" />
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "health-caution")
    return (
      <SpecCard>
        <SpecCallout icon={<AlertOctagon />} title={tx(locale, "ساخت خودکار برنامه برای این حساب متوقف است", "Automatic planning is unavailable for this account")} tone="danger">
          {tx(locale, "پاسخ ثبت‌شده به ارزیابی یک متخصص سلامت دارای صلاحیت نیاز دارد. هیچ درخواست ماهانه‌ای مصرف نشده است.", "The reported answer needs assessment by a qualified health professional. No monthly request has been consumed.")}
        </SpecCallout>
        <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
          <SpecSelect label={tx(locale, "بیماری یا محدودیت پرخطر", "High-risk condition or limitation")} value={tx(locale, "بله، نیاز به بررسی تخصصی دارم", "Yes, I need professional review")} />
          <SpecField label={tx(locale, "توضیح ذخیره‌شده", "Saved details")} multiline value={tx(locale, "در بررسی اخیر پزشک محدودیت فعالیت شدید توصیه شده است.", "A clinician recently advised avoiding high-intensity activity.")} />
        </div>
        <SpecCallout icon={<HeartPulse />} title={tx(locale, "قدم بعدی: مراجعه به متخصص", "Next step: consult a professional")} tone="warning">
          {tx(locale, "Momentum مجوز پزشکی صادر نمی‌کند. پس از دریافت راهنمایی حرفه‌ای می‌توانی اطلاعات سلامت را ویرایش کنی.", "Momentum does not provide medical clearance. You may edit your health information after receiving professional guidance.")}
        </SpecCallout>
        <div className="mo-spec__actions">
          <SpecButton kind="secondary">{tx(locale, "ذخیره و خروج", "Save and exit")}</SpecButton>
          <SpecButton kind="danger">{tx(locale, "دیدن راهنمای ایمنی", "View safety guidance")}</SpecButton>
        </div>
      </SpecCard>
    );
  if (state === "food-allergy")
    return (
      <SpecCard>
        <SpecCallout icon={<Salad />} title={tx(locale, "حساسیت‌ها از کاتالوگ انتخاب می‌شوند", "Allergies are chosen from the catalog")} tone="energy">
          {tx(locale, "وعده‌های تولیدشده نباید آلرژن انتخاب‌شده داشته باشند. گزینه «سایر» ساخت برنامه را تا مسیر انسانی متوقف می‌کند.", "Generated meals must not contain a selected allergen. Other blocks generation until a mapped path exists.")}
        </SpecCallout>
        <div style={{ marginBlockStart: "1rem" }}>
          <SpecChips items={allergenChips(locale, ["Peanut"])} />
        </div>
        <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
          <SpecSelect label={tx(locale, "سبک غذایی", "Diet style")} options={[tx(locale, "همه‌چیزخوار", "Omnivore"), tx(locale, "گیاه‌خوار", "Vegetarian"), tx(locale, "وگان", "Vegan")]} value={tx(locale, "همه‌چیزخوار", "Omnivore")} />
          <SpecField label={tx(locale, "غذاهای نامطلوب", "Foods to avoid")} value={tx(locale, "قارچ", "Mushrooms")} />
          <SpecSelect label={tx(locale, "بودجه غذا", "Food budget")} options={[tx(locale, "اقتصادی", "Budget"), tx(locale, "متوسط", "Standard"), tx(locale, "منعطف", "Flexible")]} value={tx(locale, "متوسط", "Standard")} />
        </div>
        <SpecCallout icon={<BadgeCheck />} title={tx(locale, "جایگزین ایمن در تمام فهرست‌ها اعمال می‌شود", "Safe substitutions apply throughout the plan")} tone="success" />
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "training-home" || state === "training-gym") {
    const home = state === "training-home";
    return (
      <SpecCard>
        <SpecTabs items={[tx(locale, "خانه", "Home"), tx(locale, "باشگاه", "Gym"), tx(locale, "فضای باز", "Outdoors")]} selected={home ? tx(locale, "خانه", "Home") : tx(locale, "باشگاه", "Gym")} />
        <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
          <SpecSelect label={tx(locale, "تعداد روز تمرین در هفته", "Workout days per week")} value={tx(locale, "۳ روز", "3 days")} />
          <SpecSelect label={tx(locale, "مدت هر تمرین", "Session duration")} value={tx(locale, "۶۰ دقیقه", "60 minutes")} />
          <SpecField label={tx(locale, "روزهای انتخابی", "Selected days")} value={tx(locale, "شنبه، دوشنبه، چهارشنبه", "Saturday, Monday, Wednesday")} />
          <SpecField label={tx(locale, "زمان ترجیحی", "Preferred time")} value={tx(locale, "۱۸:۳۰", "18:30")} />
        </div>
        <div style={{ marginBlockStart: "1rem" }}>
          <SpecCallout icon={home ? <Home /> : <Dumbbell />} title={home ? tx(locale, "تجهیزات خانه فعال شد", "Home equipment enabled") : tx(locale, "امکانات باشگاه فعال شد", "Gym equipment enabled")} tone="brand">
            {home ? tx(locale, "دمبل، کش تمرینی و نیمکت را تایپ یا انتخاب کن.", "Type or select dumbbells, resistance bands, and bench.") : tx(locale, "رک اسکات، هالتر، کابل و دستگاه‌ها را انتخاب کن.", "Select squat rack, barbell, cables, and machines.")}
          </SpecCallout>
        </div>
        <SpecField label={tx(locale, "تجهیزات در دسترس", "Available equipment")} value={home ? tx(locale, "دمبل، کش، نیمکت", "Dumbbells, bands, bench") : tx(locale, "هالتر، رک، کابل، دستگاه پرس", "Barbell, rack, cables, press machine")} />
        <StepActions locale={locale} />
      </SpecCard>
    );
  }
  if (state === "training-custom")
    return (
      <SpecCard>
        <SpecSelect label={tx(locale, "مدت تمرین", "Workout duration")} value={tx(locale, "زمان سفارشی", "Custom duration")} />
        <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
          <SpecField label={tx(locale, "دقیقه", "Minutes")} value={locale === "fa" ? "۷۵" : "75"} />
          <SpecField label={tx(locale, "زمان شروع ترجیحی", "Preferred start time")} value={tx(locale, "۱۸:۳۰", "18:30")} />
        </div>
        <SpecCallout icon={<Clock3 />} title={tx(locale, "زمان معتبر: ۱۵ تا ۱۲۰ دقیقه", "Valid range: 15–120 minutes")} tone="info">
          {tx(locale, "گزینه انتخابی در همان کنترل نمایش داده می‌شود و آیکون ساعت وسط محدوده خودش قرار می‌گیرد.", "The selected value stays in one compact control with a centred time icon.")}
        </SpecCallout>
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "body-manual")
    return (
      <SpecCard>
        <SpecCallout icon={<FileUp />} title={tx(locale, "آپلود گزارش اختیاری است", "Uploading a report is optional")} tone="info">
          {tx(locale, "مقادیر را دستی وارد کن یا گزارش را فقط برای کمک به ورود داده بارگذاری کن؛ این کار درخواست جداگانه‌ای از هوش مصنوعی مصرف نمی‌کند.", "Enter values manually or upload a report only to help data entry; this does not consume a separate AI request.")}
        </SpecCallout>
        <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
          <SpecField label={tx(locale, "قد", "Height")} value={locale === "fa" ? "۱۶۸ سانتی‌متر" : "168 cm"} />
          <SpecField label={tx(locale, "وزن", "Weight")} value={locale === "fa" ? "۷۲٫۴ کیلوگرم" : "72.4 kg"} />
          <SpecField hint={tx(locale, "اختیاری", "Optional")} label={tx(locale, "درصد چربی بدن", "Body fat")} value={locale === "fa" ? "۲۸٪" : "28%"} />
          <SpecField hint={tx(locale, "اختیاری", "Optional")} label={tx(locale, "دور کمر", "Waist")} value={locale === "fa" ? "۸۴ سانتی‌متر" : "84 cm"} />
        </div>
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "body-upload-review")
    return (
      <SpecCard>
        <SpecCallout icon={<FileCheck2 />} title={tx(locale, "گزارش خوانده شد؛ مقادیر را تأیید کن", "Report read; confirm every value")} tone="warning">
          {tx(locale, "هیچ مقداری بدون تأیید تو وارد پروفایل نمی‌شود.", "No value is added to your profile without your confirmation.")}
        </SpecCallout>
        <SpecTable
          columns={locale === "fa" ? ["مورد", "مقدار گزارش", "مقدار تأییدی"] : ["Measure", "Report value", "Confirmed value"]}
          rows={
            locale === "fa"
              ? [
                  ["وزن", "۷۲٫۴ کیلوگرم", "۷۲٫۴ کیلوگرم"],
                  ["چربی بدن", "۲۸٫۱٪", "۲۸٪"],
                  ["توده عضلانی", "۴۷٫۲ کیلوگرم", "۴۷٫۲ کیلوگرم"],
                ]
              : [
                  ["Weight", "72.4 kg", "72.4 kg"],
                  ["Body fat", "28.1%", "28%"],
                  ["Muscle mass", "47.2 kg", "47.2 kg"],
                ]
          }
        />
        <StepActions locale={locale} />
      </SpecCard>
    );
  if (state === "review-gift" || state === "review-subscription") {
    const gift = state === "review-gift";
    return (
      <div className="mo-spec__grid">
        <SpecCard className="is-wide">
          <SpecList
            rows={[
              {
                icon: <BadgeCheck />,
                tone: "success",
                label: tx(locale, "هدف", "Goal"),
                detail: tx(locale, "کاهش چربی همراه حفظ قدرت", "Fat loss while retaining strength"),
                value: tx(locale, "ویرایش", "Edit"),
              },
              {
                icon: <HeartPulse />,
                tone: "success",
                label: tx(locale, "سلامت و ایمنی", "Health & safety"),
                detail: tx(locale, "مانع ایمنی ثبت نشده · سلامت عمومی", "No safety block · general wellness"),
                value: tx(locale, "ویرایش", "Edit"),
              },
              {
                icon: <Salad />,
                tone: "energy",
                label: tx(locale, "تغذیه", "Food"),
                detail: tx(locale, "همه‌چیزخوار · حساسیت بادام‌زمینی", "Omnivore · peanut allergy"),
                value: tx(locale, "ویرایش", "Edit"),
              },
              {
                icon: <Dumbbell />,
                tone: "brand",
                label: tx(locale, "تمرین", "Training"),
                detail: tx(locale, "۳ روز در خانه · ۶۰ دقیقه", "3 home sessions · 60 minutes"),
                value: tx(locale, "ویرایش", "Edit"),
              },
              {
                icon: <Globe2 />,
                tone: "success",
                label: tx(locale, "مسیر پرداخت", "Payment route"),
                detail: tx(locale, "ایران · درگاه ایرانی و تومان", "Iran · Iranian gateway and toman"),
                value: tx(locale, "بر اساس کشور", "From country"),
              },
              {
                icon: <LockKeyhole />,
                tone: "success",
                label: tx(locale, "رضایت‌ها", "Consents"),
                detail: tx(locale, "شرایط، حریم خصوصی و داده سلامت · نسخه ۱٫۰", "Terms, Privacy, and health data · version 1.0"),
                value: tx(locale, "تأیید شده", "Confirmed"),
              },
            ]}
          />
        </SpecCard>
        <SpecCard tone={gift ? "energy" : "brand"}>
          <span className={`mo-spec__state-icon mo-spec__state-icon--${gift ? "energy" : "brand"}`}>{gift ? <Gift /> : <WalletCards />}</span>
          <h2>{gift ? tx(locale, "هدیه برنامه اول فعال است", "First-plan gift is active") : tx(locale, "عضویت فعال لازم است", "Active membership required")}</h2>
          <p>{gift ? tx(locale, "برنامه اول بدون کارت هدیه است. با تأیید، یک درخواست ترکیبی برای برنامه کامل ارسال می‌شود.", "The first plan is a no-card gift. Confirming sends one combined request for the complete plan.") : tx(locale, "اطلاعاتت ذخیره شده؛ پس از فعال‌شدن عضویت می‌توانی درخواست برنامه را تأیید کنی.", "Your information is saved; confirm generation after membership activation.")}</p>
          {gift ? (
            <SpecCallout icon={<Gift />} title={tx(locale, "بدون کارت و بدون شارژ", "No card and no charge")} tone="info">
              {tx(locale, "عضویت فقط از چرخه دوم لازم است.", "Membership is required only from cycle two.")}
            </SpecCallout>
          ) : null}
          <SpecButton>{gift ? tx(locale, "تأیید و استفاده از هدیه", "Confirm and use gift") : tx(locale, "دیدن عضویت", "View membership")}</SpecButton>
        </SpecCard>
      </div>
    );
  }
  if (state === "saved-offline")
    return (
      <SpecCard>
        <SpecCallout icon={<WifiOff />} title={tx(locale, "بازبینی نهایی روی این دستگاه محفوظ است", "Final review is preserved on this device")} tone="neutral">
          {tx(locale, "هدف، سلامت، غذا، تمرین و رضایت‌های تأییدشده از بین نمی‌روند. پس از برگشت اتصال، تعارض نسخه حل و بازبینی همگام می‌شود.", "Goal, health, food, training, and confirmed consents are not lost. When connection returns, the version conflict is resolved and the review is synced.")}
        </SpecCallout>
        <SpecList
          rows={[
            {
              icon: <BadgeCheck />,
              tone: "success",
              label: tx(locale, "۵ بخش بازبینی شد", "5 sections reviewed"),
              detail: tx(locale, "نسخه محلی: امروز ۱۲:۴۰", "Local version: today 12:40"),
            },
            {
              icon: <WifiOff />,
              label: tx(locale, "ساخت برنامه شروع نشده", "Generation has not started"),
              detail: tx(locale, "سهم ماهانه مصرف نشده است", "Monthly request remains unused"),
            },
          ]}
        />
        <div className="mo-spec__actions">
          <SpecButton disabled>{tx(locale, "در انتظار اتصال برای تأیید نهایی", "Waiting to finish review")}</SpecButton>
          <SpecButton kind="secondary">{tx(locale, "خروج امن", "Leave safely")}</SpecButton>
        </div>
      </SpecCard>
    );
  return (
    <SpecCard>
      <SpecCallout icon={<AlertTriangle />} title={tx(locale, "بازبینی نهایی ذخیره نشد", "Final review could not be saved")} tone="danger">
        {tx(locale, "همه پاسخ‌ها و رضایت‌های انتخاب‌شده روی صفحه باقی مانده‌اند. درخواست ساخت برنامه آغاز نشده و سهم ماهانه مصرف نشده است.", "All answers and selected consents remain on screen. Generation has not started and the monthly request is still unused.")}
      </SpecCallout>
      <SpecList
        rows={[
          {
            icon: <BadgeCheck />,
            tone: "success",
            label: tx(locale, "اطلاعات راه‌اندازی حفظ شد", "Setup information preserved"),
          },
          {
            icon: <RefreshCw />,
            label: tx(locale, "آخرین نسخه سرور تغییر کرده است", "The server draft changed"),
            detail: tx(locale, "پیش از جایگزینی تفاوت‌ها را بازبینی کن", "Review differences before replacing either version"),
          },
        ]}
      />
      <div className="mo-spec__actions">
        <SpecButton>
          <RefreshCw />
          {tx(locale, "حل تعارض و تلاش دوباره", "Resolve conflict and retry")}
        </SpecButton>
        <SpecButton kind="secondary">{tx(locale, "کپی خلاصه بازبینی", "Copy review summary")}</SpecButton>
      </div>
    </SpecCard>
  );
}

type AdditionalOnboarding = "loading" | "basics" | "goal" | "goal-target" | "consent" | "health" | "health-eligible" | "health-urgent" | "food" | "food-conflict" | "training-no-equipment" | "training-weekdays" | "training-validation" | "body-empty" | "body-uploading" | "body-error" | "body-skipped";

function AdditionalOnboardingScreen({ locale, state }: { locale: SpecLocale; state: AdditionalOnboarding }) {
  if (state === "loading")
    return (
      <OnboardingFrame locale={locale} step={0} title={tx(locale, "در حال بازیابی راه‌اندازی…", "Loading your setup…")}>
        <SpecCard className="mo-spec__state-card">
          <span className="mo-spec__state-icon mo-spec__state-icon--brand">
            <LoaderCircle className="orbit-spin" />
          </span>
          <p>{tx(locale, "پیشرفت فقط پس از دریافت نسخه ذخیره‌شده نمایش داده می‌شود.", "Progress appears only after the saved draft is loaded.")}</p>
        </SpecCard>
      </OnboardingFrame>
    );
  if (state === "basics")
    return (
      <OnboardingFrame locale={locale} step={1} title={tx(locale, "اطلاعات پایه", "Basic information")}>
        <SpecCard>
          <SpecCallout icon={<ShieldCheck />} title={tx(locale, "این سرویس برای افراد ۱۸ ساله و بالاتر است", "This service is for adults aged 18 and older")} tone="info">
            {tx(locale, "سن از تاریخ تولد بررسی می‌شود؛ کشور برای قالب‌بندی و دسترسی و جنس ثبت‌شده فقط برای محاسبات مرتبط استفاده می‌شود.", "Age is checked from date of birth; country supports formatting and availability, and recorded sex is used only where relevant to calculations.")}
          </SpecCallout>
          <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
            <SpecField label={tx(locale, "نام", "Name")} value={tx(locale, "سارا", "Sara")} />
            <SpecField label={tx(locale, "تاریخ تولد", "Date of birth")} value={locale === "fa" ? "۲۸ اردیبهشت ۱۳۷۱" : "May 18, 1992"} />
            <SpecSelect label={tx(locale, "تأیید شرط سنی", "Adult eligibility")} value={tx(locale, "۱۸ ساله یا بالاتر · تأیید شد", "Age 18 or older · confirmed")} />
            <SpecSelect label={tx(locale, "جنس ثبت‌شده برای محاسبات مرتبط", "Recorded sex for relevant calculations")} value={tx(locale, "زن", "Female")} />
            <SpecField label={tx(locale, "قد", "Height")} value={tx(locale, "۱۶۸ سانتی‌متر", "168 cm")} />
            <SpecField label={tx(locale, "وزن فعلی", "Current weight")} value={tx(locale, "۷۲٫۴ کیلوگرم", "72.4 kg")} />
            <CountryOfUseField defaultOpen locale={locale} />
          </div>
          <StepActions locale={locale} />
        </SpecCard>
      </OnboardingFrame>
    );
  if (state === "consent")
    return (
      <OnboardingFrame locale={locale} step={3} title={tx(locale, "رضایت و حریم خصوصی", "Consent & privacy")}>
        <SpecCard>
          <SpecCallout icon={<LockKeyhole />} title={tx(locale, "سه انتخاب جداگانه", "Three separate choices")} tone="info">
            {tx(locale, "نسخه و تاریخ هر سند ثبت می‌شود. بازکردن یک سند یا انتخاب یک مورد، دو مورد دیگر را تغییر نمی‌دهد.", "The version and date of each document are recorded. Opening or selecting one never changes the other two.")}
          </SpecCallout>
          <div className="mo-spec__consent-stack">
            <SpecConsentOption checked description={tx(locale, "متن کامل قابل بازکردن است.", "Full document available to open.")} label={tx(locale, "شرایط استفاده", "Terms of Use")} version="v1.0 · 2026-08-14" />
            <SpecConsentOption checked description={tx(locale, "استفاده، نگه‌داری، دریافت و حذف داده.", "Data use, retention, export, and deletion.")} label={tx(locale, "سیاست حریم خصوصی", "Privacy Policy")} version="v1.0 · 2026-08-14" />
            <SpecConsentOption checked description={tx(locale, "برای ساخت برنامه لازم و از حساب قابل پس‌گرفتن است.", "Required for plan creation and withdrawable in your account.")} label={tx(locale, "پردازش داده‌های سلامت", "Health-data processing")} version="v1.0 · 2026-08-14" />
          </div>
          <StepActions locale={locale} />
        </SpecCard>
      </OnboardingFrame>
    );
  if (state === "health-urgent")
    return (
      <OnboardingFrame locale={locale} step={2} title={tx(locale, "برای ادامه کمک فوری بگیر", "Get urgent help before continuing")}>
        <SpecCard className="mo-spec__state-card">
          <span className="mo-spec__state-icon mo-spec__state-icon--danger">
            <AlertOctagon />
          </span>
          <h2>{tx(locale, "ساخت برنامه متوقف شد", "Plan generation is stopped")}</h2>
          <p>{tx(locale, "اگر علامت شدید یا ناگهانی داری با خدمات اضطراری محل زندگی تماس بگیر. هیچ درخواست ماهانه‌ای مصرف نشده است.", "Contact local emergency services for severe or sudden symptoms. No monthly request has been used.")}</p>
          <SpecButton kind="danger">{tx(locale, "راهنمای اقدام فوری", "Urgent action guidance")}</SpecButton>
        </SpecCard>
      </OnboardingFrame>
    );
  if (state === "body-uploading" || state === "body-error" || state === "body-skipped")
    return (
      <OnboardingFrame locale={locale} step={7} title={tx(locale, "اطلاعات بدن", "Body information")}>
        <SpecCard>
          {state === "body-uploading" ? (
            <>
              <SpecCallout icon={<FileUp />} title={tx(locale, "در حال بارگذاری گزارش", "Uploading report")} tone="info">
                {tx(locale, "اعتبارسنجی فایل روی همین مسیر انجام می‌شود؛ می‌توانی لغو کنی.", "The file is validated in this flow and you can cancel.")}
              </SpecCallout>
              <SpecProgress label={tx(locale, "پیشرفت بارگذاری", "Upload progress")} value={62} />
              <SpecButton kind="secondary">{tx(locale, "لغو", "Cancel")}</SpecButton>
            </>
          ) : state === "body-error" ? (
            <>
              <SpecCallout icon={<AlertTriangle />} title={tx(locale, "فایل بارگذاری نشد", "Upload failed")} tone="danger">
                {tx(locale, "مقادیر دستی حفظ شده‌اند. فایل را حذف یا دوباره امتحان کن.", "Manual values are preserved. Remove the file or try again.")}
              </SpecCallout>
              <div className="mo-spec__actions">
                <SpecButton>
                  <RefreshCw />
                  {tx(locale, "تلاش دوباره", "Try again")}
                </SpecButton>
                <SpecButton kind="secondary">{tx(locale, "حذف فایل", "Remove file")}</SpecButton>
              </div>
            </>
          ) : (
            <>
              <SpecCallout icon={<Check />} title={tx(locale, "این مرحله رد شد", "This step was skipped")} tone="neutral">
                {tx(locale, "گزارش بدن اختیاری است. قبل از بازبینی نهایی می‌توانی برگردی و مقدارها را اضافه کنی.", "Body evidence is optional. You can return and add values before final review.")}
              </SpecCallout>
              <SpecButton kind="secondary">{tx(locale, "افزودن اطلاعات", "Add information")}</SpecButton>
            </>
          )}
        </SpecCard>
      </OnboardingFrame>
    );
  const titles = {
    basics: tx(locale, "اطلاعات پایه", "Basic information"),
    goal: tx(locale, "هدف اصلی", "Primary goal"),
    "goal-target": tx(locale, "هدف و وزن پیشنهادی", "Goal & optional target"),
    consent: tx(locale, "رضایت و حریم خصوصی", "Consent & privacy"),
    health: tx(locale, "سلامت و محدودیت‌ها", "Health & limitations"),
    "health-eligible": tx(locale, "آماده ادامه هستی", "You can continue"),
    food: tx(locale, "غذا و سبک زندگی", "Food & lifestyle"),
    "food-conflict": tx(locale, "یک تضاد غذایی را اصلاح کن", "Resolve a food conflict"),
    "training-no-equipment": tx(locale, "تمرین بدون تجهیزات", "Equipment-free training"),
    "training-weekdays": tx(locale, "روزهای تمرین", "Workout days"),
    "training-validation": tx(locale, "زمان‌بندی را اصلاح کن", "Fix the training schedule"),
    "body-empty": tx(locale, "اطلاعات بدن اختیاری است", "Body information is optional"),
  }[state];
  return (
    <OnboardingFrame locale={locale} step={setupStep(state)} title={titles}>
      <SpecCard>
        {state === "goal" || state === "goal-target" ? (
          <>
            <SpecTabs items={[tx(locale, "کاهش چربی", "Fat loss"), tx(locale, "حفظ وضعیت", "Maintenance"), tx(locale, "افزایش قدرت", "Build strength")]} selected={tx(locale, "کاهش چربی", "Fat loss")} />
            {state === "goal-target" ? <SpecField hint={tx(locale, "اختیاری و قابل تغییر", "Optional and editable")} label={tx(locale, "وزن هدف", "Target weight")} value={tx(locale, "۶۴ کیلوگرم", "64 kg")} /> : null}
          </>
        ) : null}
        {state === "health" ? (
          <div className="mo-spec__form-grid">
            <SpecSelect label={tx(locale, "بارداری یا احتمال بارداری", "Pregnant or possibly pregnant")} value={tx(locale, "خیر", "No")} />
            <SpecSelect label={tx(locale, "سابقه اختلال خوردن", "Eating-disorder history")} value={tx(locale, "خیر", "No")} />
            <SpecSelect label={tx(locale, "وضعیت پرخطر", "High-risk condition")} value={tx(locale, "ندارم", "None")} />
            <SpecSelect label={tx(locale, "آسیب یا محدودیت", "Injury or limitation")} value={tx(locale, "ندارم", "None")} />
            <SpecField label={tx(locale, "داروها", "Medications")} value={tx(locale, "ویتامین D", "Vitamin D")} />
          </div>
        ) : null}
        {state === "health-eligible" ? (
          <SpecCallout icon={<BadgeCheck />} title={tx(locale, "پاسخ‌ها مانع ساخت خودکار برنامه نیستند", "Your answers do not block automatic planning")} tone="success">
            {tx(locale, "این نتیجه تشخیص یا تأیید پزشکی نیست.", "This result is not medical clearance or diagnosis.")}
          </SpecCallout>
        ) : null}
        {state === "food" ? (
          <>
            <SpecCallout icon={<Salad />} title={tx(locale, "آلرژن‌ها از کاتالوگ انتخاب می‌شوند", "Allergens are chosen from the catalog")} tone="energy">
              {tx(locale, "گزینه «سایر» ساخت برنامه را در راه‌اندازی متوقف می‌کند، نه با خطای تولید.", "Other blocks generation at onboarding, not with a generation error.")}
            </SpecCallout>
            <div style={{ marginBlockStart: "1rem" }}>
              <SpecChips items={allergenChips(locale, ["Peanut"])} />
            </div>
            <div className="mo-spec__form-grid" style={{ marginBlockStart: "1rem" }}>
              <SpecSelect label={tx(locale, "سبک غذایی", "Diet style")} value={tx(locale, "همه‌چیزخوار", "Omnivore")} />
              <SpecField label={tx(locale, "غذاهای محبوب", "Favourite foods")} value={tx(locale, "مرغ، ماست، سالاد", "Chicken, yogurt, salads")} />
              <SpecSelect label={tx(locale, "زمان آشپزی", "Cooking time")} value={tx(locale, "حداکثر ۳۰ دقیقه", "Up to 30 minutes")} />
              <SpecSelect label={tx(locale, "بودجه", "Budget")} value={tx(locale, "متوسط", "Standard")} />
            </div>
          </>
        ) : null}
        {state === "food-conflict" ? (
          <>
            <SpecChips items={allergenChips(locale, ["Peanut"])} />
            <SpecField error={tx(locale, "این گزینه با حساسیت بادام‌زمینی تضاد دارد.", "This choice conflicts with the peanut allergy.")} label={tx(locale, "میان‌وعده محبوب", "Preferred snack")} value={tx(locale, "کره بادام‌زمینی", "Peanut butter")} />
          </>
        ) : null}
        {state === "training-no-equipment" ? (
          <SpecCallout icon={<Dumbbell />} title={tx(locale, "تجهیزات لازم نیست", "No equipment required")} tone="info">
            {tx(locale, "با انتخاب فضای باز، ورودی تجهیزات پنهان است و برنامه با وزن بدن ساخته می‌شود.", "For outdoor training, equipment input is hidden and sessions use bodyweight movements.")}
          </SpecCallout>
        ) : null}
        {state === "training-weekdays" ? (
          <div className="mo-spec__week">
            {(locale === "fa" ? ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] : ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]).map((day, index) => (
              <button className={`mo-spec__day ${[0, 2, 4].includes(index) ? "is-active" : ""}`} key={day} type="button">
                {day}
              </button>
            ))}
          </div>
        ) : null}
        {state === "training-validation" ? (
          <>
            <SpecField error={tx(locale, "سه روز انتخاب کرده‌ای؛ دقیقاً سه روز هفته را علامت بزن.", "You selected 3 days; choose exactly 3 weekdays.")} label={tx(locale, "روزهای تمرین", "Workout days")} value={tx(locale, "شنبه، دوشنبه", "Saturday, Monday")} />
            <SpecField error={tx(locale, "مدت باید بین ۱۵ تا ۱۲۰ دقیقه باشد.", "Duration must be between 15 and 120 minutes.")} label={tx(locale, "مدت", "Duration")} value={tx(locale, "۱۴۰ دقیقه", "140 minutes")} />
          </>
        ) : null}
        {state === "body-empty" ? (
          <SpecCallout icon={<FileUp />} title={tx(locale, "می‌توانی این مرحله را رد کنی", "You can skip this step")} tone="neutral">
            {tx(locale, "ورود دستی یا گزارش اختیاری است و هیچ پردازش هوش مصنوعی جداگانه‌ای ندارد.", "Manual entry or evidence upload is optional and never uses a separate AI call.")}
          </SpecCallout>
        ) : null}
        <StepActions locale={locale} />
      </SpecCard>
    </OnboardingFrame>
  );
}

function GenerationHandoff({ locale }: { locale: SpecLocale }) {
  return (
    <OnboardingFrame locale={locale} step={8} title={tx(locale, "درخواست برنامه ثبت شد", "Your plan request is submitted")}>
      <div className="mo-spec__grid">
        <SpecCard className="is-wide">
          <Timeline
            rows={[
              {
                title: tx(locale, "راه‌اندازی کامل شد", "Setup complete"),
                body: tx(locale, "اطلاعات و رضایت‌ها تأیید شدند", "Information and consent confirmed"),
                status: "done",
              },
              {
                title: tx(locale, "درخواست دوره ثبت شد", "Period request submitted"),
                body: tx(locale, "۱ از ۱ درخواست استفاده شد", "1 of 1 request used"),
                status: "done",
              },
              {
                title: tx(locale, "ساخت و اعتبارسنجی", "Generate and validate"),
                body: tx(locale, "تمرین و تغذیه با هم", "Workout and nutrition together"),
                status: "active",
              },
              {
                title: tx(locale, "ورود و شروع دوره", "Import and start period"),
                body: tx(locale, "تاریخ شروع هنگام آماده‌شدن برنامه ثبت می‌شود", "The start date is recorded when the plan is ready"),
                status: "pending",
              },
            ]}
          />
        </SpecCard>
        <SpecCard>
          <span className="mo-spec__state-icon mo-spec__state-icon--brand">
            <LoaderCircle className="orbit-spin" />
          </span>
          <h2>{tx(locale, "می‌توانی صفحه را ببندی", "You can leave this screen")}</h2>
          <p>{tx(locale, "پس از آماده‌شدن برنامه اعلان دریافت می‌کنی.", "We’ll notify you when the plan is ready.")}</p>
          <SpecButton kind="secondary">{tx(locale, "رفتن به وضعیت برنامه", "View plan status")}</SpecButton>
        </SpecCard>
      </div>
    </OnboardingFrame>
  );
}

function renderLanding() {
  return (_: unknown, context: { globals: Record<string, unknown> }) => <LandingSpec locale={localeFromStory(context.globals.locale)} />;
}
function renderPricing(state: PricingState) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => <PricingSpec locale={localeFromStory(context.globals.locale)} state={state} />;
}
function renderPublic(state: PublicState) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => {
    const locale = localeFromStory(context.globals.locale);
    const content = <PublicStateScreen locale={locale} state={state} />;
    return state === "menu" ? (
      <SpecOverlay kind="dialog" locale={locale} title={tx(locale, "منوی اصلی", "Main menu")}>
        {content}
      </SpecOverlay>
    ) : (
      content
    );
  };
}
function renderOnboarding(state: OnboardingState) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => <OnboardingScreen locale={localeFromStory(context.globals.locale)} state={state} />;
}
function renderAdditionalOnboarding(state: AdditionalOnboarding) {
  return (_: unknown, context: { globals: Record<string, unknown> }) => <AdditionalOnboardingScreen locale={localeFromStory(context.globals.locale)} state={state} />;
}

const meta = {
  title: "Screens/Complete product/Public and onboarding",
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
    docs: {
      description: {
        component: "Responsive public acquisition, dynamic gift states, and every meaningful onboarding branch. All fixtures are offline and deterministic.",
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const LandingDesktop: Story = {
  parameters: momentumEvidence(["PUB-01"], "/[locale]"),
  render: renderLanding(),
};
export const LandingMobile: Story = {
  parameters: {
    ...momentumEvidence(["PUB-02"], "/[locale]"),
    viewport: { defaultViewport: "mobile1" },
  },
  render: renderLanding(),
};
export const LandingMobileMenuOpen: Story = {
  parameters: {
    ...momentumEvidence(["PUB-03"], "/[locale]", "dialog"),
    viewport: { defaultViewport: "mobile1" },
  },
  render: renderPublic("menu"),
};
export const LandingRegionChecking: Story = {
  name: "Landing choosing version",
  parameters: momentumEvidence(["PUB-04"], "/[locale]"),
  render: renderPublic("region-checking"),
};
export const LandingRegionUnavailable: Story = {
  name: "Landing Iran payment route",
  parameters: momentumEvidence(["PUB-05"], "/[locale]"),
  render: renderPublic("region-unavailable"),
};
export const LandingFaqExpanded: Story = {
  parameters: momentumEvidence(["PUB-06"], "/[locale]", "in-page"),
  render: renderPublic("faq"),
};
export const PricingMembership: Story = {
  parameters: momentumEvidence(["PUB-07"], "/[locale]/pricing"),
  render: renderPricing("available"),
};
export const PricingGiftAvailable: Story = {
  parameters: momentumEvidence(["PUB-08"], "/[locale]/pricing"),
  render: renderPricing("available"),
};
export const PricingGiftExhausted: Story = {
  parameters: momentumEvidence(["PUB-09"], "/[locale]/pricing"),
  render: renderPricing("exhausted"),
};
export const PricingRegionUnverified: Story = {
  parameters: momentumEvidence(["PUB-10"], "/[locale]/pricing"),
  render: renderPricing("region"),
};
export const PricingConfigurationLoading: Story = {
  parameters: momentumEvidence(["PUB-11"], "/[locale]/pricing"),
  render: renderPricing("loading"),
};
export const PricingLoadError: Story = {
  parameters: momentumEvidence(["PUB-11"], "/[locale]/pricing"),
  render: renderPublic("pricing-error"),
};
export const PublicSafetyBoundary: Story = {
  parameters: momentumEvidence(["PUB-12"], "/[locale]/safety"),
  render: renderPublic("safety"),
};
export const PublicPrivacyPolicy: Story = {
  parameters: momentumEvidence(["PUB-13"], "/[locale]/privacy"),
  render: renderPublic("privacy"),
};
export const PublicTermsOfUse: Story = {
  parameters: momentumEvidence(["PUB-14"], "/[locale]/terms"),
  render: renderPublic("terms"),
};

export const OnboardingLoading: Story = {
  parameters: momentumEvidence(["ONB-01"], "/[locale]/onboarding"),
  render: renderAdditionalOnboarding("loading"),
};
export const OnboardingEntry: Story = {
  parameters: momentumSupportingVariant("/[locale]/onboarding", "optional pre-step introduction"),
  render: renderOnboarding("entry"),
};
export const OnboardingResume: Story = {
  parameters: momentumEvidence(["ONB-02"], "/[locale]/onboarding"),
  render: renderOnboarding("resume"),
};
export const BasicsDefault: Story = {
  parameters: momentumEvidence(["ONB-03"], "/[locale]/onboarding/basics"),
  render: renderAdditionalOnboarding("basics"),
};
export const BasicsValidation: Story = {
  parameters: momentumEvidence(["ONB-04"], "/[locale]/onboarding/basics"),
  render: renderOnboarding("basics-validation"),
};
export const GoalDefault: Story = {
  parameters: momentumEvidence(["ONB-05"], "/[locale]/onboarding/goal"),
  render: renderAdditionalOnboarding("goal"),
};
export const GoalConditionalTarget: Story = {
  parameters: momentumEvidence(["ONB-06"], "/[locale]/onboarding/goal"),
  render: renderAdditionalOnboarding("goal-target"),
};
export const ConsentDefault: Story = {
  parameters: momentumEvidence(["ONB-07"], "/[locale]/onboarding/consent"),
  render: renderAdditionalOnboarding("consent"),
};
export const ConsentRequired: Story = {
  parameters: momentumEvidence(["ONB-08"], "/[locale]/onboarding/consent"),
  render: renderOnboarding("consent-required"),
};
export const PlanSourceChoice: Story = {
  parameters: momentumEvidence(["ONB-29"], "/[locale]/onboarding/plan-source"),
  render: renderOnboarding("plan-source"),
};
export const HealthDefault: Story = {
  parameters: momentumEvidence(["ONB-09"], "/[locale]/onboarding/health"),
  render: renderAdditionalOnboarding("health"),
};
export const HealthEligible: Story = {
  parameters: momentumEvidence(["ONB-10"], "/[locale]/onboarding/health"),
  render: renderAdditionalOnboarding("health-eligible"),
};
export const HealthSafetyCaution: Story = {
  parameters: momentumEvidence(["ONB-11"], "/[locale]/onboarding/health"),
  render: renderOnboarding("health-caution"),
};
export const HealthUrgent: Story = {
  parameters: momentumEvidence(["ONB-12"], "/[locale]/onboarding/health"),
  render: renderAdditionalOnboarding("health-urgent"),
};
export const FoodDefault: Story = {
  parameters: momentumEvidence(["ONB-13"], "/[locale]/onboarding/food"),
  render: renderAdditionalOnboarding("food"),
};
export const FoodConflict: Story = {
  parameters: momentumEvidence(["ONB-14"], "/[locale]/onboarding/food"),
  render: renderAdditionalOnboarding("food-conflict"),
};
export const TrainingAtGym: Story = {
  parameters: momentumEvidence(["ONB-15"], "/[locale]/onboarding/training"),
  render: renderOnboarding("training-gym"),
};
export const TrainingAtHome: Story = {
  parameters: momentumEvidence(["ONB-16"], "/[locale]/onboarding/training"),
  render: renderOnboarding("training-home"),
};
export const TrainingWithoutEquipment: Story = {
  parameters: momentumEvidence(["ONB-17"], "/[locale]/onboarding/training"),
  render: renderAdditionalOnboarding("training-no-equipment"),
};
export const TrainingWeekdaysCompact: Story = {
  parameters: {
    ...momentumEvidence(["ONB-18"], "/[locale]/onboarding/training"),
    viewport: { defaultViewport: "mobile1" },
  },
  render: renderAdditionalOnboarding("training-weekdays"),
};
export const TrainingCustomDuration: Story = {
  parameters: momentumEvidence(["ONB-19"], "/[locale]/onboarding/training"),
  render: renderOnboarding("training-custom"),
};
export const TrainingValidation: Story = {
  parameters: momentumEvidence(["ONB-20"], "/[locale]/onboarding/training"),
  render: renderAdditionalOnboarding("training-validation"),
};
export const BodyInformationEmpty: Story = {
  parameters: momentumEvidence(["ONB-21"], "/[locale]/onboarding/body"),
  render: renderAdditionalOnboarding("body-empty"),
};
export const BodyInformationManual: Story = {
  parameters: momentumEvidence(["ONB-22"], "/[locale]/onboarding/body"),
  render: renderOnboarding("body-manual"),
};
export const BodyReportUploading: Story = {
  parameters: momentumEvidence(["ONB-23"], "/[locale]/onboarding/body"),
  render: renderAdditionalOnboarding("body-uploading"),
};
export const BodyReportUploadError: Story = {
  parameters: momentumEvidence(["ONB-24"], "/[locale]/onboarding/body"),
  render: renderAdditionalOnboarding("body-error"),
};
export const BodyReportReview: Story = {
  parameters: momentumEvidence(["ONB-25"], "/[locale]/onboarding/body"),
  render: renderOnboarding("body-upload-review"),
};
export const BodyInformationSkipped: Story = {
  parameters: momentumEvidence(["ONB-26"], "/[locale]/onboarding/body"),
  render: renderAdditionalOnboarding("body-skipped"),
};
export const ReviewWithGift: Story = {
  parameters: momentumEvidence(["ONB-27"], "/[locale]/onboarding/review"),
  render: renderOnboarding("review-gift"),
};
export const ReviewWithSubscriptionRequired: Story = {
  parameters: momentumEvidence(["ONB-27"], "/[locale]/onboarding/review"),
  render: renderOnboarding("review-subscription"),
};
export const OnboardingSavedOffline: Story = {
  parameters: momentumEvidence(["ONB-28"], "/[locale]/onboarding/review"),
  render: renderOnboarding("saved-offline"),
};
export const OnboardingSaveError: Story = {
  parameters: momentumEvidence(["ONB-28"], "/[locale]/onboarding/review"),
  render: renderOnboarding("save-error"),
};
export const GenerationHandoffScreen: Story = {
  parameters: momentumEvidence(["ONB-28"], "/[locale]/onboarding/review"),
  render: renderOnboarding("generation-handoff"),
};
export const TrainingAtHomeMobile: Story = {
  parameters: {
    ...momentumEvidence(["ONB-16"], "/[locale]/onboarding/training"),
    viewport: { defaultViewport: "mobile1" },
  },
  render: renderOnboarding("training-home"),
};
