# Momentum — Public Product Requirements Document

Version: 1.5
Status: Product and design baseline; capabilities are not considered shipped until their roadmap exit criteria pass
Last reviewed: 2026-08-16
Languages: Persian and English
Owners: Product, Engineering, Design, Safety

> Product versions follow sticky `product_region` (D12). The plan is one month from one AI call, shown day by day (D13). D7–D13 live in the [Phase 0 contract](./PHASE-0-PRODUCT-CONTRACT.md).

---

# نسخه فارسی

## ۱. خلاصه محصول

Momentum یک برنامهٔ تناسب‌اندام و تغذیه برای بزرگسالان است که با استفاده از اطلاعات ساختاریافتهٔ کاربر، در هر دورهٔ ماهانه یک برنامهٔ تمرینی و غذایی شخصی‌سازی‌شده تولید، اعتبارسنجی و به‌صورت خودکار وارد محصول می‌کند. محصول چت یا مربی هوش مصنوعی ندارد.

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
- فارسی‌زبان یا انگلیسی‌زبان که از وب‌سایت ثبت‌نام می‌کند؛ نسخهٔ محصول از IP هنگام ساخت حساب قفل می‌شود (`ir` فارسی+ریال یا `intl` انگلیسی+دلار).

اولین ۱۰۰ کاربر واقعی بزرگسالان self-serve در هر دو نسخهٔ محصول هستند: ثبت‌نام عمومی، غربال ایمنی، ثبت روش پرداخت، و دریافت یک برنامهٔ ماهانهٔ هدیه. چرخهٔ دوم پولی است. ایران نسخهٔ فارسی با قیمت ریالی است، نه بازار مسدود.

### کاربر خارج از محدوده خودکار

افراد باردار یا شیرده، افراد دارای اختلال خوردن فعلی یا سابقه پرخطر، بیماری یا دارویی که برنامه تمرین/تغذیه را به تصمیم بالینی تبدیل می‌کند، و کاربران زیر ۱۸ سال در MVP برنامهٔ خودکار دریافت نمی‌کنند. محصول باید مسیر ایمن و ارجاع به متخصص نشان دهد.

## ۵. ارزش پیشنهادی

- یک برنامه یکپارچه برای تمرین، تغذیه و پیگیری؛
- شخصی‌سازی با داده‌های ساختاریافته به‌جای تکیه بر یک پیام آزاد؛
- پیشنهاد غذا براساس زبان، کشور، ترجیحات، آلرژی و فرهنگ غذایی اعلام‌شده؛
- تولید برنامهٔ ماه بعد براساس روند و پایبندی ماه قبل، نه واکنش افراطی به یک روز؛
- خروجی قابل مشاهده، نسخه‌بندی، اعتبارسنجی و export؛
- توضیح شفاف محدودیت‌ها و مسیر ارجاع انسانی.

## ۶. اصول محصول

1. **ایمنی قبل از engagement:** محصول نباید برای حفظ streak توصیه نامناسب ارائه دهد.
2. **قواعد قطعی قبل از تولید آزاد:** محاسبات، واحدها، entitlement و محدودیت‌های ایمنی در کد و داده کنترل می‌شوند.
3. **AI فقط موتور تولید ماهانه است، نه یک شخصیت یا سطح تعاملی:** هیچ chat، composer، پیام مربی یا تولید درخواستی روزانه وجود ندارد؛ داده غذایی، تمرین و سوابق از منابع کنترل‌شده می‌آیند.
4. **یک تولید در هر چرخه ماهانه:** هر اشتراک ماهانه حداکثر یک job تولید ترکیبی تمرین و تغذیه برای کل ماه دارد. idempotency از هزینه و نسخهٔ تکراری جلوگیری می‌کند.
5. **حریم خصوصی پیش‌فرض:** اطلاعات سلامت خصوصی است، analytics حداقلی است و فروش داده وجود ندارد.
6. **زبان، منطقه، قیمت و فرهنگ غذایی مستقل‌اند:** IP فقط مقدار اولیه پیشنهاد می‌دهد و تصمیم نهایی کاربر/صورتحساب است.
7. **قابلیت توضیح و اصلاح:** کاربر می‌تواند دلیل پیشنهاد، نسخه برنامه و تغییرات را ببیند.
8. **تجربهٔ Apple-aligned:** طراحی از اصول HIG اپل در وضوح، سلسله‌مراتب، کنترل‌های آشنا، فضای تنفس، تایپوگرافی و depth محدود پیروی می‌کند؛ هویت Momentum مستقل می‌ماند.
9. **دسترسی عمومی فقط پس از عبور از gate:** کامل‌شدن UI به معنی مجازبودن عرضه نیست.

## ۷. محدوده MVP

### داخل محدوده

- ایجاد حساب، ورود، خروج، بازیابی حساب و حذف حساب؛
- onboarding ساختاریافته و رضایت‌نامه‌ها؛
- پروفایل شامل سن، قد، وزن، هدف، تجربه، زمان، تجهیزات و ترجیحات؛
- ثبت اختیاری اندازه‌ها و شاخص‌های body composition از منبعی که کاربر اعلام می‌کند؛
- برنامهٔ تمرینی نسخه‌بندی‌شده؛
- برنامهٔ تغذیه و پیشنهاد وعده از catalog کنترل‌شده؛
- ثبت تمرین، وزن، اندازه‌ها، وعده و پایبندی؛
- اجرای روزانهٔ همان برنامهٔ ماه (وعده، تمرین، خرید) و یک گزارش عمومی هفتگی؛
- تولید یک برنامهٔ ترکیبی تمرین و تغذیه در آغاز هر دورهٔ ماهانه در بازارهای مجاز؛
- بازتولید ماه بعد فقط پس از تأیید اشتراک فعال و با استفاده از نتایج دورهٔ قبل؛
- برنامه کامل ماه اول به‌عنوان هدیه، فقط تا زمانی که کانفیگ بودجه رایگان ظرفیت رزرو اتمیک داشته باشد؛
- ثبت روش پرداخت (SetupIntent / مجوز صفر) قبل از اولین generation؛ شارژ واقعی از چرخهٔ دوم؛
- خروجی PDF/چاپ و دادهٔ قابل دانلود؛
- رابط فارسی و انگلیسی؛ جهت نوشتار به‌صورت خودکار و بدون نمایش اصطلاحات فنی به کاربر اعمال می‌شود؛
- country/currency/cuisine selectors مستقل؛
- pricing page و entitlement؛ پرداخت نازک (روش پرداخت، کشور صورتحساب، شارژ چرخهٔ دوم، لغو) داخل محدوده است؛
- audit، moderation، cost tracking و safety escalation.

### خارج از محدوده MVP

- تشخیص، درمان، برنامه بیماری یا توصیه دارویی/مکملی؛
- تخمین دقیق درصد چربی از یک عکس؛
- کاربران زیر ۱۸ سال؛
- چت صوتی realtime و تحلیل ویدئوی حرکت؛
- اتصال به wearable و پرونده پزشکی؛
- marketplace مربیان یا تماس انسانی ۲۴/۷؛
- hardening کامل پرداخت (مالیات، dunning، آزمایش منطقه‌ای) که فاز ۵ب است؛
- عرضهٔ جداگانهٔ محصول برای ریجن‌ها به‌جز زبان و ارز فهرست (D12)؛
- تضمین نتیجه یا ادعای پزشکی.

## ۸. سفر اصلی کاربر

### ۸.۱ ورود و تعیین نسخهٔ محصول

1. سیستم با IP فقط نسخهٔ محصول را پیشنهاد می‌دهد: ایران → فارسی و ریال؛ غیر ایران → انگلیسی و دلار.
2. در ساخت حساب همان نسخه روی `product_region` قفل می‌شود و با تغییر IP عوض نمی‌شود.
3. تقویم، واحدها و فرهنگ غذایی مستقل‌اند. زبان پیش‌فرض و ارز فهرست از ریجن حساب می‌آیند.
4. هیچ دیوار «در این منطقه در دسترس نیست» وجود ندارد. waitlist مسیر پیش‌فرض نیست.

### ۸.۲ ثبت‌نام و onboarding

1. کاربر حساب می‌سازد و ایمیل خود را تأیید می‌کند.
2. Basics: نام، تاریخ تولد (۱۸+)، کشور محل سکونت به‌عنوان دادهٔ پروفایل. اگر زیر ۱۸ باشد مسیر متوقف می‌شود. ریجن محصول دروازهٔ AI نیست.
3. Health: غربال بارداری، اختلال خوردن و شرایط پرخطر؛ در صورت رد، مسیر انسانی قبل از رضایت دادهٔ سلامت.
4. Consent: رضایت نسخه‌دار شرایط، حریم خصوصی و دادهٔ سلامت.
5. Goal، Food (آلرژی از picker کنترل‌شده)، Training و Body (دستی، اختیاری).
6. Review: خلاصه، ثبت روش پرداخت (بدون شارژ)، رزرو هدیهٔ D1 در صورت ظرفیت، سپس یک generation ماهانه.

### ۸.۳ ساخت برنامه

1. بک‌اند محاسبات قطعی و constraintها را تولید می‌کند.
2. سیستم گزینه‌های مجاز را از catalog تمرین و غذا بازیابی می‌کند.
3. مدل AI خروجی ساختاریافته مطابق schema تولید می‌کند.
4. validator قواعد، شناسه‌ها، واحدها و محدودیت‌ها را بررسی می‌کند.
5. خروجی فقط با قواعد قطعی و بدون فراخوانی مدل دوم قابل اصلاح است؛ در غیر این صورت رد می‌شود و برنامه تأییدنشده نمایش داده نمی‌شود.
6. نسخه برنامه ذخیره و دلیل تغییرات ثبت می‌شود.

#### قرارداد چرخهٔ ماهانه

1. **ماه اول:** پس از تکمیل onboarding، عبور از safety/eligibility، ثبت روش پرداخت و داشتن entitlement معتبر (هدیهٔ رزروشده یا اشتراک)، فقط یک درخواست برای تولید هم‌زمان برنامهٔ تمرینی و غذایی ماه اول ایجاد می‌شود. catalog فعال باید `momentum-core@v2` یا جدیدترِ بازبینی‌شده باشد.
2. خروجی فقط پس از schema validation، قواعد ایمنی، catalog validation و کنترل واحدها به‌صورت خودکار import و فعال می‌شود.
3. در طول ماه، ثبت تمرین، وعده، وزن، اندازه‌ها، پایبندی و check-inها دادهٔ عملکرد دوره را می‌سازند؛ این رخدادها درخواست AI جداگانه ایجاد نمی‌کنند.
4. **ماه دوم و ماه‌های بعد:** ابتدا وضعیت اشتراک در سمت سرور تأیید می‌شود. سپس snapshot شامل داده‌های پایهٔ onboarding، نسخهٔ فعال قبلی، نتایج دورهٔ گذشته، پایبندی، تغییرات پروفایل و سیگنال‌های ایمنی ساخته می‌شود.
5. سیستم فقط یک درخواست idempotent برای دورهٔ جدید ارسال می‌کند و نسخهٔ معتبر دریافتی را با تاریخ شروع دورهٔ بعد به‌صورت خودکار import می‌کند.
6. اگر اشتراک فعال نباشد، job ساخته نمی‌شود و برنامهٔ قبلی فقط طبق سیاست دسترسی/آرشیو قابل مشاهده می‌ماند.
7. شکست provider یا validation قبل از import برنامهٔ قبلی را خراب نمی‌کند؛ job در صف با تأخیر دوباره تلاش می‌شود و بعد از ۳ دقیقه کاربر خطا و دکمهٔ تلاش دوباره می‌بیند. پس از import موفق هیچ call دومی در همان چرخه نیست.
8. هیچ چت، پیام مربی، prompt مکالمه‌ای، اصلاح لحظه‌ای توسط AI یا سهمیهٔ turn وجود ندارد؛ فقط یادداشت محدود و یک‌باره چرخه بعد داخل همان درخواست ماهانه مجاز است.
9. هدیه ماه اول با کانفیگ server-owned، سقف بودجه کل، بازار مجاز و هزینه رزروی کنترل می‌شود؛ پرشدن سقف generation رایگان کاربران جدید را متوقف می‌کند و حق رزروشده یا برنامه قبلی را حذف نمی‌کند.
10. چرخه از لحظه import و فعال‌شدن موفق برنامه محاسبه می‌شود: سرور `ready_at` را ثبت می‌کند، `starts_at = ready_at` است و `ends_at` یک ماه تقویمی در timezone ذخیره‌شدهٔ کاربر بعد از آن قرار می‌گیرد. مرز ماه شمسی، میلادی یا صورتحساب چرخه فعال را جابه‌جا نمی‌کند.

### ۸.۴ اجرا و پیگیری

- کاربر برنامه امروز، مدت و وسایل لازم را می‌بیند؛
- می‌تواند جلسه/وعده را تکمیل، رد، جابه‌جا یا جایگزین کند؛
- ثبت‌ها در دیتابیس حساب ذخیره می‌شوند و بین دستگاه‌ها در دسترس‌اند؛
- dashboard روند را نشان می‌دهد و از قضاوت‌گری یا body shaming پرهیز می‌کند.

### ۸.۵ گزارش هفتگی و اجرای روزانه

- در طول ماه کاربر برش همان روز از برنامهٔ یک‌ماهه را می‌بیند و اجرا می‌کند؛
- تنها کار محصولی اضافه، گزارش عمومی هفتگی است: ذخیره می‌شود، AI صدا نمی‌زند، برنامه جاری را عوض نمی‌کند؛
- درد یا علائم خطر مسیر ایمنی را فعال می‌کند بدون فراخوانی جدید.

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
| FR-08 | گزارش هفتگی | گزارش عمومی هفتگی اختیاری اما برجسته است؛ AI نیست و برنامه جاری را عوض نمی‌کند |
| FR-09 | تولید ماهانه | یک job در صف برای هر دوره؛ خطای گذرا با تأخیر retry می‌شود؛ تایم‌اوت ۳ دقیقه با تلاش دوباره کاربر؛ سهم دوره فقط بعد از import موفق مصرف می‌شود |
| FR-10 | export | خروجی از داده ذخیره‌شده ساخته می‌شود، نه generation مجدد |
| FR-11 | localization | مسیرهای اصلی در فارسی و انگلیسی قابل استفاده‌اند؛ اصطلاحات فنی جهت نوشتار به کاربر نمایش داده نمی‌شوند |
| FR-12 | pricing | currency و entitlement مستقل از زبان‌اند؛ قیمت ایران inactive است |
| FR-13 | privacy | consent، download و deletion در تنظیمات حساب در دسترس‌اند |
| FR-14 | observability | هر AI call مدل، feature، tokens، latency، validation و cost estimate دارد |
| FR-15 | safety | blocked case پاسخ امن، reason code و مسیر escalation دارد |
| FR-16 | مرز چرخه | `ready_at` فقط بعد از import معتبر ثبت می‌شود؛ همهٔ countdownها و eligibility چرخه بعد از آن مشتق می‌شوند |
| FR-17 | هدیه برنامه اول | reservation اتمیک، budget-aware و حداکثر یک‌بار برای هر شخص واجد شرایط است؛ exhaustion به Preview/اشتراک می‌رود |
| FR-18 | ورودی چرخه بعد | آخرین گزارش هفتگی پایان هدیه را توضیح می‌دهد؛ کاربر پرداخت‌نشده از همین‌جا checkout را شروع می‌کند؛ یادداشت اختیاری می‌ماند |
| FR-19 | دسترسی برنامه | خروجی و تاریخچه معتبر همیشه قابل مشاهده‌اند؛ لغو اشتراک فقط generation آینده را متوقف می‌کند |
| FR-20 | پوشش طراحی | هر ۱۳۲ حالت معنایی در دفترچه canonical باید در Penpot و Storybook شاهد هم‌نام داشته باشد |
| FR-21 | یکپارچگی مسیر | فقط routeهای Router canonical مجازند؛ جزئیات وعده/تمرین، check-in و lifecycle داخل صفحه، dialog یا sheet هستند |
| FR-22 | prototype کامل | هشت flow اصلی بدون dead end، orphan frame یا کنترل بدون مقصد قابل پیمایش‌اند |
| FR-23 | responsive و دسترس‌پذیری | همه سفرها در فارسی/انگلیسی، Light/Dark و عرض‌های کلیدی با keyboard، screen reader، reflow و preference fallback معتبرند |
| FR-24 | روش پرداخت قبل از AI | SetupIntent / مجوز صفر کشور صورتحساب `payment_provider` را قبل از provider start می‌نویسد؛ شارژ تا چرخهٔ دوم نیست |
| FR-25 | آلرژی کنترل‌شده | انتخاب از catalog آلرژن؛ متن آزاد generation را با ۴۰۹ متوقف نمی‌کند؛ وعدهٔ تولیدشده حاوی آلرژن انتخابی رد می‌شود |
| FR-26 | catalog نسخهٔ ۲ | generation عمومی فقط با release بازبینی‌شدهٔ `momentum-core@v2` یا جدیدتر مجاز است |

## ۱۰. نیازمندی‌های AI

- API key فقط در backend نگهداری می‌شود؛
- Responses API با Structured Outputs و schema versioned استفاده می‌شود؛
- مدل برنامه‌ریز برای تنها job ماهانهٔ برنامهٔ ترکیبی تمرین و تغذیه؛
- هیچ مدل یا فراخوانی جداگانه‌ای برای گزارش ترکیب بدنی وجود ندارد؛ فقط مقادیر از قبل تأییدشده وارد درخواست واحد ماهانه می‌شوند؛
- مدل هر چرخه پیش از اجرا از کانفیگ مصوب انتخاب می‌شود؛ fallback یا escalation به مدل دوم در همان چرخه مجاز نیست؛
- prompt شامل outcome، constraint، evidence، output schema و stopping condition است؛
- prefix پایدار از داده متغیر جدا می‌شود؛
- برای دورهٔ دوم به بعد snapshot ساختاریافتهٔ دورهٔ قبل و داده‌های پایه ارسال می‌شود؛ conversation history وجود ندارد؛
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
- Monthly generation cycle, period snapshot and import status
- Subscription, entitlement and usage ledger
- AI request, validation and safety event metadata
- Export and deletion requests

داده پزشکی غیرضروری نباید جمع‌آوری شود. متن آزاد حساس باید حداقل و retention آن کوتاه باشد.

## ۱۲. زبان و منطقه

- رابط فارسی و انگلیسی از چیدمان، اعداد، تاریخ و فونت مناسب هر زبان پشتیبانی می‌کند؛
- جهت نوشتار از locale به‌صورت خودکار تعیین می‌شود و برچسب فنی آن در UI نمایش داده نمی‌شود؛
- واحد متریک/امپریال به زبان وابسته نیست؛
- غذا براساس cuisine preference و availability انتخاب می‌شود، نه ملیت فرض‌شده؛
- کاربر همیشه می‌تواند واحدها و فرهنگ غذایی را تغییر دهد؛ زبان پیش‌فرض و ارز فهرست از `product_region` قفل‌شده می‌آیند؛
- IP فقط یک‌بار در ساخت حساب نسخه را می‌نویسد و آدرس خام ذخیره نمی‌شود؛
- دروازهٔ AI سن، ایمنی، رضایت، روش پرداخت و entitlement است نه جغرافیا.

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
- تست جهت نوشتار، متن ترکیبی، timezone و conversion واحدها؛ بدون نمایش اصطلاحات پیاده‌سازی در UI.

## ۱۴. موفقیت MVP

- حداقل ۶۰٪ کاربران واجد شرایط onboarding را کامل کنند؛
- حداقل ۷۰٪ برنامه‌های تولیدی در همان خروجی واحد validator را پاس کنند؛
- نرخ نمایش خروجی unsafe تأییدشده صفر در pre-launch safety suite؛
- هیچ RLS cross-user access در تست و audit وجود نداشته باشد؛
- p95 AI variable cost در سقف تعریف‌شده پلن بماند؛
- کاربر بتواند بدون کمک تیم حساب را export و deletion request کند؛
- همهٔ launch gateهای [Safety and Launch Policy](./SAFETY_AND_LAUNCH_POLICY.md) پاس شوند.

## ۱۵. گیت‌های حل‌نشدهٔ اجرا و عرضه

- کشور حقوقی شرکت و بازارهای launch اولیه کدام‌اند؟
- چه فرد یا نهاد دارای مجوز قواعد بالینی/تغذیه‌ای را تأیید می‌کند؟
- ایران نسخهٔ محصول `ir` است (فارسی + ریال)، نه دیوار جغرافیایی. waitlist مسیر پیش‌فرض محصول نیست. فعال‌سازی live provider یک چک‌لیست عملیاتی است، نه صفحهٔ «در دسترس نیست».
- retention دقیق فایل خصوصی گزارش، یادداشت چرخه و safety event چقدر است؟
- پرداخت بین‌المللی تحت چه entity و قوانین انجام می‌شود؟ (پرداخت نازک ۵الف برای generation لازم است؛ entity حقوقی هنوز gate است)
- چه سطحی از پشتیبانی انسانی برای اشتراک واحد عملی است؟

## ۱۶. موجودی قطعی صفحه و حالت

مرجع کامل طراحی [Canonical Screen and State Inventory](./SCREEN-STATE-INVENTORY.md)
است. این مرجع دقیقاً ۱۳۲ حالت معنایی دارد:

| بخش | تعداد |
| --- | ---: |
| عمومی | ۱۴ |
| احراز هویت | ۱۸ |
| onboarding | ۲۸ |
| entitlement و چرخه ماهانه | ۲۰ |
| Today | ۱۲ |
| Plan | ۱۴ |
| اجرای روزانه وعده/تمرین | ۱۰ |
| Progress | ۷ |
| Me، Settings و Account Data | ۹ |
| **جمع** | **۱۳۲** |

زبان، ظاهر، viewport و preference دسترس‌پذیری حالت معنایی جدید نمی‌سازند؛
آن‌ها ابعاد الزامی آزمون هر حالت‌اند. هیچ frame توضیحی، کارت state یا component
تنها به‌عنوان screen کامل شمرده نمی‌شود. هر حالت باید context، action اصلی،
back/dismiss، transition، recovery و announcement خود را مشخص کند.

Routeهای قطعی فقط شامل public/legal/auth، هشت step onboarding، چهار مقصد Today،
Plan، Progress و Me و دو صفحه Account Data و Settings هستند. جزئیات وعده، اجرای
تمرین، check-in، grocery/calendar، subscription و lifecycle داخل route والد
طراحی می‌شوند؛ route خیالی مجاز نیست.

## ۱۷. قرارداد responsive، بومی‌سازی و دسترس‌پذیری

- مرجع compact برابر 390px و حداقل معتبر 320px است؛ medium برابر 768px و
  expanded برابر 1440px است. پیاده‌سازی باید بین این نقاط پیوسته reflow شود.
- هر shell و task پیچیده در Penpot ترکیب compact و expanded دارد؛ تغییر navigation،
  فرم متراکم، chart و table در medium نیز طراحی می‌شود.
- هر ۱۳۲ حالت در Storybook با fixture قطعی برای فارسی/انگلیسی و Light/Dark قابل
  مشاهده است؛ حالت‌های حساس به عرض در compact/medium/expanded پوشش دارند.
- روز هفته، ارقام فارسی، تاریخ، زمان، واحد، ایمیل و متن mixed-script نباید overflow
  یا ترتیب معنایی اشتباه ایجاد کند. locale زبان/جهت را تعیین می‌کند و هیچ برچسب
  فنی جهت نوشتار به کاربر نمایش داده نمی‌شود.
- target تعاملی حداقل 44×44، focus آشکار، ترتیب خواندن منطقی، نام/حالت قابل‌دسترسی،
  reflow در 200% zoom، متن بزرگ، کاهش حرکت و کاهش شفافیت الزامی است.
- نمودار همیشه خلاصه متنی و جدول داده معادل دارد. رنگ تنها حامل معنا نیست.
- Liquid Glass فقط navigation و overlay موقت است؛ فرم، card محتوا، alert، plan row
  و اطلاعات سلامت opaque باقی می‌ماند و fallback کاهش شفافیت دارد.

## ۱۸. پذیرش prototype

هشت جریان acquisition، first plan، app navigation، daily use، workout، weekly
progress، account control و renewal/recovery باید قابل کلیک باشند. هر جریان نقطه
شروع نام‌گذاری‌شده، happy path، branchهای خطا/ایمنی، terminal state و مسیر برگشت
دارد. تمام CTAها، Backها، navigationها، sheetها و dialogها مقصد دارند؛ orphan
frame و dead end پذیرفته نیست. happy path اصلی در فارسی compact Light و انگلیسی
expanded Dark اجرا می‌شود و branchها از IDهای همان دفترچه استفاده می‌کنند.

## ۱۹. تعریف Design Complete

طراحی فقط وقتی کامل است که:

1. هر ۱۳۲ ID در Penpot و Storybook شاهد هم‌نام داشته باشد؛
2. هشت prototype بدون dead end پاس شوند؛
3. componentها instance/variant واقعی، auto-layout و semantic token داشته باشند؛
4. تمام حالت‌های loading، empty، offline، stale، error، blocked، success، destructive
   و recovery طراحی شده باشند؛
5. فارسی/انگلیسی، Light/Dark، responsive، متن بلند، اعداد/تاریخ/واحد و accessibility
   evidence ثبت شده باشد؛
6. one subscription، dynamic gift، روش پرداخت قبل از generation، غربال ایمنی زودهنگام، یک call ترکیبی، `ready_at`، حفظ برنامه قبلی، نبود coach/chat و نبود AI جداگانه body در همه artifactها یکسان باشد؛
7. PRD، Inventory، Blueprint، Traceability، Penpot و Storybook هیچ تناقض باز یا
   `TBD` مؤثر بر توسعه نداشته باشند؛
8. مالک محصول defectهای review نهایی را ببندد و قفل تغییر کد production را صریحاً
   بردارد.

## ۲۰. مرجع handoff برای توسعه

عامل توسعه باید به ترتیب
[Implementation Blueprint](../IMPLEMENTATION-BLUEPRINT.md)، این PRD،
[Phase 0 product contract](./PHASE-0-PRODUCT-CONTRACT.md)،
[Screen and State Inventory](./SCREEN-STATE-INVENTORY.md)،
[Traceability](../TRACEABILITY.md)، Penpot و Storybook را بخواند. تصویر به‌تنهایی
قرارداد رفتار نیست؛ نام state، route، token، component anatomy، data invariant و
failure policy همگی بخشی از handoff هستند.

---

# English version

## 1. Product summary

Momentum is a fitness and nutrition application for adults. It uses structured user information to generate, validate, and automatically import one personalized workout-and-nutrition plan per monthly period. The product has no AI chat or AI coach.

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
- uses Persian or English according to sticky product region (`ir` or `intl`).

The first 100 real users are self-serve adults on either product version: they sign up, pass safety screening, add a payment method, and receive one gifted monthly plan. Cycle 2 is paid. IP chooses locale and list currency once; it is not a geo-block.

### Outside automated scope

The MVP does not automatically generate plans for minors, pregnancy or breastfeeding, current or high-risk eating-disorder history, or a condition or medication that turns exercise or nutrition guidance into a clinical decision. The product presents a safe boundary and referral path instead.

## 5. Value proposition

- one coherent experience for workouts, meals, and tracking;
- personalization from structured, consented data rather than one free-form prompt;
- food suggestions adapted to declared language, market, preferences, allergies, and cuisine;
- next-month generation based on prior-period trends and adherence rather than an extreme reaction to one day;
- versioned, validated, explainable, and exportable plans;
- clear limitations and human escalation.

## 6. Product principles

1. **Safety before engagement.** A streak never justifies unsuitable advice.
2. **Deterministic controls before generation.** Calculations, units, entitlements, and safety constraints live in code and controlled data.
3. **AI is only the monthly generation engine, not a persona or conversational surface.** There is no chat, composer, coach message, or on-demand daily generation. Food, exercise, and account records come from governed sources.
4. **One generation per monthly plan cycle.** Each monthly subscription permits at most one combined workout-and-nutrition generation job for the whole month. Idempotency prevents duplicate cost and versions.
5. **Private by default.** Health data is private, analytics are minimized, and data is not sold.
6. **Language, region, price, and cuisine are independent.** IP suggests a default; user and billing evidence determine final settings.
7. **Explainable and correctable.** Users can see plan versions, rationale, and changes.
8. **Apple-aligned experience.** Design follows Apple HIG principles for clarity, hierarchy, familiar controls, breathing room, typography, and restrained depth while retaining an independent Momentum identity.
9. **Public availability follows gates.** A complete interface is not permission to launch.

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
- one combined workout-and-nutrition generation at the start of each monthly period in supported markets;
- next-month regeneration only after active-subscription verification and with prior-period outcomes;
- a gifted complete first-month plan only while the server-owned free-budget configuration can atomically reserve capacity;
- payment-method collection (`SetupIntent` / $0 authorization) before the first generation; the first charge is at cycle 2;
- PDF/print plan export and portable data download;
- Persian and English interfaces; writing direction is applied automatically without exposing technical labels to users;
- independent calendar, unit, and cuisine controls; locale and list currency follow sticky `product_region`;
- pricing and entitlement UI, including thin payments (method, cycle-2 charge, cancel);
- audit, moderation, cost tracking, and safety escalation.

### Out of scope for MVP

- diagnosis, disease treatment, therapeutic diets, medication or supplement advice;
- claiming precise body-fat estimates from a photo;
- users under 18;
- realtime voice, movement-video analysis, wearables, or medical-record connections;
- a coach marketplace or 24/7 human care;
- full payment hardening (tax, dunning, regional experiments), which is Phase 5b;
- a second product difference between regions beyond default language and list currency (D12);
- outcome guarantees or medical claims.

## 8. Primary user journey

1. Momentum chooses the product version from IP: Iran → Persian + IRR; otherwise English + USD.
2. On account creation that version is stored as `product_region` and does not change with later IP.
3. The user creates and verifies an account.
4. Basics collect name, date of birth (18+), and residence as profile data. Under-18 stops. Product region is not an AI gate.
5. Health exclusions (pregnancy, eating-disorder, high-risk) run before health-data consent. A blocked result shows a human path and does not collect food, training, or body data.
6. Versioned terms, privacy, and health-data consent.
7. Goal, food (governed allergen picker), training, and optional manual body values.
8. Review: payment method (not charged), D1 gift reservation when budget remains, then one monthly generation.
9. The backend calculates deterministic targets and retrieves governed catalog candidates. The active catalog must be reviewed `momentum-core@v2` or later.
10. AI produces a schema-constrained draft. Validators approve, normalize, or reject it; they never call a second model.
11. The user follows and logs the saved plan. Check-ins feed the next monthly snapshot and do not trigger separate AI calls.
12. Cycle 2 requires the one paid subscription. The user can export the plan and request download or deletion.

Iranian and international accounts use the same funnel. The only regional difference is default language and list currency (D12).

### Monthly generation contract

1. **Month one:** after onboarding, safety/eligibility checks, payment method on file, and valid entitlement, the server creates exactly one combined workout-and-nutrition generation job. Public generation requires catalog `momentum-core@v2` or a later reviewed release.
2. Validated output is automatically imported and activated only after schema, safety, catalog, and unit checks pass.
3. During the month, workout, meal, weight, measurement, adherence, and check-in logs build period outcomes without making additional AI calls.
4. **Month two and later:** the server first verifies an active subscription, then builds a structured snapshot from the original onboarding data, active prior plan, prior-period outcomes, profile changes, and safety signals.
5. Exactly one idempotent generation job is created for the new period. Its validated result is automatically imported with the next period's start date.
6. No active subscription means no generation job. Provider or validation failure
   leaves the prior stored plan intact. After provider start, replay only reads or
   reconciles the original job and never invokes a second provider execution.
7. The product contains no AI chat, coach messages, conversational prompt, on-demand AI adjustment, or turn quota. Only one bounded next-cycle note may join the same monthly request.
8. The first-month gift is controlled by server-owned campaign status, total budget, allowed markets, and a conservative atomic reservation. Exhaustion stops new free jobs without revoking existing reservations or saved plans.
9. A cycle begins only after successful validation, import, and activation. The server records `ready_at`, sets `starts_at = ready_at`, and derives `ends_at` one user-timezone calendar month later. Calendar-month and billing boundaries do not move an active cycle.

## 9. Functional requirements

| ID | Requirement | Acceptance summary |
| --- | --- | --- |
| FR-01 | Account lifecycle | Secure session, email verification, recovery, and all-device sign-out |
| FR-02 | Data isolation | No normal user can access another user's rows; automated RLS tests pass |
| FR-03 | Onboarding | Resumable draft; completion requires mandatory fields and consent |
| FR-04 | Eligibility | Age and safety screen are enforced before every AI request; `product_region` is sticky locale+currency, not an AI gate |
| FR-05 | Plan versioning | Every change creates a timestamped version, source, and reason |
| FR-06 | Workout plan | Day, exercise, set, rep/time, rest, equipment, and substitution data |
| FR-07 | Nutrition plan | Governed food IDs, targets, substitutions, and allergen warnings |
| FR-08 | Weekly report | Optional but prominent weekly general report; no AI; current month unchanged |
| FR-09 | Monthly generation | One queued job per entitled monthly cycle; transient failures retry with delay; 3-minute wait timeout then user retry; allowance consumed only after successful import |
| FR-10 | Export | Export derives from saved validated data, never fresh generation |
| FR-11 | Localization | Primary journeys work in Persian and English without exposing writing-direction implementation terms |
| FR-12 | Pricing | List currency follows sticky `product_region` (`ir`=IRR, `intl`=USD); language toggle cannot change price |
| FR-13 | Privacy | Consent, download, and deletion controls are accessible in account settings |
| FR-14 | Observability | Model, feature, tokens, latency, validation, and cost estimate recorded per AI call |
| FR-15 | Safety | Blocked cases return safe copy, a reason code, and an escalation path |
| FR-16 | Cycle boundary | `ready_at` is written only after valid import; countdowns and next-cycle eligibility derive from it |
| FR-17 | First-plan gift | Reservation is atomic, budget-aware and once per eligible person; exhaustion routes to Preview/subscription |
| FR-18 | Next-cycle input | Last weekly report informs gift ending; unpaid users start checkout here; optional bounded note remains |
| FR-19 | Plan access | Valid output and history remain visible; cancellation blocks future generation, not prior-plan access |
| FR-20 | Design coverage | Every one of the 132 canonical semantic states has matching Penpot and Storybook evidence |
| FR-21 | Route integrity | Only canonical router paths are allowed; meal/workout detail, check-ins and lifecycle remain in-page, dialog or sheet states |
| FR-22 | Complete prototype | Eight primary flows are traversable without dead ends, orphan frames or controls without destinations |
| FR-23 | Responsive accessibility | All journeys work in FA/EN, Light/Dark and relevant widths with keyboard, screen reader, reflow and preference fallbacks |
| FR-24 | Payment method before AI | SetupIntent / $0 before provider start; no charge until cycle 2 |
| FR-25 | Governed allergen picker | Allergies are catalog multi-select; free text does not 409 generation; generated meals containing a selected allergen fail closed |
| FR-26 | Catalog v2 | Public generation is allowed only with reviewed `momentum-core@v2` or later |
| FR-27 | Sticky product region | Signup IP writes `profiles.product_region` once (`ir`\|`intl`); later IP does not change it |

## 10. AI requirements

- API credentials remain server-side;
- use the Responses API and versioned Structured Output schemas;
- a planning model handles the single monthly combined workout-and-nutrition job;
- no separate model call is used for body-composition reports; only pre-confirmed values enter the single monthly request;
- the approved model is selected before execution; no fallback or escalation to a second model is allowed in the same cycle;
- prompts state outcome, constraints, available evidence, output schema, and stopping conditions;
- stable prompt prefixes are separated from variable user data;
- month two and later use a structured prior-period snapshot; no conversation transcript exists;
- use `store: false` where supported and appropriate;
- send a pseudonymous safety identifier, never a raw email address;
- no plan is published before schema, catalog, deterministic, and policy validation;
- a provider failure or invalid response must fail closed, not become a user plan.

## 11. Conceptual data model

- identity and account;
- sticky `product_region`, locale defaults, units, and cuisine preference;
- consent and policy versions;
- safety screening and eligibility;
- profile, goal, and constraints;
- body measurements with source metadata;
- exercise, equipment, food, ingredient, and allergen catalogs;
- workout and nutrition plan versions and substitutions;
- workouts, meals, measurements, and check-ins;
- monthly generation cycle, period snapshot, and import status;
- subscription, entitlement, and usage ledger;
- AI request, validation, and safety metadata;
- export and deletion requests.

Unnecessary medical data must not be collected. Sensitive free text should be minimized and have a short, explicit retention period.

## 12. Localization and regional behavior

- Persian and English use appropriate layout, typography, numbers, and dates;
- writing direction follows locale automatically and is never presented as a user-facing label;
- metric/imperial units are independent of language;
- cuisine preference and ingredient availability drive meals, not inferred nationality;
- default UI language and list currency follow sticky `product_region` (`ir` → fa+IRR, `intl` → en+USD);
- calendar and units remain editable; product region is not changed by IP after signup;
- IP is a one-time signup default and is not stored as a raw address;
- eligibility for AI is age, safety, consent, payment method, and entitlement — not geography.

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
- no raw prompts, photos, or health details in general analytics;
- automated writing-direction, mixed-content, timezone, and unit-conversion tests without implementation labels in UI.

## 14. MVP success criteria

- at least 60% of eligible sign-ups complete onboarding;
- at least 70% of generated plans pass validation from the single output;
- zero confirmed unsafe outputs exposed in the pre-launch safety suite;
- zero cross-user RLS access in automated tests and security review;
- p95 variable AI cost remains within the plan envelope;
- users can self-serve export and deletion requests;
- every gate in [Safety and Launch Policy](./SAFETY_AND_LAUNCH_POLICY.md) passes.

## 15. Unresolved implementation and launch gates

- launch company jurisdiction and first supported markets;
- the licensed professionals responsible for exercise and nutrition rule sign-off;
- `product_region` is sticky locale+currency (D12); there is no in-product geo-block. Operator/provider geography remains an ops checklist, not a user-facing wall;
- final retention periods for private report evidence, monthly notes, and safety events;
- payment entities and consumer terms for each region (thin payments 5a are required for generation; the legal entity remains a gate);
- feasible human-support level for the single subscription.

## 16. Canonical screen and state inventory

The complete design ledger is the
[Canonical Screen and State Inventory](./SCREEN-STATE-INVENTORY.md). It contains
exactly 132 semantic states:

| Area | Count |
| --- | ---: |
| Public | 14 |
| Authentication | 18 |
| Onboarding | 28 |
| Entitlement and monthly lifecycle | 20 |
| Today | 12 |
| Plan | 14 |
| Daily meal/workout execution | 10 |
| Progress | 7 |
| Me, Settings and Account Data | 9 |
| **Total** | **132** |

Locale, appearance, viewport and accessibility preferences are required test
dimensions, not additional semantic states. A component specimen, explanatory
card or state label is not a complete screen. Every ID defines context, primary
action, back/dismiss behavior, transition, recovery and announcement.

Canonical paths are limited to public/legal/auth, the eight onboarding steps,
the four Today/Plan/Progress/Me destinations, Account Data and Settings. Meal
detail, workout execution, check-ins, grocery/calendar, subscription and monthly
lifecycle are designed within their parent path. No imagined route is allowed.

## 17. Responsive, localization and accessibility contract

- Compact uses 390px as its reference and validates down to 320px; Medium uses
  768px; Expanded uses 1440px. Implementation must reflow continuously between.
- Penpot provides Compact and Expanded compositions for every shell and complex
  task. Navigation changes, dense forms, charts and tables also have Medium evidence.
- Storybook exposes deterministic fixtures for all 132 states in Persian/English
  and Light/Dark; width-sensitive states cover Compact/Medium/Expanded.
- Weekdays, Persian digits, dates, times, units, emails and mixed-script strings
  do not overflow or lose semantic order. Locale controls direction without a
  user-facing technical direction label.
- Interactive targets are at least 44×44; visible focus, logical reading order,
  accessible names/states, 200% zoom reflow, large text, reduced motion and
  reduced transparency are required.
- Every chart has an equivalent text summary and data table; color is never the
  sole carrier of meaning.
- Liquid Glass is restricted to navigation and temporary overlays. Forms,
  content cards, alerts, plan rows and health information are opaque and have
  no-glass fallback ambiguity.

## 18. Prototype acceptance

Eight flows—acquisition, first plan, app navigation, daily use, workout, weekly
progress, account control, and renewal/recovery—must be clickable. Each has a
named start, happy path, error/safety branches, terminal state and return path.
Every CTA, Back action, navigation item, sheet and dialog has a destination;
orphan frames and dead ends fail acceptance. The primary happy paths run in
Persian Compact Light and English Expanded Dark, with branch panels using the
same canonical state IDs.

## 19. Design Complete definition of done

Design is complete only when:

1. every one of the 132 IDs has matching Penpot and Storybook evidence;
2. all eight prototypes pass without dead ends;
3. reusable UI uses real instances/variants, auto layout and semantic tokens;
4. loading, empty, offline, stale, error, blocked, success, destructive and
   recovery states are designed;
5. FA/EN, Light/Dark, responsive, long-copy, number/date/unit and accessibility
   evidence is recorded;
6. one subscription, dynamic gift, payment method before generation, early safety order, one combined call, `ready_at`, prior-plan
   preservation, no coach/chat and no separate body AI are identical everywhere;
7. PRD, Inventory, Blueprint, Traceability, Penpot and Storybook have no material
   contradiction or development-blocking `TBD`;
8. the owner closes final review defects and explicitly lifts the production-code lock.

## 20. Development handoff source order

An implementation agent reads the
[Implementation Blueprint](../IMPLEMENTATION-BLUEPRINT.md), this PRD,
[Phase 0 product contract](./PHASE-0-PRODUCT-CONTRACT.md),
[Screen and State Inventory](./SCREEN-STATE-INVENTORY.md),
[Traceability](../TRACEABILITY.md), Penpot and Storybook in that order. A
screenshot alone is never the behavioral contract; state name, route, token,
component anatomy, data invariant and failure policy are all part of the handoff.
