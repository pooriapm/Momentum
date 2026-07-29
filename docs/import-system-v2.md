# Import System v2

## مرز محصول

Momentum مدل هوش مصنوعی، API خارجی، backend، authentication یا database ندارد.
تمام عملیات داخل مرورگر انجام می‌شوند:

1. رجیستری سؤال‌ها فقط اطلاعات گمشده را از کاربر می‌پرسد.
2. مرورگر یک فایل Markdown شخصی تولید می‌کند.
3. کاربر آن را برای ChatGPT یا هر LLM دیگری خارج از Momentum می‌فرستد.
4. مدل خارجی یک JSON با schema `0.2.0` برمی‌گرداند.
5. Momentum فایل را parse، validate، normalize و preview می‌کند.
6. خطاهای قابل‌بازیابی به Completion Wizard می‌روند؛ خطاهای fatal متوقف می‌شوند.
7. Plan Health Score با قواعد قطعی محلی محاسبه می‌شود.

هیچ داده پروفایل یا برنامه برای تولید پرامپت، اعتبارسنجی یا امتیاز سلامت از دستگاه
خارج نمی‌شود.

## جریان Import

```text
File
  -> ImportAdapterRegistry
  -> JSON adapter
  -> deep schema validation
  -> recoverable questions | fatal errors | normalized plan
  -> deterministic health score
  -> user confirmation
  -> local resilient storage
```

`ImportAdapterRegistry` هسته را از فرمت فایل جدا می‌کند. در حال حاضر JSON پشتیبانی
می‌شود. اضافه‌کردن `.mplan` در آینده باید با یک adapter جدید انجام شود که package را
به همان ورودی خام validator تبدیل کند؛ validator، wizard و storage نباید عوض شوند.

ساختار هدف آینده:

```text
Momentum Package (.mplan)
  manifest.json
  plan.json
  foods.json
  recipes.json
  images/
  attachments/
```

## هدف‌های پویا

`defaultTargets` پایه است. adjustmentهای `targetStrategy` به پایه اضافه می‌شوند،
مقادیر منفی نهایی به صفر محدود می‌شوند و `days[].targets` در schema v2 به‌عنوان
manual override در آخر اعمال می‌شود. بنابراین override کاربر همیشه بیشترین اولویت را
دارد.

## سؤال‌های schema-driven

تعریف سؤال شامل path، نوع ورودی، required/optional، بازه، مقدارهای select، متن خطا و
شرط نمایش است. Onboarding پایه، تکمیل Import و تولید پرامپت از همین قرارداد سؤال
استفاده می‌کنند. افزودن سؤال جدید باید ابتدا در رجیستری انجام شود، نه با ساخت صفحه
ثابت جدید.

## اعتبارسنجی و تحلیل

اعتبارسنجی شامل نسخه schema، تاریخ‌ها، range تغذیه، ID تکراری، defaultOptionId،
target strategy، recipe و متن ناامن است. خطای missing که سؤال شناخته‌شده دارد
recoverable است؛ خطاهای تناقضی یا ساختاری fatal هستند.

Plan Health Score تشخیص پزشکی یا خروجی AI نیست. امتیاز صرفاً از قواعد قابل‌توضیح
مانند نوسان کالری، پروتئین نسبت به وزن، فیبر، فاصله وعده‌ها، تنوع و نسبت داده‌های
برآوردی ساخته می‌شود. پیشنهاد اصلاحی آن نیز فقط یک متن محلی برای ارسال دوباره به
مدل خارجی است.
