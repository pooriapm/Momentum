# Momentum — Public Product Requirements Document

Version: 1.0
Status: Product baseline; capabilities are not considered shipped until their roadmap exit criteria pass
Last reviewed: 2026-07-31
Languages: Persian and English
Owners: Product, Engineering, Design, Safety

> Launch blocker: AI coaching and paid AI plans must remain disabled for users located or billed in Iran until written provider permission and legal approval are complete. See [Safety and Launch Policy](./SAFETY_AND_LAUNCH_POLICY.md).

---

# نسخه فارسی

## ۱. خلاصه محصول

Momentum یک مربی دیجیتال تناسب‌اندام و تغذیه برای بزرگسالان است که با استفاده از اطلاعاتی که کاربر با رضایت خود وارد می‌کند، برنامهٔ تمرینی و غذایی شخصی‌سازی‌شده، پیگیری پیشرفت، بازتنظیم برنامه و گفت‌وگوی مربی‌محور ارائه می‌دهد.

Momentum محصول «سلامت عمومی و سبک زندگی» است؛ ابزار تشخیص، درمان یا جایگزین پزشک، متخصص تغذیه، فیزیوتراپیست یا مربی دارای مجوز نیست.

## ۲. مسئله

کاربران معمولاً با یکی یا چند مورد از مشکلات زیر روبه‌رو هستند:

- برنامه‌های عمومی با هدف، امکانات، محدودیت زمانی یا فرهنگ غذایی آنان هماهنگ نیست؛
- برنامهٔ تمرین و تغذیه در چند ابزار جدا نگهداری می‌شود؛
- پس از دریافت برنامه، سازوکار ساده‌ای برای پیگیری و بازتنظیم وجود ندارد؛
- کاربر نمی‌داند در برابر توقف پیشرفت، سفر، تغییر تجهیزات یا کاهش پایبندی چه تغییری بدهد؛
- هزینه مربی انسانی برای پیگیری روزانه برای بسیاری از کاربران بالاست؛
- خروجی مستقیم یک چت عمومی ساختاریافته، قابل اعتبارسنجی یا متصل به سابقهٔ کاربر نیست.

## ۳. چشم‌انداز

Momentum باید تجربه‌ای ایجاد کند که در آن کاربر هر روز بداند:

1. امروز چه تمرین یا اقدام تغذیه‌ای دارد؛
2. چرا این اقدام با هدف و شرایط او تناسب دارد؛
3. چگونه آن را ثبت کند؛
4. برنامه چه زمانی و بر چه مبنایی تغییر می‌کند؛
5. چه زمانی باید به متخصص انسانی مراجعه کند.

## ۴. کاربران هدف

### کاربر اصلی MVP

- ۱۸ سال یا بیشتر؛
- هدف عمومی مانند کاهش یا افزایش وزن، حفظ وزن، افزایش قدرت، عضله‌سازی عمومی یا بهبود عادت‌ها؛
- تمرین در خانه یا باشگاه؛
- بدون شرایطی که نیازمند توصیه پزشکی یا تغذیه درمانی شخصی‌سازی‌شده است؛
- فارسی‌زبان یا انگلیسی‌زبان در یک بازار مجاز سرویس‌دهنده AI.

### کاربر خارج از محدوده خودکار

افراد باردار یا شیرده، افراد دارای اختلال خوردن فعلی یا سابقه پرخطر، بیماری یا دارویی که برنامه تمرین/تغذیه را به تصمیم بالینی تبدیل می‌کند، و کاربران زیر ۱۸ سال در MVP برنامهٔ خودکار دریافت نمی‌کنند. محصول باید مسیر ایمن و ارجاع به متخصص نشان دهد.

## ۵. ارزش پیشنهادی

- یک برنامه یکپارچه برای تمرین، تغذیه، پیگیری و گفت‌وگو؛
- شخصی‌سازی با داده‌های ساختاریافته به‌جای تکیه بر یک پیام آزاد؛
- پیشنهاد غذا براساس زبان، کشور، ترجیحات، آلرژی و فرهنگ غذایی اعلام‌شده؛
- بازتنظیم مبتنی بر روند ثبت‌شده و پایبندی، نه واکنش افراطی به یک روز؛
- خروجی قابل مشاهده، نسخه‌بندی، اعتبارسنجی و export؛
- توضیح شفاف محدودیت‌ها و مسیر ارجاع انسانی.

## ۶. اصول محصول

1. **ایمنی قبل از engagement:** محصول نباید برای حفظ streak توصیه نامناسب ارائه دهد.
2. **قواعد قطعی قبل از تولید آزاد:** محاسبات، واحدها، entitlement و محدودیت‌های ایمنی در کد و داده کنترل می‌شوند.
3. **AI یک لایهٔ مربی است، نه منبع حقیقت:** داده غذایی، تمرین و سوابق از منابع کنترل‌شده می‌آیند.
4. **حریم خصوصی پیش‌فرض:** اطلاعات سلامت خصوصی است، analytics حداقلی است و فروش داده وجود ندارد.
5. **زبان، منطقه، قیمت و فرهنگ غذایی مستقل‌اند:** IP فقط مقدار اولیه پیشنهاد می‌دهد و تصمیم نهایی کاربر/صورتحساب است.
6. **قابلیت توضیح و اصلاح:** کاربر می‌تواند دلیل پیشنهاد، نسخه برنامه و تغییرات را ببیند.
7. **دسترسی عمومی فقط پس از عبور از gate:** کامل‌شدن UI به معنی مجازبودن عرضه نیست.

## ۷. محدوده MVP

### داخل محدوده

- ایجاد حساب، ورود، خروج، بازیابی حساب و حذف حساب؛
- onboarding ساختاریافته و رضایت‌نامه‌ها؛
- پروفایل شامل سن، قد، وزن، هدف، تجربه، زمان، تجهیزات و ترجیحات؛
- ثبت اختیاری اندازه‌ها و شاخص‌های body composition از منبعی که کاربر اعلام می‌کند؛
- برنامهٔ تمرینی نسخه‌بندی‌شده؛
- برنامهٔ تغذیه و پیشنهاد وعده از catalog کنترل‌شده؛
- ثبت تمرین، وزن، اندازه‌ها، وعده و پایبندی؛
- check-in روزانه و هفتگی؛
- مربی متنی AI در بازارهای مجاز؛
- بازتنظیم برنامه با محدودیت entitlement؛
- خروجی PDF/چاپ و دادهٔ قابل دانلود؛
- فارسی RTL و انگلیسی LTR؛
- country/currency/cuisine selectors مستقل؛
- pricing page و entitlement، بدون اجرای پرداخت در این مرحله؛
- audit، moderation، cost tracking و safety escalation.

### خارج از محدوده MVP

- تشخیص، درمان، برنامه بیماری یا توصیه دارویی/مکملی؛
- تخمین دقیق درصد چربی از یک عکس؛
- کاربران زیر ۱۸ سال؛
- چت صوتی realtime و تحلیل ویدئوی حرکت؛
- اتصال به wearable و پرونده پزشکی؛
- marketplace مربیان یا تماس انسانی ۲۴/۷؛
- پرداخت واقعی؛
- عرضه AI به کاربران ایران تا رفع launch blocker؛
- تضمین نتیجه یا ادعای پزشکی.

## ۸. سفر اصلی کاربر

### ۸.۱ ورود و تعیین منطقه

1. سیستم با IP فقط زبان/کشور را پیشنهاد می‌دهد.
2. کاربر می‌تواند زبان، کشور، واحدها و فرهنگ غذایی را مستقل تغییر دهد.
3. کشور صورتحساب در آینده منبع نهایی eligibility قیمت است.
4. پیش از onboarding، eligibility سرویس AI بررسی می‌شود.
5. برای ایران، مربی AI و خرید پلن AI غیرفعال و توضیح شفاف نمایش داده می‌شود.

### ۸.۲ ثبت‌نام و onboarding

1. کاربر حساب می‌سازد و ایمیل خود را تأیید می‌کند.
2. سن و رضایت لازم بررسی می‌شود.
3. هدف، تجربه، برنامه زمانی، تجهیزات، سبک غذایی، حساسیت و ترجیحات ثبت می‌شود.
4. screening ایمنی انجام می‌شود.
5. اگر screening مسیر خودکار را رد کند، برنامه تولید نمی‌شود و مسیر انسانی نمایش داده می‌شود.
6. کاربر خلاصه اطلاعات و نحوه استفاده از AI را تأیید می‌کند.

### ۸.۳ ساخت برنامه

1. بک‌اند محاسبات قطعی و constraintها را تولید می‌کند.
2. سیستم گزینه‌های مجاز را از catalog تمرین و غذا بازیابی می‌کند.
3. مدل AI خروجی ساختاریافته مطابق schema تولید می‌کند.
4. validator قواعد، شناسه‌ها، واحدها و محدودیت‌ها را بررسی می‌کند.
5. خروجی نامعتبر repair یا رد می‌شود؛ به کاربر برنامه تأییدنشده نشان داده نمی‌شود.
6. نسخه برنامه ذخیره و دلیل تغییرات ثبت می‌شود.

### ۸.۴ اجرا و پیگیری

- کاربر برنامه امروز، مدت و وسایل لازم را می‌بیند؛
- می‌تواند جلسه/وعده را تکمیل، رد، جابه‌جا یا جایگزین کند؛
- ثبت‌ها در دیتابیس حساب ذخیره می‌شوند و بین دستگاه‌ها در دسترس‌اند؛
- dashboard روند را نشان می‌دهد و از قضاوت‌گری یا body shaming پرهیز می‌کند.

### ۸.۵ check-in و بازتنظیم

- check-in کوتاه روزانه: انرژی، سختی، درد/ناراحتی، پایبندی و یادداشت؛
- check-in هفتگی: روند وزن/اندازه، تکمیل تمرین، غذا و تغییر شرایط؛
- تغییر برنامه از trend و چند سیگنال استفاده می‌کند، نه یک داده منفرد؛
- تغییرات باید diff و توضیح کوتاه داشته باشند؛
- درد، علائم خطر یا نشانه اختلال خوردن مسیر ایمنی را فعال می‌کند.

### ۸.۶ export و خروج

- کاربر می‌تواند برنامه فعلی را PDF/چاپ کند؛
- می‌تواند داده قابل‌حمل دریافت کند؛
- می‌تواند حساب و داده خود را حذف کند؛
- retention و محدودیت‌های حذف backup به زبان روشن توضیح داده می‌شوند.

## ۹. نیازمندی‌های کاربردی

| شناسه | نیازمندی | معیار پذیرش خلاصه |
| --- | --- | --- |
| FR-01 | حساب کاربری | session امن، تأیید ایمیل، reset و sign-out همه دستگاه‌ها |
| FR-02 | تفکیک داده | هیچ کاربر عادی به داده کاربر دیگر دسترسی ندارد؛ RLS test الزامی |
| FR-03 | onboarding | draft قابل ادامه و تکمیل فقط پس از فیلد و consent لازم |
| FR-04 | eligibility | سن، safety screen و کشور پیش از هر درخواست AI enforce می‌شود |
| FR-05 | نسخه برنامه | هر تغییر نسخه جدید با timestamp، source و change reason می‌سازد |
| FR-06 | workout | روز، حرکت، ست، تکرار/زمان، استراحت، تجهیزات و جایگزین دارد |
| FR-07 | nutrition | هدف روزانه و وعده‌ها فقط با food ID معتبر و هشدار آلرژی ساخته می‌شوند |
| FR-08 | check-in | ثبت روزانه/هفتگی idempotent و قابل ویرایش با audit است |
| FR-09 | coach | پاسخ از context مجاز ساخته، moderation و quota را رعایت می‌کند |
| FR-10 | export | خروجی از داده ذخیره‌شده ساخته می‌شود، نه generation مجدد |
| FR-11 | localization | تمام مسیرهای اصلی در RTL فارسی و LTR انگلیسی قابل استفاده‌اند |
| FR-12 | pricing | currency و entitlement مستقل از زبان‌اند؛ قیمت ایران inactive است |
| FR-13 | privacy | consent، download و deletion در تنظیمات حساب در دسترس‌اند |
| FR-14 | observability | هر AI call مدل، feature، tokens، latency، validation و cost estimate دارد |
| FR-15 | safety | blocked case پاسخ امن، reason code و مسیر escalation دارد |

## ۱۰. نیازمندی‌های AI

- API key فقط در backend نگهداری می‌شود؛
- Responses API با Structured Outputs و schema versioned استفاده می‌شود؛
- Luna برای routing، استخراج، خلاصه و گفت‌وگوی پرتعداد؛
- Terra برای برنامه و بازتنظیم؛
- Sol فقط برای مسیر استثنایی که eval ضرورت آن را ثابت کرده است؛
- prompt شامل outcome، constraint، evidence، output schema و stopping condition است؛
- prefix پایدار از داده متغیر جدا می‌شود؛
- تاریخچه کامل در هر turn ارسال نمی‌شود؛ summary و recent window استفاده می‌شود؛
- `store: false` تا حد امکان فعال است؛
- شناسه ایمنی pseudonymous است و ایمیل خام ارسال نمی‌شود؛
- برنامه تنها پس از validator و policy check منتشر می‌شود؛
- fallback نباید خروجی نامعتبر را به برنامه تبدیل کند.

## ۱۱. مدل داده مفهومی

- Account and identity
- User profile, locale, country, units, cuisine preferences
- Consent and policy versions
- Safety screening and eligibility result
- Goals and constraints
- Body measurements and source metadata
- Exercise, equipment, food, ingredient and allergen catalogs
- Workout and nutrition plan versions
- Plan items and substitutions
- Workout, meal and check-in logs
- Conversation summary and bounded message history
- Subscription, entitlement and usage ledger
- AI request, validation and safety event metadata
- Export and deletion requests

داده پزشکی غیرضروری نباید جمع‌آوری شود. متن آزاد حساس باید حداقل و retention آن کوتاه باشد.

## ۱۲. زبان و منطقه

- رابط فارسی از RTL کامل، اعداد و تاریخ قابل انتخاب و فونت خوانا پشتیبانی می‌کند؛
- انگلیسی LTR است؛
- واحد متریک/امپریال به زبان وابسته نیست؛
- غذا براساس cuisine preference و availability انتخاب می‌شود، نه ملیت فرض‌شده؛
- کاربر همیشه می‌تواند locale، units و cuisine را تغییر دهد؛
- IP فقط default کم‌اعتماد است و در پروفایل حقیقت قطعی محسوب نمی‌شود؛
- country eligibility و billing country قابل audit هستند.

## ۱۳. الزامات غیرکاربردی

- mobile-first و دسترس‌پذیر؛
- عملیات حساس server-authoritative؛
- encryption در transit و at rest توسط provider؛
- least privilege و RLS؛
- عدم قرارگیری secret یا service-role در client؛
- idempotency برای generation، check-in و webhookهای پرداخت آینده؛
- backup، restore drill و rollback مستند؛
- rate limit در سطح IP، account، entitlement و provider؛
- availability degradation: در قطعی AI، برنامه ذخیره‌شده و logging همچنان کار کند؛
- حذف analytics حاوی متن گفتگو، عکس یا جزئیات سلامت؛
- تست RTL/LTR، timezone و conversion واحدها.

## ۱۴. موفقیت MVP

- حداقل ۶۰٪ کاربران واجد شرایط onboarding را کامل کنند؛
- حداقل ۷۰٪ برنامه‌های تولیدی بدون repair دوم validator را پاس کنند؛
- نرخ نمایش خروجی unsafe تأییدشده صفر در pre-launch safety suite؛
- هیچ RLS cross-user access در تست و audit وجود نداشته باشد؛
- p95 AI variable cost در سقف تعریف‌شده پلن بماند؛
- کاربر بتواند بدون کمک تیم حساب را export و deletion request کند؛
- همهٔ launch gateهای [Safety and Launch Policy](./SAFETY_AND_LAUNCH_POLICY.md) پاس شوند.

## ۱۵. پرسش‌های باز

- کشور حقوقی شرکت و بازارهای launch اولیه کدام‌اند؟
- چه فرد یا نهاد دارای مجوز قواعد بالینی/تغذیه‌ای را تأیید می‌کند؟
- provider جایگزین مجاز برای ایران وجود دارد یا ایران فقط waitlist خواهد بود؟
- retention دقیق عکس، پیام و safety event چقدر است؟
- پرداخت بین‌المللی و ایرانی تحت چه entity و قوانین انجام می‌شود؟
- چه سطحی از پشتیبانی انسانی در Core و Pro عملی است؟

---

# English version

## 1. Product summary

Momentum is a digital fitness and nutrition coach for adults. With information users deliberately provide, it creates personalized workout and meal plans, tracks progress, recalibrates plans, and offers an ongoing coaching conversation.

Momentum is a **general wellness** product. It is not a diagnostic or treatment tool and does not replace a physician, registered dietitian, physiotherapist, or licensed coach.

## 2. Problem

People commonly face one or more of these problems:

- generic plans do not fit their goal, schedule, equipment, limitations, or food culture;
- workout, nutrition, and progress records live in separate tools;
- a plan is delivered once without a reliable feedback and recalibration loop;
- users do not know what to change after a plateau, travel, equipment change, or reduced adherence;
- continuous human coaching is unaffordable for many users;
- a raw general-purpose chat answer is not structured, validated, versioned, or connected to a durable user record.

## 3. Vision

Momentum should help a user understand every day:

1. what workout or nutrition action to take;
2. why it fits their stated goal and circumstances;
3. how to log it;
4. when and why the plan will change;
5. when to stop and seek qualified human help.

## 4. Target users

### Primary MVP user

- age 18 or older;
- has a general goal such as weight change, maintenance, general strength, muscle gain, or habit improvement;
- trains at home or in a gym;
- does not require personalized medical or therapeutic nutrition advice;
- uses Persian or English in an AI-provider-supported market.

### Outside automated scope

The MVP does not automatically generate plans for minors, pregnancy or breastfeeding, current or high-risk eating-disorder history, or a condition or medication that turns exercise or nutrition guidance into a clinical decision. The product presents a safe boundary and referral path instead.

## 5. Value proposition

- one coherent experience for workouts, meals, tracking, and coaching;
- personalization from structured, consented data rather than one free-form prompt;
- food suggestions adapted to declared language, market, preferences, allergies, and cuisine;
- recalibration based on trends and adherence rather than an extreme reaction to one day;
- versioned, validated, explainable, and exportable plans;
- clear limitations and human escalation.

## 6. Product principles

1. **Safety before engagement.** A streak never justifies unsuitable advice.
2. **Deterministic controls before generation.** Calculations, units, entitlements, and safety constraints live in code and controlled data.
3. **AI is the coaching layer, not the source of truth.** Food, exercise, and account records come from governed sources.
4. **Private by default.** Health data is private, analytics are minimized, and data is not sold.
5. **Language, region, price, and cuisine are independent.** IP suggests a default; user and billing evidence determine final settings.
6. **Explainable and correctable.** Users can see plan versions, rationale, and changes.
7. **Public availability follows gates.** A complete interface is not permission to launch.

## 7. MVP scope

### In scope

- account creation, sign-in, recovery, sign-out, and deletion;
- structured onboarding and consent;
- profile, goals, experience, schedule, equipment, and preferences;
- optional body measurements and user-declared source metadata;
- versioned workout plans;
- nutrition plans and meal suggestions from governed catalogs;
- workout, weight, measurement, meal, and adherence logs;
- daily and weekly check-ins;
- text AI coach in supported markets;
- entitlement-limited recalibration;
- PDF/print plan export and portable data download;
- Persian RTL and English LTR;
- independent country, currency, unit, and cuisine controls;
- pricing and entitlement UI, with payment execution deferred;
- audit, moderation, cost tracking, and safety escalation.

### Out of scope for MVP

- diagnosis, disease treatment, therapeutic diets, medication or supplement advice;
- claiming precise body-fat estimates from a photo;
- users under 18;
- realtime voice, movement-video analysis, wearables, or medical-record connections;
- a coach marketplace or 24/7 human care;
- real payment processing;
- AI availability for users in Iran before the launch blocker is resolved;
- outcome guarantees or medical claims.

## 8. Primary user journey

1. Momentum suggests language and country from low-confidence IP evidence.
2. The user independently confirms language, country, units, and cuisine.
3. The user creates and verifies an account.
4. Age, consent, market eligibility, and safety screening are completed.
5. The backend calculates deterministic targets and constraints.
6. Governed exercise and food candidates are retrieved.
7. AI produces a schema-constrained draft.
8. Validators approve, repair, or reject the draft before display.
9. The user follows and logs the saved plan across devices.
10. Daily and weekly check-ins create evidence for bounded recalibration.
11. The user can export the current plan and request data download or deletion.

For Iran, AI coaching and AI-plan purchase remain disabled with a transparent explanation. A localized non-AI experience or waitlist is a separate release decision.

## 9. Functional requirements

| ID | Requirement | Acceptance summary |
| --- | --- | --- |
| FR-01 | Account lifecycle | Secure session, email verification, recovery, and all-device sign-out |
| FR-02 | Data isolation | No normal user can access another user's rows; automated RLS tests pass |
| FR-03 | Onboarding | Resumable draft; completion requires mandatory fields and consent |
| FR-04 | Eligibility | Age, safety screen, and country are enforced before every AI request |
| FR-05 | Plan versioning | Every change creates a timestamped version, source, and reason |
| FR-06 | Workout plan | Day, exercise, set, rep/time, rest, equipment, and substitution data |
| FR-07 | Nutrition plan | Governed food IDs, targets, substitutions, and allergen warnings |
| FR-08 | Check-ins | Idempotent daily/weekly records with an audit trail |
| FR-09 | Coach | Bounded context, moderation, quota, and safe escalation |
| FR-10 | Export | Export derives from saved validated data, never fresh generation |
| FR-11 | Localization | Core journeys work in Persian RTL and English LTR |
| FR-12 | Pricing | Currency and entitlement are language-independent; Iran prices inactive |
| FR-13 | Privacy | Consent, download, and deletion controls are accessible in account settings |
| FR-14 | Observability | Model, feature, tokens, latency, validation, and cost estimate recorded per AI call |
| FR-15 | Safety | Blocked cases return safe copy, a reason code, and an escalation path |

## 10. AI requirements

- API credentials remain server-side;
- use the Responses API and versioned Structured Output schemas;
- Luna handles high-volume chat, extraction, classification, and summarization;
- Terra handles plan generation and recalibration;
- Sol is reserved for eval-proven exceptional workflows;
- prompts state outcome, constraints, available evidence, output schema, and stopping conditions;
- stable prompt prefixes are separated from variable user data;
- use a structured state summary and bounded recent window, not the entire transcript;
- use `store: false` where supported and appropriate;
- send a pseudonymous safety identifier, never a raw email address;
- no plan is published before schema, catalog, deterministic, and policy validation;
- a provider failure or invalid response must fail closed, not become a user plan.

## 11. Conceptual data model

- identity and account;
- locale, country, units, and cuisine preference;
- consent and policy versions;
- safety screening and eligibility;
- profile, goal, and constraints;
- body measurements with source metadata;
- exercise, equipment, food, ingredient, and allergen catalogs;
- workout and nutrition plan versions and substitutions;
- workouts, meals, measurements, and check-ins;
- structured conversation summary and bounded history;
- subscription, entitlement, and usage ledger;
- AI request, validation, and safety metadata;
- export and deletion requests.

Unnecessary medical data must not be collected. Sensitive free text should be minimized and have a short, explicit retention period.

## 12. Localization and regional behavior

- Persian provides complete RTL layout and readable typography; English is LTR;
- metric/imperial units are independent of language;
- cuisine preference and ingredient availability drive meals, not inferred nationality;
- users can change locale, units, and cuisine at any time;
- IP is only a low-confidence default and is not authoritative profile data;
- country eligibility and future billing-country evidence are auditable;
- eligibility is checked server-side for every AI job, not only in the UI.

## 13. Non-functional requirements

- mobile-first and accessible;
- server-authoritative sensitive operations;
- encryption in transit and at rest through approved providers;
- least privilege and RLS;
- no secret or service-role credentials in the client;
- idempotency for generation, check-ins, and future payment webhooks;
- documented backup, restore drill, deployment rollback, and incident response;
- rate limits by IP, account, entitlement, and provider;
- graceful AI outage mode: saved plans and logging remain usable;
- no raw chats, photos, or health details in general analytics;
- automated RTL/LTR, timezone, and unit-conversion tests.

## 14. MVP success criteria

- at least 60% of eligible sign-ups complete onboarding;
- at least 70% of generated plans pass without a second repair attempt;
- zero confirmed unsafe outputs exposed in the pre-launch safety suite;
- zero cross-user RLS access in automated tests and security review;
- p95 variable AI cost remains within the plan envelope;
- users can self-serve export and deletion requests;
- every gate in [Safety and Launch Policy](./SAFETY_AND_LAUNCH_POLICY.md) passes.

## 15. Open decisions

- launch company jurisdiction and first supported markets;
- the licensed professionals responsible for exercise and nutrition rule sign-off;
- whether a compliant AI provider for Iran exists or Iran remains waitlist-only;
- final retention periods for photos, messages, and safety events;
- payment entities and consumer terms for each region;
- feasible human-support level for Core and Pro.
