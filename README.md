# Momentum

Momentum یک محصول دو‌زبانه‌ی **general wellness** برای ساخت و اجرای برنامه‌ی شخصی غذا و تمرین، چک‌این روزانه، نمایش روند و همراهی مربی AI است. وب‌اپ فعلی PWA است؛ قراردادهای داده، API و design tokenها طوری تفکیک شده‌اند که کلاینت‌های native iOS و Android بعداً همان backend را مصرف کنند.

نسخه‌ی فعلی آلفا و زیر `1.0.0` است. پرداخت هنوز فعال نشده و عرضه‌ی AI برای بعضی کشورها، از جمله ایران، تا تأیید سرویس‌دهنده و بررسی حقوقی مسدود است.

## چه چیزی تغییر کرده است؟

- حساب کاربری و session با Supabase Auth
- PostgreSQL، RLS، private Storage و Edge Function به‌جای `localStorage` برای داده‌های سلامت
- onboarding داده‌محور و قابل‌ادامه در حساب کاربر
- آپلود اختیاری و خصوصی گزارش Body Composition
- تولید برنامه و گفت‌وگوی مربی فقط از سمت سرور؛ کلید OpenAI هرگز وارد مرورگر نمی‌شود
- Structured Output، اعتبارسنجی قطعی، quota، idempotency و ثبت مصرف AI
- مسیرهای اصلی فارسی/RTL و انگلیسی/LTR؛ زبان، کشور، واحد پول و فرهنگ غذایی در مدل
  جدا هستند، اما پوشش کامل واحدها، تقویم‌ها، ترجمه‌ها و فرهنگ غذایی هنوز release gate است
- IA جدید: Today، Plan، Coach، Progress و Me
- سیستم بصری **Momentum Orbit** با الهام از عمق و material شیشه‌ای؛ glass فقط در chrome و کنترل‌ها استفاده می‌شود
- Preview حافظه‌ای با دادهٔ مصنوعی برای بررسی بدون backend؛ دادهٔ سلامت یا تجاری را persist نمی‌کند، هرچند ترجیحات غیرحساس UI و cache دارایی‌های PWA ممکن است روی دستگاه بمانند
- PWA با prompt به‌روزرسانی، تشخیص offline و assetهای برند جدید

## معماری

```text
Browser / future native apps
        │  Supabase anon session (RLS)
        ▼
Supabase Auth + PostgreSQL + private Storage
        │
        ├── user-owned reads/writes protected by RLS
        └── Edge Functions (privileged mutations, quota, safety)
                 │
                 └── OpenAI Responses API (server-side only)
```

در حالت account متصل، داده‌ی پروفایل، برنامه، گزارش بدن، لاگ‌ها، پیام‌های مربی و
مصرف AI در دیتابیس ذخیره می‌شود. تنها session احراز هویت و ترجیحات غیرحساس UI
می‌توانند روی دستگاه نگهداری شوند. درخواست‌های API به‌صورت network-only هستند؛
آفلاین بودن به معنی حالت read-only shell است، نه queue کردن داده‌ی سلامت روی دستگاه.

انتخاب backend در [`docs/architecture/0001-supabase-platform.md`](docs/architecture/0001-supabase-platform.md)، مدل داده در [`docs/architecture/data-model.md`](docs/architecture/data-model.md) و threat model در [`docs/security/threat-model.md`](docs/security/threat-model.md) مستند شده‌اند.

## اجرای وب‌اپ

پیش‌نیاز وب: Node.js `>=22.12` و npm سازگار با lockfile. برای backend محلی،
Docker Desktop، Supabase CLI و Deno 2 (برای lint/check مستقیم Edge Functionها)
نیز لازم‌اند. حداقل نسخهٔ Node و نسخهٔ package manager در `package.json` ثبت
شده‌اند و نسخهٔ ابزارهای backend باید در CI/release نیز pin شوند.

```bash
npm install
npm run dev
```

بدون متغیر محیطی، landing، pricing، safety و Preview اجرا می‌شوند؛ ثبت‌نام و عملیات ابری با پیام setup غیرفعال می‌مانند.

برای اتصال به Supabase، فایل `.env.local` شخصی بسازید و مقادیر عمومی `.env.example` را قرار دهید:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
VITE_APP_ENV=development
```

هیچ‌وقت `service_role` یا `OPENAI_API_KEY` را با پیشوند `VITE_` تعریف نکنید. این secretها فقط در Supabase Edge Function secrets قرار می‌گیرند.

## راه‌اندازی Supabase

پس از نصب و login در Supabase CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy geo-context
supabase functions deploy generate-plan
supabase functions deploy coach
supabase functions deploy analyze-body-composition
supabase functions deploy account-data
```

سپس secretهای server را تنظیم کنید. نام مدل‌ها و فهرست کشورهای مجاز باید configuration باشند، نه مقدار پراکنده در UI:

```bash
supabase secrets set --env-file /absolute/path/to/momentum.production.env
```

فایل production باید علاوه بر مدل‌های واقعیِ در دسترس حساب، originهای دقیق،
نسخه‌های consent، کلید safety، سقف‌ها، allowlist تأییدشده و master/feature switchها
را داشته باشد. مقدار نمونه یا حضور یک کشور در فایل env مجوز عرضه نیست.

راهنمای کامل backend در [`supabase/README.md`](supabase/README.md) است.

## کنترل کیفیت

```bash
npm run lint
npm test
npm run build
npm audit --omit=dev
```

Build production در `dist/` قرار می‌گیرد. تمام چهار فرمان باید پیش از merge یا deploy موفق باشند.

## انتشار وب

Frontend یک static Vite build است و می‌تواند روی Cloudflare Pages یا Vercel اجرا شود:

- Build command: `npm run build`
- Output directory: `dist`
- Node.js: `>=22.12`
- Environment: دو مقدار عمومی Supabase و برچسب محیط بالا

Database و Edge Functionها جداگانه در Supabase deploy می‌شوند. برای callbackهای Auth، دامنه‌ی production را در Supabase URL Configuration اضافه کنید.

## AI و کنترل هزینه

- مسیرهای plan، coach و body extraction از server config مدل می‌گیرند. پیش‌فرض
  آلفا Terra برای ساخت برنامه و Luna برای گفت‌وگو/استخراج است؛ هر route پیش از
  production باید روی دادهٔ نمایشی فارسی و انگلیسی eval و از نظر دسترسی حساب تأیید شود.
- آلفای فعلی Structured Output، schema/range validation، quota، idempotency و
  usage ledger دارد، اما catalog حاکم و کامل غذا/مواد مغذی/تمرین و constraintهای
  امضاشده توسط متخصص هنوز launch gate هستند. خروجی AI نباید verified یا medical
  معرفی شود.
- prompt ثابت پیش از context متغیر قرار می‌گیرد تا caching مؤثر بماند
- هر درخواست quota، idempotency key، schema validation و usage ledger دارد
- خروجی خام مدل مستقیماً قرارداد UI نیست و فقط پس از parse/validation قابل‌استفاده است

جزئیات در [`docs/architecture/ai-architecture.md`](docs/architecture/ai-architecture.md) و [`docs/product/MONETIZATION.md`](docs/product/MONETIZATION.md) آمده است.

## ایمنی و محدودیت منطقه‌ای

Momentum پزشک، متخصص تغذیه یا سرویس اورژانسی نیست. عرضه‌ی نخست فقط برای بزرگسالان است. بارداری/شیردهی، نگرانی اختلال خوردن و شرایط پرریسک از برنامه‌ریزی خودکار خارج می‌شوند و باید به متخصص واجد شرایط ارجاع داده شوند.

کشور ایران در زمان آخرین بررسی در فهرست کشورهای پشتیبانی‌شده‌ی OpenAI API نبود. بنابراین:

- RTL، غذاهای ایرانی، قیمت‌گذاری و معماری برای ایران طراحی می‌شوند؛
- فروش trial یا قابلیت AI برای کاربر/صورتحساب ایران **launch-blocked** است؛
- VPN، proxy یا سرور ثالث راه‌حل قابل‌قبول برای دورزدن محدودیت نیست؛
- فعال‌سازی فقط پس از مجوز کتبی provider و بررسی حقوقی انجام می‌شود.

سیاست کامل در [`docs/product/SAFETY_AND_LAUNCH_POLICY.md`](docs/product/SAFETY_AND_LAUNCH_POLICY.md) ثبت شده است.

## ساختار مهم پروژه

```text
src/
  platform/          auth، Supabase، query و i18n
  v2/
    components/      chrome و لایه‌های سراسری
    data/            contract، repository و Preview data
    onboarding/      schema و persistence
    pages/           public، auth، onboarding و app
    router/          routeهای locale-aware
    ui/              primitiveهای Orbit
  styles/
    app.css           stylesheet ورودی production
    orbit.css         پیاده‌سازی semantic design system
supabase/
  migrations/        schema، constraint، index و RLS
  functions/         APIهای server-side
docs/
  architecture/      ADR، data model و AI
  design/            Orbit tokens و handoff وب/native
  product/           PRD، pricing، metrics و safety
  security/          threat model
```

قرارداد مرجع طراحی در [`docs/design/tokens.json`](docs/design/tokens.json) قرار دارد؛
generator/validator و خروجی native هنوز پیاده‌سازی نشده‌اند و فعلاً صرفاً handoff
spec هستند. وضعیت دقیق در [`docs/design/CONFORMANCE.md`](docs/design/CONFORMANCE.md)
آمده است. منبع canonical هویت فعلی فقط
[`public/brand/momentum-orbit-master.svg`](public/brand/momentum-orbit-master.svg)
است؛ splash، favicon و PNGهای PWA derivative هستند.

## اسناد محصول

- [`docs/product/PRD.md`](docs/product/PRD.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/product/MONETIZATION.md`](docs/product/MONETIZATION.md)
- [`docs/product/METRICS.md`](docs/product/METRICS.md)
- [`docs/OPERATIONS.md`](docs/OPERATIONS.md)
- [`docs/design/README.md`](docs/design/README.md)
- [`docs/design/CONFORMANCE.md`](docs/design/CONFORMANCE.md)
- [`docs/legal/PRIVACY.md`](docs/legal/PRIVACY.md)
- [`docs/legal/TERMS.md`](docs/legal/TERMS.md)
- [`docs/legal/DATA_RETENTION.md`](docs/legal/DATA_RETENTION.md)
- [`docs/legal/SUBPROCESSORS.md`](docs/legal/SUBPROCESSORS.md)
- [`docs/legal/COUNTRY_GO_NO_GO.md`](docs/legal/COUNTRY_GO_NO_GO.md)

## قواعد مشارکت

- secret، فایل `.env`، گزارش واقعی بدن یا داده‌ی شخصی را commit نکنید.
- هر جدول خصوصی باید RLS و تست جداسازی دو کاربر داشته باشد.
- service-role فقط در backend؛ browser هرگز هزینه، entitlement یا plan version را مستقیم نمی‌نویسد.
- هیچ رنگ feature-level یا مقدار AI model در component hardcode نشود؛ از token/config استفاده کنید.
- داده‌ی Preview باید صریحاً demo و کاملاً جدا از repository production بماند.
- تغییر contract باید version، migration و test داشته باشد.
- تا اعلام رسمی launch، نسخه‌ها آلفا و زیر `1.0.0` می‌مانند.
