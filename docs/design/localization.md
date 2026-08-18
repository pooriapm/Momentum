# Localization, Direction, and Regionalization

## Product versions (D12)

Momentum has two product versions. The only regional difference is default
language and list currency.

| `product_region` | Default UI | List currency |
| --- | --- | --- |
| `ir` | Persian (`fa`, RTL) | IRR |
| `intl` | English (`en`, LTR) | USD |

Anonymous visitors receive a temporary version from server-side IP (Iran vs not
Iran). At account creation that value is stored on `profiles.product_region`
with source `ip_at_signup` and `product_region_locked_at`. Later IP, VPN, or
travel must not update it. Admin may correct a mis-assigned row. Raw IP is not
stored.

Calendar, units, timezone, and cuisine remain independent preferences. They
default with the version but can be edited. List currency and default language
follow the locked region, not a later language toggle or IP change.

QA still covers mixed bidi and calendar combinations. The shipped product
versions are `ir` and `intl` as above.

## Independent preferences

Momentum stores these values independently except where D12 binds them:

```text
product_region: ir | intl          # sticky; IP writes once at signup
language: fa | en                  # defaults from product_region
currency: IRR | USD                # list currency from product_region
foodLocale: one or more culinary catalog identifiers
calendar: persian | gregorian
unitSystem: metric | imperial
timeZone: IANA time-zone identifier
firstDayOfWeek: locale/user preference
```

Language determines copy and default direction. It must not independently
change list currency. Cuisine catalog is not inferred from IP after signup.

## Translation architecture

UI copy uses stable semantic keys, for example:

```text
nav.today
today.nextAction.title
monthlyPlan.status.imported
pricing.billing.monthly
bodyComposition.bodyFat.label
```

Do not use Persian or English source sentences as keys. Feature code must not
concatenate translated fragments. Interpolation values remain typed and plural,
gender, and select behavior uses ICU MessageFormat or an equivalent formatter.

Copy separates:

- UI labels and messages, owned by localization files;
- canonical domain codes, stored language-neutral;
- generated plan content, stored with an explicit language;
- localized catalog content, linked by stable IDs;
- legal/pricing copy, versioned by locale and market.

Fallback order is exact locale, base language, then English. Missing production
translations are logged and visibly fail in localization QA; the user must not
see raw keys.

## Direction

The root `lang` and `dir` change together when language changes. Components use
logical concepts and properties:

- `margin-inline-start/end` rather than left/right;
- `padding-inline` and `border-inline`;
- `inset-inline-start/end` for positioned elements;
- `text-align: start` by default;
- semantic `leading`/`trailing` slots in native APIs.

Component DOM/view order follows semantic reading order. Do not reverse arrays
to simulate RTL. Flex/grid direction and platform layout direction perform the
visual placement.

### Bidi isolation

Usernames, email, plan IDs, coupon codes, times, measurements, and mixed-language
food names must be isolated with `bdi`, Unicode isolation, or native equivalents.
Do not insert manual left-to-right/right-to-left marks into stored data.

Inputs choose direction by meaning:

- email, URL, coupon, and machine IDs: LTR;
- natural language: surrounding UI direction;
- numeric fields: locale-formatted visual value with a canonical numeric model;

## Mirroring

Mirror directional arrows, chevrons, progress direction, undo/redo, send, and
reading-order affordances. Do not mirror the logo, charts with chronological
x-axis semantics, clocks, media icons, checkmarks, fitness objects, or photos.

For chart axes, chronological progression follows the locale's reading convention
only when the chart library and labels remain unambiguous. A consistent oldest-
to-newest axis may be retained across locales if explicitly labeled and tested.

## Numbers, units, dates, and time

Use locale formatters for presentation and canonical numbers/ISO timestamps for
storage and APIs.

- Accept Persian, Arabic, and Latin digits in numeric fields.
- Do not store localized digit strings as numbers.
- Keep value and unit together under wrapping.
- Convert metric/imperial values at the presentation/edit boundary while storing
  a documented canonical unit.
- Show relative dates only with an accessible absolute date.
- Persian and Gregorian calendars are views over the same canonical date.
- Use the user's IANA time zone for day boundaries and plan scheduling.
- Never infer a user's time zone permanently from IP.

Food quantities use localized unit labels and plural rules. Ingredient catalog
IDs remain stable even when names differ substantially by region.

## Food localization

Food locale affects ranking and availability, not only translation. Each meal
option should reference canonical ingredients plus localized names, preparation
style, common household measures, availability, and price band.

Iranian users should receive familiar staples and cooking constraints without
assuming every Persian speaker lives in Iran. International users may opt into
Iranian cuisine, and Iranian users may select other food locales.

Religious, ethical, allergy, and medical restrictions are explicit preferences;
they must not be inferred from language, name, or region.

## Pricing localization

Pricing comes from server-owned market configuration. UI receives:

```text
market id, currency, amount, billing period, tax display policy,
entitlement set, first-plan gift rules, and effective date
```

The client formats but never converts or calculates a sell price. If IP and saved
pricing region disagree, preserve the saved/billing region and offer support or a
user-initiated region-change flow.

Prices must display currency unambiguously. For rial/toman presentation, label
the unit in words and keep the backend currency/amount canonical to prevent a
tenfold interpretation error.

## Localization QA

- pseudo-localize English to at least 35% expansion;
- run a mirrored-layout pseudo-locale that exposes physical-position assumptions;
- inspect 320px compact and 200% text scale;
- test long Persian compound labels and long English accessibility labels;
- test mixed Persian/English plan names, email, times, and measurements;
- verify mirrored and nonmirrored icon inventory;
- verify first day of week and day boundary across time zones;
- ensure screenshots contain no hard-coded untranslated strings.
