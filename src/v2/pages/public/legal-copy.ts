import type { AppLocale } from '../../../platform/i18n/catalog'

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }

export interface LegalSection {
  id: string
  title: string
  blocks: LegalBlock[]
}

export interface LegalDocument {
  kicker: string
  title: string
  summary: string
  sections: LegalSection[]
}

const faPrivacy: LegalDocument = {
  kicker: 'حریم خصوصی',
  title: 'اطلاعیه حریم خصوصی',
  summary: 'این متن می‌گوید Momentum چه داده‌ای می‌گیرد، برای چه کاری، کجا می‌ماند، و شما چه کنترلی دارید. نسخه آلفا است. نام شخص حقوقی، نشانی ثبت‌شده و قانون حاکم هنوز در این صفحه درج نشده‌اند.',
  sections: [
    {
      id: 'scope',
      title: 'دامنه این اطلاعیه',
      blocks: [
        { kind: 'p', text: 'این اطلاعیه درباره حساب کاربری، برنامه غذا و تمرین، چک‌این، پیشرفت، و مسیر واردکردن برنامه در وب‌اپ Momentum است. Preview فقط داده نمایشی است و سابقه سلامت شما را ذخیره نمی‌کند.' },
        { kind: 'p', text: 'Momentum پزشک، متخصص تغذیه، یا سرویس اورژانس نیست. این صفحه رضایت‌نامه درمانی نیست.' },
      ],
    },
    {
      id: 'controller',
      title: 'چه کسی داده را اداره می‌کند',
      blocks: [
        { kind: 'p', text: 'تا وقتی نام و نشانی اپراتور در همین صفحه منتشر شود، نمی‌توان این متن را اطلاعیه نهایی یک شخص حقوقی معین دانست. تماس حریم خصوصی، اگر تنظیم شده باشد، در پایان همین صفحه است.' },
        { kind: 'p', text: 'کشور حساب فقط مسیر پرداخت و واحد پول را پیشنهاد می‌کند. زبان رابط جداست و کشور، دسترسی به ثبت‌نام یا ساخت برنامه را نمی‌بندد.' },
      ],
    },
    {
      id: 'who',
      title: 'چه کسانی مشمول‌اند',
      blocks: [
        { kind: 'p', text: 'برنامه‌ریزی خودکار برای افراد ۱۸ سال به بالاست. اگر بفهمیم حساب متعلق به کودک است، برنامه خودکار برای آن حساب ساخته نمی‌شود.' },
      ],
    },
    {
      id: 'data',
      title: 'چه داده‌ای جمع می‌شود',
      blocks: [
        { kind: 'list', items: [
          'حساب: ایمیل، شناسه ورود، و وضعیت تأیید. رمز خام در رابط محصول ذخیره نمی‌شود و نزد ارائه‌دهنده احراز هویت می‌ماند.',
          'پروفایل: نام نمایشی، تاریخ تولد یا سن، جنسیت اگر اعلام کنید، قد، زبان، منطقه زمانی، کشور و واحد اندازه‌گیری.',
          'زمینه برنامه: هدف، برنامه تمرینی، تجهیزات، ترجیح غذایی، حساسیت، و پاسخ‌های غربال ایمنی که خودتان می‌دهید.',
          'سوابق محصول: برنامه ماهانه، انتخاب وعده، ثبت تمرین، چک‌این و روند.',
          'گزارش بدن: فقط اگر خودتان فایل را بارگذاری کنید. اگر مقداری خوانا نباشد، حدس زده نمی‌شود.',
          'فنی: زمان درخواست، نشانه تقریبی کشور برای پیشنهاد زبان، و شناسه ردیابی خطا بدون متن خام سلامت.',
          'تحلیل محصول: پیش‌فرض خاموش است. اگر جداگانه روشن شود، فقط رویداد دسته‌ای است؛ نه ایمیل، نه مقدار وزن، نه متن برنامه.',
        ] },
      ],
    },
    {
      id: 'why',
      title: 'برای چه منظوری',
      blocks: [
        { kind: 'list', items: [
          'ساختن و نگهداشتن حساب و جلسه ورود.',
          'غربال ایمنی و ساخت یا نمایش برنامه ماهانه غذا و تمرین.',
          'ثبت انتخاب شما، چک‌این، و نشان‌دادن روند.',
          'جلوگیری از سوءاستفاده، سهمیه، و خطای امنیتی.',
          'خروجی یا حذف حساب، وقتی خودتان بخواهید.',
        ] },
        { kind: 'p', text: 'داده سلامت برای تبلیغات هدفمند فروخته یا استفاده نمی‌شود. پرداخت زنده فعال نیست و داده کارت بانکی گرفته نمی‌شود.' },
      ],
    },
    {
      id: 'ai',
      title: 'هوش مصنوعی و پردازشگرها',
      blocks: [
        { kind: 'p', text: 'ساخت برنامه فقط از سرور انجام می‌شود. کلید ارائه‌دهنده وارد مرورگر نمی‌شود. به پرامپت برنامه، ایمیل و نام شما فرستاده نمی‌شود؛ زمینه ساخت‌یافته و حداقلی فرستاده می‌شود.' },
        { kind: 'p', text: 'خروجی قبل از ذخیره از نظر شکل و محدوده بررسی می‌شود. این بررسی دقت پزشکی یا نتیجه بدنی را تضمین نمی‌کند.' },
        { kind: 'p', text: 'ارائه‌دهنده مدل ممکن است، طبق سیاست خودش، گزارش سوءاستفاده را تا حدود ۳۰ روز نگه دارد. این برابر با «هیچ داده‌ای ذخیره نمی‌شود» نیست. زیرساخت حساب روی Supabase است. فهرست قراردادی پردازشگرها وقتی پرداخت یا عرضه عمومی فعال شود باید جداگانه منتشر شود.' },
      ],
    },
    {
      id: 'import',
      title: 'مسیر رایگان و ابزار بیرونی',
      blocks: [
        { kind: 'p', text: 'اگر برنامه را خودتان بیاورید، پرامپت در مرورگر شما ساخته می‌شود و Momentum آن را به ابزار دیگری نمی‌فرستد. اگر متن را کپی کنید، از آن لحظه تابع سیاست همان ابزار است.' },
        { kind: 'p', text: 'Momentum فقط فایل ساختاریافته‌ای را که برمی‌گردانید، پس از اعتبارسنجی، به همراه دسته کلی منبع نگه می‌دارد. مسئول انتخاب ابزار بیرونی خودتان هستید.' },
      ],
    },
    {
      id: 'storage',
      title: 'کجا می‌ماند',
      blocks: [
        { kind: 'p', text: 'سابقه حساب و برنامه در پایگاه داده و، برای فایل گزارش، در فضای خصوصی سمت سرور است. روی دستگاه، جلسه ورود و ترجیح غیرحساس رابط، مثل زبان و تم، ممکن است بماند. داده سلامت در حالت آفلاین روی دستگاه صف نمی‌شود.' },
        { kind: 'p', text: 'Preview داده ساختگی است و سابقه سلامت یا تجاری را ماندگار نمی‌کند.' },
      ],
    },
    {
      id: 'rights',
      title: 'نگهداری، خروجی و حذف',
      blocks: [
        { kind: 'p', text: 'از داخل حساب می‌توانید داده را اصلاح کنید، گزارش اختیاری را بردارید، خروجی بگیرید، یا حذف حساب را بخواهید. حذف، جلسه را هم بی‌اعتبار می‌کند. نسخه پشتیبان ممکن است تا چرخه پاک‌سازی عملیاتی بماند؛ جزئیات زمان نگهداری پشتیبان پیش از عرضه عمومی باید در همین صفحه قطعی شود.' },
        { kind: 'p', text: 'بسته به قانون محل زندگی‌تان ممکن است حق دسترسی، اصلاح، محدودکردن، اعتراض، یا شکایت نزد مرجع نظارتی داشته باشید. اگر آن حق از ابزار داخل محصول بیشتر باشد، از نشانی تماس بخواهید. برای اثبات هویت ممکن است فقط به همان ایمیل حساب بسنده شود تا داده بیشتری جمع نشود.' },
      ],
    },
    {
      id: 'security',
      title: 'امنیت',
      blocks: [
        { kind: 'p', text: 'انتقال با رمزنگاری مسیر انجام می‌شود و دسترسی پایگاه با سیاست سطح ردیف محدود است. هیچ سامانه‌ای امنیت مطلق ندارد. اگر به نفوذی مشکوک شدید، رمز را عوض کنید و به تماس حریم خصوصی خبر دهید؛ مقدار سلامت، رمز، یا فایل برنامه را در ایمیل نگذارید.' },
      ],
    },
    {
      id: 'transfer',
      title: 'انتقال به خارج از کشور',
      blocks: [
        { kind: 'p', text: 'سرور احراز هویت، پایگاه، یا مدل ممکن است خارج از کشور شما باشد. تا وقتی منطقه ذخیره‌سازی و سازوکار انتقال برای هر بازار رسماً اعلام شود، این صفحه آن منطقه را تضمین نمی‌کند.' },
      ],
    },
    {
      id: 'changes',
      title: 'تغییر این اطلاعیه',
      blocks: [
        { kind: 'p', text: 'تغییر مهم با نسخه جدید مشخص می‌شود. اگر قانون یا طراحی محصول رضایت تازه بخواهد، تا تأیید نسخه جدید، پردازش مشمول آن تغییر ادامه پیدا نمی‌کند. تاریخ نسخه بالای صفحه، نسخه‌ای است که هنگام ثبت‌نام به شما نشان داده شده است.' },
      ],
    },
  ],
}

const enPrivacy: LegalDocument = {
  kicker: 'Privacy',
  title: 'Privacy notice',
  summary: 'This notice explains what Momentum collects, why, where it stays, and what you can do about it. This is an alpha text. The legal entity, registered address, and governing law are not stated here yet.',
  sections: [
    {
      id: 'scope',
      title: 'What this notice covers',
      blocks: [
        { kind: 'p', text: 'It covers the Momentum account, food and training plan, check-ins, progress, and plan import in the web app. Preview uses sample data and does not store your health history.' },
        { kind: 'p', text: 'Momentum is not a physician, dietitian, or emergency service. This page is not a consent form for treatment.' },
      ],
    },
    {
      id: 'controller',
      title: 'Who handles the data',
      blocks: [
        { kind: 'p', text: 'Until the operator’s name and address are published on this page, this text is not the final notice of a named legal entity. The privacy contact, if one is configured, is at the end of this page.' },
        { kind: 'p', text: 'Account country only suggests a payment route and currency. Interface language is separate. Country does not block sign-up or plan creation.' },
      ],
    },
    {
      id: 'who',
      title: 'Who this applies to',
      blocks: [
        { kind: 'p', text: 'Automated planning is for people aged 18 or older. If we learn an account belongs to a child, that account does not receive an automated plan.' },
      ],
    },
    {
      id: 'data',
      title: 'What is collected',
      blocks: [
        { kind: 'list', items: [
          'Account: email, sign-in identifier, and verification state. The raw password is not stored in the product interface; the authentication provider holds it.',
          'Profile: display name, date of birth or age, sex if you provide it, height, language, time zone, country, and units.',
          'Planning context: goal, training schedule, equipment, food preferences, allergies, and the safety answers you give.',
          'Product records: the monthly plan, meal choices, workout logs, check-ins, and trend.',
          'Body report: only if you upload a file. Unreadable values are not guessed.',
          'Technical: request time, a coarse country hint used to suggest a language, and an error trace id that does not carry raw health text.',
          'Product analytics: off unless you turn it on. If enabled, events are categorical. They do not include email, raw weight, or plan text.',
        ] },
      ],
    },
    {
      id: 'why',
      title: 'Why it is used',
      blocks: [
        { kind: 'list', items: [
          'To create and keep your account and session.',
          'To screen safety and to build or show a monthly food and training plan.',
          'To record what you choose, check in, and show a trend.',
          'To limit abuse, enforce quota, and investigate security faults.',
          'To export or delete the account when you ask.',
        ] },
        { kind: 'p', text: 'Health data is not sold or used for targeted advertising. Live payment is off, and card data is not collected.' },
      ],
    },
    {
      id: 'ai',
      title: 'AI and processors',
      blocks: [
        { kind: 'p', text: 'Plan generation runs only on the server. The provider key never enters the browser. Email and name are not placed in the plan prompt. The prompt carries a minimized structured context.' },
        { kind: 'p', text: 'Output is checked for shape and range before it is stored. That check does not guarantee medical accuracy or a body result.' },
        { kind: 'p', text: 'The model provider may keep abuse-monitoring logs for up to about 30 days under its own policy. That is not the same as “no data is stored.” Account infrastructure runs on Supabase. A contractual processor list must be published before public launch or live payment.' },
      ],
    },
    {
      id: 'import',
      title: 'Free path and outside tools',
      blocks: [
        { kind: 'p', text: 'If you bring your own plan, the prompt is built in your browser. Momentum does not send it to another tool. If you copy it, that tool’s policy applies from then on.' },
        { kind: 'p', text: 'Momentum keeps the structured file you return, after validation, plus a general source category. You choose the outside tool.' },
      ],
    },
    {
      id: 'storage',
      title: 'Where it stays',
      blocks: [
        { kind: 'p', text: 'Account and plan records live in the database and, for a report file, in private server storage. The device may keep the sign-in session and non-sensitive interface choices such as language and theme. Health data is not queued on the device while offline.' },
        { kind: 'p', text: 'Preview is fabricated data. It does not persist a health or commercial record.' },
      ],
    },
    {
      id: 'rights',
      title: 'Retention, export, and deletion',
      blocks: [
        { kind: 'p', text: 'Inside the account you can correct data, remove an optional report, export, or ask for deletion. Deletion also revokes the session. A backup may remain until the operational purge cycle. Backup timing must be fixed on this page before public launch.' },
        { kind: 'p', text: 'Your local law may add rights to access, correct, restrict, object, or complain to a regulator. If that right goes beyond the in-product tools, use the contact address. Identity checks should stay limited to the account email so we do not collect more than we need.' },
      ],
    },
    {
      id: 'security',
      title: 'Security',
      blocks: [
        { kind: 'p', text: 'Traffic is encrypted in transit and database access is limited by row-level policy. No system is perfectly secure. If you suspect a breach, change your password and write to the privacy contact. Do not put health values, passwords, or plan files in that email.' },
      ],
    },
    {
      id: 'transfer',
      title: 'Transfers outside your country',
      blocks: [
        { kind: 'p', text: 'Authentication, the database, or the model may run outside your country. Until the storage region and transfer mechanism are stated for a market, this page does not promise a region.' },
      ],
    },
    {
      id: 'changes',
      title: 'Changes to this notice',
      blocks: [
        { kind: 'p', text: 'A material change is marked with a new version. Where the law or the product design requires fresh consent, processing covered by that change waits for the new version. The version at the top is the one shown when you accept.' },
      ],
    },
  ],
}

const faTerms: LegalDocument = {
  kicker: 'شرایط',
  title: 'شرایط استفاده',
  summary: 'با ساخت حساب، این شرایط را برای نسخه آلفای Momentum می‌پذیرید. پرداخت زنده نیست. قانون حاکم و مرجع حل اختلاف هنوز انتخاب نشده‌اند و حقوق الزامی مصرف‌کننده ساقط نمی‌شود.',
  sections: [
    {
      id: 'agreement',
      title: 'پذیرش',
      blocks: [
        { kind: 'p', text: 'این شرایط قرارداد استفاده از وب‌اپ در وضعیت فعلی آن است. اگر با آن موافق نیستید، حساب نسازید. اطلاعیه حریم خصوصی جداست و جزء همین شرایط است.' },
        { kind: 'p', text: 'نسخه بالای صفحه، نسخه‌ای است که هنگام ثبت‌نام تأیید می‌کنید. ادامه استفاده بعد از اعلام نسخه جدید، در حدی که قانون اجازه دهد، به معنی پذیرش همان نسخه است. اگر رضایت تازه لازم باشد، محصول خودش جلوی ادامه را می‌گیرد.' },
      ],
    },
    {
      id: 'eligibility',
      title: 'صلاحیت',
      blocks: [
        { kind: 'p', text: 'باید ۱۸ سال یا بیشتر داشته باشید و اطلاعات صلاحیت را درست بدهید. حساب را به کسی نسپارید و از حساب دیگری برای داده سلامت او، بدون رضایت معتبر، استفاده نکنید.' },
        { kind: 'p', text: 'رمز را محافظت کنید. اگر گمان می‌کنید شخص دیگری وارد شده، رمز را عوض کنید و به پشتیبانی بگویید.' },
      ],
    },
    {
      id: 'nature',
      title: 'ماهیت سرویس',
      blocks: [
        { kind: 'p', text: 'Momentum ابزار سامان‌دادن غذا، تمرین، و روند برای سلامت عمومی است. تشخیص نمی‌دهد، درمان نمی‌کند، رژیم درمانی تجویز نمی‌کند، آسیب را بازتوانی نمی‌کند، و نتیجه وزن، ترکیب بدن، یا عملکرد را تضمین نمی‌کند.' },
        { kind: 'p', text: 'اورژانس نیست و پایش لحظه‌ای بالینی ندارد. علامت شدید، خطر فوری، یا فکر آسیب به خود را با خدمات اورژانس یا بحران محل زندگی‌تان مطرح کنید، نه با این برنامه.' },
        { kind: 'p', text: 'اگر باردارید، شیردهی می‌کنید، نگرانی اختلال خوردن دارید، آسیب دارید، دارو می‌خورید، یا پزشک محدودیتی گذاشته، قبل از عمل به برنامه با متخصص واجد شرایط حرف بزنید. غربال محصول بعضی مسیرها را از تولید خودکار خارج می‌کند؛ این جایگزینی برای مراجعه نیست.' },
      ],
    },
    {
      id: 'plan',
      title: 'برنامه و ثبت‌ها',
      blocks: [
        { kind: 'p', text: 'هر دوره، پس از آماده و وارد شدن برنامه، ۳۰ روز است و بیش از یک ساخت کامل برنامه غذا و تمرین در همان دوره ندارد. چک‌این و جایگزینی وعده یا حرکت، برنامه همان ماه را از نو نمی‌سازد.' },
        { kind: 'p', text: 'مقدار تغذیه ممکن است برآورد باشد. مسئول بررسی مواد، حساسیت، اندازه وعده، تجهیزات، و توانایی خودتان برای اجرای حرکت هستید.' },
      ],
    },
    {
      id: 'ai',
      title: 'خروجی هوش مصنوعی',
      blocks: [
        { kind: 'p', text: 'خروجی می‌تواند ناقص، نامناسب، یا برای شما ناامن باشد. اعتبارسنجی ساختاری خطر را کم می‌کند و خروجی را توصیه پزشکی نمی‌کند.' },
        { kind: 'p', text: 'ممکن است ساخت برنامه به دلیل ایمنی، سهمیه، خطا، یا خاموش‌بودن قابلیت رد یا به تأخیر بیفتد. برنامه معتبر قبلی، اگر وجود داشته باشد، برای خواندن می‌ماند.' },
      ],
    },
    {
      id: 'import',
      title: 'مسیر رایگان',
      blocks: [
        { kind: 'p', text: 'آوردن برنامه خودتان اشتراک نمی‌خواهد. انتخاب ابزار بیرونی و رعایت شرایط آن با شماست. Momentum پیش از فعال‌سازی، فایل را با قرارداد داده و حد ایمنی خودش بررسی می‌کند و می‌تواند فایل نامعتبر را نپذیرد.' },
      ],
    },
    {
      id: 'use',
      title: 'استفاده مجاز',
      blocks: [
        { kind: 'p', text: 'نباید قانون، حقوق دیگری، یا کنترل ایمنی و سهمیه را دور بزنید. نباید از محصول برای تشخیص، محدودکردن خطرناک غذا، ترویج آسیب، یا دور زدن دستور متخصص استفاده کنید. نباید خروجی را به‌عنوان توصیه بالینی تأییدشده معرفی کنید، حساب دیگران را بکاید، یا سرویس را مختل کنید.' },
      ],
    },
    {
      id: 'content',
      title: 'محتوای شما',
      blocks: [
        { kind: 'p', text: 'حقی که خودتان بر داده و فایل بارگذاری‌شده دارید باقی می‌ماند. فقط اجازه می‌دهید همان داده برای میزبانی، امنیت، و ساخت تجربه‌ای که خواسته‌اید، از جمله از راه پردازشگرهای لازم، به کار برود. اعلام می‌کنید حق و، اگر داده درباره شخص دیگری است، رضایت لازم را دارید.' },
      ],
    },
    {
      id: 'ip',
      title: 'مالکیت فکری',
      blocks: [
        { kind: 'p', text: 'نام، نشانه، نرم‌افزار، و متن غیرکاربری Momentum متعلق به دارنده حق آن است. این شرایط حق بر مدل، قلم، یا کاتالوگ شخص ثالث نمی‌دهد. خروجی را می‌توانید برای استفاده شخصی خودتان به کار ببرید، نه برای بازفروش به‌عنوان خدمات پزشکی.' },
      ],
    },
    {
      id: 'pay',
      title: 'پرداخت',
      blocks: [
        { kind: 'p', text: 'پرداخت زنده فعال نیست. قیمتی که می‌بینید پیشنهاد محصول است، نه ایجاب خرید و نه مجوز برداشت. تا وقتی شرایط فروشنده، مالیات، تمدید، لغو، و بازپرداخت جداگانه و پیش از پرداخت منتشر شود، هیچ اشتراک پولی با این متن بسته نمی‌شود.' },
        { kind: 'p', text: 'هدیه برنامه اول، اگر باشد، فقط وقتی بودجه کمپین هست و رزرو موفق شود داده می‌شود. تضمین دائمی نیست.' },
      ],
    },
    {
      id: 'availability',
      title: 'دسترس‌پذیری',
      blocks: [
        { kind: 'p', text: 'سرویس آلفا ممکن است قطع، کند، یا عوض شود. تغییر برای ایمنی، امنیت، قانون، یا محدودیت ارائه‌دهنده مجاز است. سطح خدمت پولی و جبران قطعی در این نسخه وعده نشده است.' },
      ],
    },
    {
      id: 'end',
      title: 'تعلیق و پایان',
      blocks: [
        { kind: 'p', text: 'اگر این شرایط یا ایمنی نقض شود، دسترسی می‌تواند محدود شود. ابزار حریم خصوصی، از جمله درخواست حذف، در حد امکان بعد از محدودیت قابلیت هوش مصنوعی هم می‌ماند. شما هر وقت بخواهید می‌توانید استفاده را متوقف و حذف حساب را درخواست کنید.' },
      ],
    },
    {
      id: 'liability',
      title: 'مسئولیت و اختلاف',
      blocks: [
        { kind: 'p', text: 'سقف مسئولیت، داوری اجباری، و اسقاط دعوای جمعی در این متن تصویب نشده است. این بندها به کشور و قانون مصرف‌کننده وابسته‌اند و نباید با یک قالب عمومی جعل شوند.' },
        { kind: 'p', text: 'حقوقی که قانون محل زندگی‌تان اجازه اسقاطشان را نمی‌دهد، با این شرایط ساقط نمی‌شود. تا اعلام قانون حاکم، اختلاف تابع همان قانون امری است که بر رابطه شما اعمال می‌شود، نه تابع بند خیالی این صفحه.' },
        { kind: 'p', text: 'در حدی که قانون اجازه دهد، سرویس «همان‌گونه که هست» داده می‌شود و نتیجه بدنی تضمین نمی‌شود. این جمله مسؤولیت ناشی از تقلب یا آسیب عمدی را، جایی که قانون چنین مسؤولیتی را قابل اسقاط نمی‌داند، کم نمی‌کند.' },
      ],
    },
    {
      id: 'changes',
      title: 'تغییر شرایط',
      blocks: [
        { kind: 'p', text: 'تغییر مهم با نسخه تازه و، در صورت لزوم، تأیید دوباره مشخص می‌شود. نسخه قدیمی پس از جایگزینی، مبنای حساب جدید نیست.' },
      ],
    },
  ],
}

const enTerms: LegalDocument = {
  kicker: 'Terms',
  title: 'Terms of use',
  summary: 'Creating an account accepts these terms for the Momentum alpha. Live payment is off. Governing law and venue are not chosen here, and non-waivable consumer rights stay in force.',
  sections: [
    {
      id: 'agreement',
      title: 'Acceptance',
      blocks: [
        { kind: 'p', text: 'These terms are the contract for using the web app as it works today. If you do not agree, do not create an account. The privacy notice is separate and part of this agreement.' },
        { kind: 'p', text: 'The version at the top is the one you accept at sign-up. Where the law allows, continued use after a new version is notice of that version. Where fresh consent is required, the product blocks continuation until you accept.' },
      ],
    },
    {
      id: 'eligibility',
      title: 'Eligibility',
      blocks: [
        { kind: 'p', text: 'You must be 18 or older and give accurate eligibility information. Do not share the account, and do not use someone else’s health profile without valid consent.' },
        { kind: 'p', text: 'Protect the password. If you think someone else signed in, change it and tell support.' },
      ],
    },
    {
      id: 'nature',
      title: 'What the service is',
      blocks: [
        { kind: 'p', text: 'Momentum organizes food, training, and a trend for general wellness. It does not diagnose, treat, prescribe a therapeutic diet, rehabilitate an injury, or guarantee weight, body composition, or performance.' },
        { kind: 'p', text: 'It is not an emergency service and it is not clinically monitored. Severe symptoms, immediate danger, or thoughts of self-harm belong with local emergency or crisis services, not this app.' },
        { kind: 'p', text: 'If you are pregnant, breastfeeding, worried about an eating disorder, injured, on medication, or under a clinician’s limit, talk to a qualified professional before you follow a plan. Product screening can take some paths out of automated generation. That is not a substitute for care.' },
      ],
    },
    {
      id: 'plan',
      title: 'Plans and logs',
      blocks: [
        { kind: 'p', text: 'A period lasts 30 days after a plan is ready and imported, and it allows one complete food-and-training generation. Check-ins and meal or exercise swaps do not rebuild that month’s plan.' },
        { kind: 'p', text: 'Nutrition figures may be estimates. You check ingredients, allergies, portions, equipment, and whether you can perform a movement.' },
      ],
    },
    {
      id: 'ai',
      title: 'AI output',
      blocks: [
        { kind: 'p', text: 'Output can be incomplete, unsuitable, or unsafe for you. Structural checks reduce risk. They do not turn output into medical advice.' },
        { kind: 'p', text: 'Generation may be refused or delayed for safety, quota, faults, or a disabled feature. A previously valid plan, if you have one, stays readable.' },
      ],
    },
    {
      id: 'import',
      title: 'Free path',
      blocks: [
        { kind: 'p', text: 'Bringing your own plan does not require a subscription. You choose the outside tool and follow its terms. Momentum checks the file against its data contract and safety limits before activation, and it may reject an invalid file.' },
      ],
    },
    {
      id: 'use',
      title: 'Acceptable use',
      blocks: [
        { kind: 'p', text: 'Do not break the law, another person’s rights, or safety and quota controls. Do not use the product to seek a diagnosis, promote dangerous restriction or harm, or bypass a professional’s instruction. Do not present output as certified clinical advice, probe other accounts, or disrupt the service.' },
      ],
    },
    {
      id: 'content',
      title: 'Your content',
      blocks: [
        { kind: 'p', text: 'You keep the rights you already have in data and files you upload. You allow that data to be hosted, secured, and used to provide the experience you asked for, including through necessary processors. You represent that you have the rights and, if the data is about someone else, the consent required.' },
      ],
    },
    {
      id: 'ip',
      title: 'Intellectual property',
      blocks: [
        { kind: 'p', text: 'Momentum’s name, mark, software, and non-user text belong to their rights holder. These terms do not grant rights in a third-party model, font, or catalog. You may use output for your own personal use, not to resell it as medical care.' },
      ],
    },
    {
      id: 'pay',
      title: 'Payment',
      blocks: [
        { kind: 'p', text: 'Live payment is off. A price you see is a product hypothesis, not an offer and not authority to charge a card. No paid subscription is formed under this text until merchant, tax, renewal, cancellation, and refund terms are published before checkout.' },
        { kind: 'p', text: 'A first-plan gift, if offered, exists only while campaign budget remains and the reservation succeeds. It is not a permanent promise.' },
      ],
    },
    {
      id: 'availability',
      title: 'Availability',
      blocks: [
        { kind: 'p', text: 'An alpha service may stop, slow, or change. Changes for safety, security, law, or a provider limit are allowed. This version promises no paid service level and no outage credit.' },
      ],
    },
    {
      id: 'end',
      title: 'Suspension and ending',
      blocks: [
        { kind: 'p', text: 'Access may be limited if these terms or a safety rule are broken. Privacy tools, including a deletion request, remain available as far as possible after an AI feature is limited. You may stop and request deletion at any time.' },
      ],
    },
    {
      id: 'liability',
      title: 'Liability and disputes',
      blocks: [
        { kind: 'p', text: 'This text does not approve a liability cap, forced arbitration, or a class-action waiver. Those clauses depend on country and consumer law and must not be invented with a generic template.' },
        { kind: 'p', text: 'Rights your local law does not allow you to waive remain in force. Until a governing law is stated, a dispute follows the mandatory law that already applies to you, not a fictional clause on this page.' },
        { kind: 'p', text: 'To the extent the law allows, the service is provided as it is, and a body outcome is not guaranteed. That sentence does not reduce liability for fraud or intentional harm where the law says such liability cannot be waived.' },
      ],
    },
    {
      id: 'changes',
      title: 'Changes',
      blocks: [
        { kind: 'p', text: 'A material change is marked with a new version and, where required, a fresh acceptance. An old version is not the basis of a new account after it is replaced.' },
      ],
    },
  ],
}

const faSafety: LegalDocument = {
  kicker: 'ایمنی',
  title: 'مرز ایمنی',
  summary: 'این صفحه قرارداد نیست. می‌گوید چه وقت باید برنامه را کنار بگذارید و به خدمات واقعی مراجعه کنید.',
  sections: [
    {
      id: 'emergency',
      title: 'اورژانس',
      blocks: [
        { kind: 'p', text: 'Momentum پایش اورژانس ندارد. درد قفسه سینه، تنگی نفس، غش، علامت سکته، واکنش حساسیت شدید، یا فکر آسیب به خود را با اورژانس یا خط بحران محل زندگی‌تان در میان بگذارید.' },
      ],
    },
    {
      id: 'who',
      title: 'چه کسی برنامه خودکار نمی‌گیرد',
      blocks: [
        { kind: 'p', text: 'زیر ۱۸ سال، بارداری و شیردهی در مسیر پرریسک، نگرانی اختلال خوردن، و شرایطی که غربال محصول پرخطر بداند از تولید خودکار خارج می‌شوند. این ارجاع، ویزیت نیست.' },
      ],
    },
    {
      id: 'food',
      title: 'غذا',
      blocks: [
        { kind: 'p', text: 'مقدارها ممکن است برآورد باشند. مواد، حساسیت، و اندازه وعده را خودتان تطبیق دهید. اگر پزشک رژیم درمانی داده، همان مقدم است.' },
      ],
    },
    {
      id: 'train',
      title: 'تمرین',
      blocks: [
        { kind: 'p', text: 'درد غیرعادی، سرگیجه، یا تکنیکی که بلد نیستید دلیل توقف است. جایگزین حرکت فقط الگوی حرکتی را عوض می‌کند و آسیب را درمان نمی‌کند. تداوم روزها امتیاز نیست و انجام‌ندادن شکست حساب نمی‌شود.' },
      ],
    },
    {
      id: 'report',
      title: 'گزارش بدن',
      blocks: [
        { kind: 'p', text: 'فایل گزارش اختیاری و خصوصی است. مقدار ناخوانا حدس زده نمی‌شود و فایل به‌خودی‌خود تحلیل پزشکی نمی‌شود.' },
      ],
    },
  ],
}

const enSafety: LegalDocument = {
  kicker: 'Safety',
  title: 'Safety boundary',
  summary: 'This page is not a contract. It says when to leave the plan and use real-world care.',
  sections: [
    {
      id: 'emergency',
      title: 'Emergencies',
      blocks: [
        { kind: 'p', text: 'Momentum does not monitor emergencies. Chest pain, trouble breathing, fainting, stroke signs, a severe allergic reaction, or thoughts of self-harm belong with local emergency or crisis services.' },
      ],
    },
    {
      id: 'who',
      title: 'Who does not get an automated plan',
      blocks: [
        { kind: 'p', text: 'Under 18, higher-risk pregnancy or breastfeeding, eating-disorder concern, and conditions the product screen treats as higher risk stay out of automated generation. That referral is not a visit.' },
      ],
    },
    {
      id: 'food',
      title: 'Food',
      blocks: [
        { kind: 'p', text: 'Figures may be estimates. You match ingredients, allergies, and portions. A clinician’s therapeutic diet comes first.' },
      ],
    },
    {
      id: 'train',
      title: 'Training',
      blocks: [
        { kind: 'p', text: 'Unusual pain, dizziness, or a movement you cannot perform is a reason to stop. A substitute changes the movement pattern. It does not treat an injury. A streak is not a score, and skipping a day is not a failed account.' },
      ],
    },
    {
      id: 'report',
      title: 'Body reports',
      blocks: [
        { kind: 'p', text: 'A report file is optional and private. Unreadable values are not guessed, and the file is not given an automatic medical reading.' },
      ],
    },
  ],
}

export function legalDocument(kind: 'privacy' | 'terms' | 'safety', locale: AppLocale): LegalDocument {
  if (kind === 'privacy') return locale === 'fa' ? faPrivacy : enPrivacy
  if (kind === 'terms') return locale === 'fa' ? faTerms : enTerms
  return locale === 'fa' ? faSafety : enSafety
}
