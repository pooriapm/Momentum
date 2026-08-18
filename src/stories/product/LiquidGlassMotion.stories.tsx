import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, ChevronDown, CircleUserRound, Dumbbell, House, Info, Plus, Redo2, Salad, Search, Settings2, Sparkles, Undo2, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { momentumSupportingVariant } from './coverage'
import {
  localeFromStory,
  ProductFrame,
  SpecBadge,
  SpecButton,
  SpecCallout,
  SpecCard,
  SpecFloatingAction,
  SpecHeader,
  SpecOverlay,
  tx,
  type SpecLocale,
} from './ProductSpec'

function GlassInteractionLab({ locale }: { locale: SpecLocale }) {
  const [selected, setSelected] = useState<'today' | 'plan' | 'progress' | 'me'>('today')
  const [panel, setPanel] = useState<'closed' | 'menu' | 'sheet'>('closed')
  const items = [
    { id: 'today' as const, fa: 'امروز', en: 'Today' },
    { id: 'plan' as const, fa: 'برنامه', en: 'Plan' },
    { id: 'progress' as const, fa: 'پیشرفت', en: 'Progress' },
    { id: 'me' as const, fa: 'من', en: 'Me' },
  ]
  return (
    <ProductFrame active={selected} locale={locale} onActiveChange={setSelected} title={tx(locale, 'پیش‌نمایش حرکت شیشه', 'Liquid Glass motion preview')}>
      <SpecHeader eyebrow={tx(locale, 'نمونه تعاملی', 'Interactive specimen')} title={tx(locale, 'شیشه فقط برای کنترل‌های شناور', 'Glass only for floating controls')} body={tx(locale, 'روی نوار انتخاب، دکمه شناور و پنل‌ها کلیک کن. کارت‌ها و داده‌های سلامت عمداً مات و ثابت مانده‌اند.', 'Try the selection bar, floating action, and panels. Content cards and health data intentionally remain opaque and still.')} />
      <div className="mo-spec__glass-demo">
        <div className="mo-spec__demo-toolbar" role="tablist">
          {items.map((item) => <button aria-selected={selected === item.id} className={selected === item.id ? 'is-active' : ''} key={item.id} onClick={() => setSelected(item.id)} role="tab" type="button"><span>{tx(locale, item.fa, item.en)}</span></button>)}
        </div>
        <div className="mo-spec__grid">
          <SpecCard className="is-wide"><SpecBadge tone="brand"><Dumbbell size={14} /> {tx(locale, 'قدم بعدی', 'Next action')}</SpecBadge><h2>{tx(locale, 'قدرت تمام‌بدن', 'Full-body strength')}</h2><p>{tx(locale, 'این محتوای اصلی سطح مات دارد تا خوانایی و ثبات فضایی حفظ شود.', 'This primary content stays opaque for reading comfort and spatial stability.')}</p><SpecButton>{tx(locale, 'شروع تمرین', 'Start workout')}</SpecButton></SpecCard>
          <SpecCard><SpecBadge tone="energy"><Salad size={14} /> {tx(locale, 'ناهار', 'Lunch')}</SpecBadge><h2>{tx(locale, 'مرغ، برنج و سالاد', 'Chicken, rice & salad')}</h2><p>{tx(locale, 'اطلاعات تغذیه روی شیشه قرار نمی‌گیرد.', 'Nutrition data is never placed on glass.')}</p></SpecCard>
        </div>
        <div className="mo-spec__demo-dock"><button onClick={() => setPanel('menu')} type="button"><Settings2 />{tx(locale, 'منوی شیشه‌ای', 'Glass menu')}</button><button onClick={() => setPanel('sheet')} type="button"><Sparkles />{tx(locale, 'پنل پایین', 'Bottom sheet')}</button></div>
      </div>
      <SpecFloatingAction active={panel !== 'closed'} label={tx(locale, 'بازکردن اقدام سریع', 'Open quick action')} onClick={() => setPanel(panel === 'closed' ? 'menu' : 'closed')}>{panel === 'closed' ? <Plus /> : <X />}</SpecFloatingAction>
      {panel === 'menu' ? <div className="mo-spec__demo-popover"><button type="button"><Dumbbell />{tx(locale, 'شروع تمرین', 'Start workout')}</button><button type="button"><Salad />{tx(locale, 'ثبت وعده', 'Log meal')}</button><button onClick={() => setPanel('closed')} type="button"><Check />{tx(locale, 'بستن', 'Close')}</button></div> : null}
      {panel === 'sheet' ? <div className="mo-spec__demo-sheet"><span className="mo-spec__sheet-handle" /><button aria-label={tx(locale, 'بستن', 'Close')} className="mo-spec__overlay-close" onClick={() => setPanel('closed')} type="button"><X /></button><SpecBadge tone="brand">{tx(locale, 'پنل موقت', 'Temporary surface')}</SpecBadge><h2>{tx(locale, 'همان مسیر، همان جهت حرکت', 'Same path in and out')}</h2><p>{tx(locale, 'پنل از پایین وارد می‌شود و هنگام بستن به همان مسیر برمی‌گردد. حرکت با ترجیح کاهش حرکت حذف می‌شود.', 'The sheet enters from below and returns along the same path. Motion is removed when reduced motion is preferred.')}</p></div> : null}
    </ProductFrame>
  )
}

function GlassSheetDemo({ locale }: { locale: SpecLocale }) {
  return <SpecOverlay kind="sheet" locale={locale} title={tx(locale, 'نمونه پنل شیشه‌ای', 'Glass sheet specimen')}><ProductFrame locale={locale} nav={false} title={tx(locale, 'پنل موقت', 'Temporary panel')}><SpecCard><SpecBadge tone="brand">{tx(locale, 'محتوا مات است', 'Content remains opaque')}</SpecBadge><h2>{tx(locale, 'لایه شیشه‌ای قاب و کنترل را حمل می‌کند', 'Glass carries the frame and controls')}</h2><p>{tx(locale, 'درخشش لبه، شکست رنگ ملایم، سایه چندلایه و محوشدگی پس‌زمینه عمق را بدون کاهش خوانایی ایجاد می‌کنند.', 'Specular edge light, restrained tint, layered shadow, and backdrop blur create depth without reducing readability.')}</p><SpecButton>{tx(locale, 'تأیید', 'Confirm')}</SpecButton></SpecCard></ProductFrame></SpecOverlay>
}

function GlassAnatomyDemo({ locale }: { locale: SpecLocale }) {
  const anatomy = [
    tx(locale, 'لایه نیمه‌شفاف با تینت ملایم', 'Translucent core with restrained tint'),
    tx(locale, 'محوشدگی و اشباع پس‌زمینه', 'Backdrop blur and saturation'),
    tx(locale, 'هایلایت طیفی روی لبه بالا', 'Specular highlight on the leading edge'),
    tx(locale, 'لبه تاریک و سایه چندلایه برای عمق', 'Low edge and layered shadow for depth'),
    tx(locale, 'پاسخ موضعی هنگام فشار، بدون درخشش بی‌دلیل', 'Localized press response, without idle shimmer'),
  ]
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'آناتومی Liquid Glass', 'Liquid Glass anatomy')}>
      <SpecHeader eyebrow={tx(locale, 'قرارداد ماتریال', 'Material contract')} title={tx(locale, 'عمق دیدنی، محتوای خوانا', 'Visible depth, readable content')} body={tx(locale, 'شیشه فقط روی کنترل‌ها و لایه‌های موقت قرار می‌گیرد؛ فرم، محتوا، سلامت و تغذیه مات می‌مانند.', 'Glass is reserved for controls and temporary layers; forms, content, health, and nutrition remain opaque.')} />
      <div className="mo-spec__anatomy-grid">
        <div className="mo-spec__anatomy-stage">
          <i /><i /><i /><i />
          <section aria-label={tx(locale, 'نمونه ماتریال شیشه‌ای', 'Glass material specimen')} className="mo-spec__anatomy-slab">
            <span className="mo-spec__brand"><span>●</span><strong>MOMENTUM</strong></span>
            <button aria-label={tx(locale, 'تنظیمات', 'Settings')} type="button"><Settings2 /></button>
          </section>
        </div>
        <ol className="mo-spec__anatomy-list">{anatomy.map((item, index) => <li key={item}><b>{index + 1}</b><span>{item}</span></li>)}</ol>
      </div>
      <SpecCallout icon={<Info />} title={tx(locale, 'مرز اجرا', 'Implementation boundary')} tone="info">{tx(locale, 'اگر لایه نقش محتوای پایدار دارد، شیشه‌ای نمی‌شود. شیشه نشان‌دهنده ناوبری، کنترل یا وضعیت موقت است.', 'If a surface carries durable content, it is not glass. Glass signals navigation, control, or temporary state.')}</SpecCallout>
    </ProductFrame>
  )
}

function QuietBusyDemo({ locale }: { locale: SpecLocale }) {
  const scenes = [
    { busy: false, fa: 'پس‌زمینه آرام', en: 'Quiet background' },
    { busy: true, fa: 'پس‌زمینه پرجزئیات', en: 'Busy background' },
  ]
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'آزمون پس‌زمینه', 'Backdrop stress test')}>
      <SpecHeader eyebrow={tx(locale, 'خوانایی پایدار', 'Stable legibility')} title={tx(locale, 'بازتاب محیط، بدون گم‌شدن کنترل', 'Reflect the scene without losing the control')} body={tx(locale, 'یک ماتریال واحد روی پس‌زمینه آرام و پرجزئیات باید مرز، عمق و کنتراست خود را حفظ کند.', 'The same material must preserve edge, depth, and contrast on both quiet and visually busy scenes.')} />
      <div className="mo-spec__scene-grid">
        {scenes.map((scene) => <article className={`mo-spec__glass-scene ${scene.busy ? 'is-busy' : 'is-quiet'}`} key={scene.en}>
          <span className="mo-spec__scene-label">{tx(locale, scene.fa, scene.en)}</span>
          <div aria-hidden="true" className="mo-spec__scene-art"><i /><i /><i /><i /><i /><i /></div>
          <div className="mo-spec__scene-control"><span><House /><strong>{tx(locale, 'امروز', 'Today')}</strong></span><button aria-label={tx(locale, 'تنظیمات', 'Settings')} type="button"><Settings2 /></button></div>
        </article>)}
      </div>
    </ProductFrame>
  )
}

function PressMorphDemo({ locale }: { locale: SpecLocale }) {
  const [pressed, setPressed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [dragValue, setDragValue] = useState(62)
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'فشار و تغییر شکل', 'Press and shared morph')}>
      <SpecHeader eyebrow={tx(locale, 'حرکت پاسخ‌گو', 'Responsive motion')} title={tx(locale, 'فشار کوتاه، رهاسازی نرم', 'Quick press, soft release')} body={tx(locale, 'فشردگی در ۱۴۰ میلی‌ثانیه قرار می‌گیرد، رهاسازی در ۳۲۰ میلی‌ثانیه می‌نشیند و morph وابسته به منبع حداکثر ۴۲۰ میلی‌ثانیه طول می‌کشد.', 'Compression lands in 140 ms, release settles in 320 ms, and the source-linked morph completes within 420 ms.')} />
      <div className="mo-spec__motion-grid">
        <section className="mo-spec__motion-stage"><span className="mo-spec__scene-label">{tx(locale, 'بازخورد فشار', 'Press feedback')}</span><button aria-pressed={pressed} className={`mo-spec__press-control ${pressed ? 'is-demo-pressed' : ''}`} onClick={() => setPressed((value) => !value)} type="button"><Sparkles /><span>{pressed ? tx(locale, 'رها کن', 'Release') : tx(locale, 'فشار بده', 'Press me')}</span></button></section>
        <section className="mo-spec__motion-stage"><span className="mo-spec__scene-label">{dragging ? tx(locale, 'در حال کشیدن', 'Dragging') : tx(locale, 'کنترل قابل کشیدن', 'Draggable control')}</span><div className={`mo-spec__drag-control ${dragging ? 'is-dragging' : ''}`}><div><strong>{tx(locale, 'شدت تمرین', 'Workout intensity')}</strong><output>{dragValue}%</output></div><input aria-label={tx(locale, 'شدت تمرین', 'Workout intensity')} max="100" min="0" onBlur={() => setDragging(false)} onChange={(event) => setDragValue(Number(event.currentTarget.value))} onPointerCancel={() => setDragging(false)} onPointerDown={() => setDragging(true)} onPointerUp={() => setDragging(false)} style={{ '--range-progress': `${dragValue}%` } as CSSProperties} type="range" value={dragValue} /></div></section>
        <section className="mo-spec__motion-stage"><span className="mo-spec__scene-label">{tx(locale, 'تغییر شکل منبع به پنل', 'Source-to-panel morph')}</span><div className={`mo-spec__morph-control ${expanded ? 'is-expanded' : ''}`}><button aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} type="button"><CircleUserRound /><span>{expanded ? tx(locale, 'بستن اقدام‌ها', 'Close actions') : tx(locale, 'اقدام‌های حساب', 'Account actions')}</span><ChevronDown /></button>{expanded ? <div><button type="button">{tx(locale, 'تنظیمات', 'Settings')}</button><button type="button">{tx(locale, 'خروج امن', 'Secure sign out')}</button></div> : null}</div></section>
      </div>
    </ProductFrame>
  )
}

function PopoverSheetDemo({ locale }: { locale: SpecLocale }) {
  const [surface, setSurface] = useState<'none' | 'source' | 'sheet'>('none')
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'پاپ‌اور و پنل داخلی', 'Popover and inset sheet')}>
      <SpecHeader eyebrow={tx(locale, 'هندسه وابسته به منبع', 'Source-aware geometry')} title={tx(locale, 'سطح موقت از همان کنترل باز می‌شود', 'Temporary surfaces grow from their source')} body={tx(locale, 'پاپ‌اور به دکمه منبع چسبیده و شیت از لبه پایینی قاب وارد می‌شود.', 'The popover stays anchored to its source control; the sheet enters from the lower edge of its containing frame.')} />
      <div className="mo-spec__inset-stage">
        <SpecCard className="is-wide"><SpecBadge tone="brand">{tx(locale, 'برنامه فعال', 'Active plan')}</SpecBadge><h2>{tx(locale, 'قدرت و تعادل', 'Strength & balance')}</h2><p>{tx(locale, 'این محتوا مات و خوانا باقی می‌ماند.', 'This content remains opaque and readable.')}</p></SpecCard>
        <div className="mo-spec__source-anchor"><button aria-expanded={surface === 'source'} className="mo-spec__source-control" onClick={() => setSurface(surface === 'source' ? 'none' : 'source')} type="button"><Info />{tx(locale, 'منبع برنامه', 'Plan source')}<ChevronDown /></button>{surface === 'source' ? <div className="mo-spec__source-popover" role="status"><strong>{tx(locale, 'چرخه ۲ · نسخه ۲', 'Cycle 2 · Version 2')}</strong><p>{tx(locale, 'آماده در ۲۳ مرداد، ۰۸:۴۲', 'Ready Aug 14 at 08:42')}</p></div> : null}</div>
        <button className="mo-spec__sheet-trigger" onClick={() => setSurface('sheet')} type="button"><Sparkles />{tx(locale, 'بازکردن پنل داخلی', 'Open inset sheet')}</button>
        {surface === 'sheet' ? <section aria-label={tx(locale, 'جزئیات موقت', 'Temporary details')} className="mo-spec__inset-sheet"><span className="mo-spec__sheet-handle" /><button aria-label={tx(locale, 'بستن', 'Close')} className="mo-spec__overlay-close" onClick={() => setSurface('none')} type="button"><X /></button><div className="mo-spec__inset-sheet-content"><SpecBadge tone="energy">{tx(locale, 'اقدام موقت', 'Temporary action')}</SpecBadge><h2>{tx(locale, 'تنظیم یادآور', 'Set a reminder')}</h2><p>{tx(locale, 'خود پنل شیشه‌ای است، اما بلوک محتوایی داخل آن مات است.', 'The sheet shell is glass, while its inner content block is opaque.')}</p><SpecButton>{tx(locale, 'ذخیره', 'Save')}</SpecButton></div></section> : null}
      </div>
    </ProductFrame>
  )
}

function ScrollEdgeDemo({ locale }: { locale: SpecLocale }) {
  const rows = locale === 'fa' ? ['گرم‌کردن و تحرک', 'اسکوات جام', 'پرس سینه با دمبل', 'پارویی تک‌دست', 'ددلیفت رومانیایی', 'پلانک کنترل‌شده', 'سردکردن و تنفس'] : ['Warm-up & mobility', 'Goblet squat', 'Dumbbell chest press', 'Single-arm row', 'Romanian deadlift', 'Controlled plank', 'Cool-down & breathing']
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'لبه اسکرول', 'Scroll edge')}>
      <SpecHeader eyebrow={tx(locale, 'تداوم فضایی', 'Spatial continuity')} title={tx(locale, 'محتوا زیر لبه شیشه‌ای حرکت می‌کند', 'Content moves beneath a glass scroll edge')} body={tx(locale, 'در کادر زیر اسکرول کن تا عمق و پیوستگی ناوبری را ببینی.', 'Scroll the specimen below to see depth and navigation continuity.')} />
      <div className="mo-spec__scroll-demo" tabIndex={0}>
        <header className="mo-spec__scroll-edge"><span><Dumbbell /><strong>{tx(locale, 'تمرین امروز', 'Today’s workout')}</strong></span><SpecBadge tone="brand">45 min</SpecBadge></header>
        <div className="mo-spec__scroll-content">{rows.map((row, index) => <article key={row}><b>{index + 1}</b><div><strong>{row}</strong><p>{tx(locale, '۳ ست · ریتم کنترل‌شده', '3 sets · controlled tempo')}</p></div></article>)}</div>
      </div>
    </ProductFrame>
  )
}

function ToolbarGroupingDemo({ locale }: { locale: SpecLocale }) {
  const [merged, setMerged] = useState(false)
  const [expanded, setExpanded] = useState(false)
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'گروه‌بندی و morph ظرف شیشه', 'Toolbar grouping and glass morph')}>
      <SpecHeader eyebrow={tx(locale, 'قرارداد اپل', 'Apple contract')} title={tx(locale, 'اقدام‌های مرتبط یک کپسول می‌سازند', 'Related actions share one capsule')} body={tx(locale, 'آیتم‌های هم‌معنا داخل یک GlassEffectContainer گروه‌بندی می‌شوند. آیتم‌های نامرتبط جدا می‌مانند. فاصلهٔ کمتر باعث morph شکل‌ها می‌شود.', 'Related items share one GlassEffectContainer. Unrelated items stay separate. Closer spacing morphs the shapes together.')} />
      <div className="mo-spec__apple-lab">
        <section className="mo-spec__motion-stage">
          <span className="mo-spec__scene-label">{tx(locale, 'گروه‌بندی نوار ابزار', 'Toolbar grouping')}</span>
          <div className="mo-spec__toolbar-groups">
            <div className="mo-spec__glass-group" role="group" aria-label={tx(locale, 'واگرد', 'Undo group')}>
              <button aria-label={tx(locale, 'واگرد', 'Undo')} type="button"><Undo2 /></button>
              <button aria-label={tx(locale, 'بازگردانی', 'Redo')} type="button"><Redo2 /></button>
            </div>
            <div className="mo-spec__glass-group" role="group" aria-label={tx(locale, 'اقدام‌های محتوا', 'Content actions')}>
              <button aria-label={tx(locale, 'تنظیمات', 'Settings')} type="button"><Settings2 /></button>
              <button aria-label={tx(locale, 'جستجو', 'Search')} type="button"><Search /></button>
            </div>
          </div>
        </section>
        <section className="mo-spec__motion-stage">
          <span className="mo-spec__scene-label">{merged ? tx(locale, 'شکل‌ها در هم ادغام شدند', 'Shapes blended') : tx(locale, 'ظرف شیشه با فاصله', 'Spaced glass container')}</span>
          <div className={`mo-spec__cluster ${merged ? 'is-merged' : ''}`}>
            <button className="mo-spec__cluster-orb" onClick={() => setMerged((value) => !value)} type="button"><Dumbbell /></button>
            {expanded ? <button className="mo-spec__cluster-orb is-materializing" onClick={() => setExpanded(false)} type="button"><Salad /></button> : null}
            <button className="mo-spec__cluster-orb" onClick={() => setExpanded((value) => !value)} type="button">{expanded ? <X /> : <Plus />}</button>
          </div>
          <SpecButton onClick={() => setMerged((value) => !value)}>{merged ? tx(locale, 'جدا کردن شکل‌ها', 'Separate shapes') : tx(locale, 'نزدیک کردن شکل‌ها', 'Blend shapes')}</SpecButton>
        </section>
      </div>
    </ProductFrame>
  )
}

function InsetSheetExpandDemo({ locale }: { locale: SpecLocale }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'شیت تو رفته و مات‌شدن', 'Inset sheet and opacity')}>
      <SpecHeader eyebrow={tx(locale, 'مودال اپل', 'Apple sheets')} title={tx(locale, 'نیم‌شیت از لبه فاصله دارد', 'Half sheets stay inset')} body={tx(locale, 'محتوا از اطراف شیت دیده می‌شود. وقتی شیت به ارتفاع کامل می‌رسد، مات‌تر می‌شود تا تمرکز روی کار بماند.', 'Content peeks around the sheet. Expanding to full height makes the material more opaque so the task stays in focus.')} />
      <div className="mo-spec__inset-stage">
        <SpecCard className="is-wide"><SpecBadge tone="brand">{tx(locale, 'محتوای زیرین', 'Underlying content')}</SpecBadge><h2>{tx(locale, 'برنامه امروز', 'Today’s plan')}</h2><p>{tx(locale, 'این کارت مات است و باید از حاشیهٔ شیت دیده شود.', 'This opaque card should remain visible around the inset sheet.')}</p></SpecCard>
        <section aria-label={tx(locale, 'شیت موقت', 'Temporary sheet')} className={`mo-spec__inset-sheet ${expanded ? 'is-expanded' : ''}`}>
          <span className="mo-spec__sheet-handle" />
          <div className="mo-spec__inset-sheet-content">
            <SpecBadge tone="energy">{expanded ? tx(locale, 'ارتفاع کامل · مات‌تر', 'Full height · more opaque') : tx(locale, 'نیم‌شیت شیشه‌ای', 'Glass half sheet')}</SpecBadge>
            <h2>{tx(locale, 'تنظیم یادآور', 'Set a reminder')}</h2>
            <p>{tx(locale, 'پوسته شیشه‌ای است؛ بلوک محتوا مات می‌ماند. ارتفاع کامل تمرکز را حفظ می‌کند.', 'The shell is glass; the inner block stays opaque. Full height preserves focus.')}</p>
            <SpecButton onClick={() => setExpanded((value) => !value)}>{expanded ? tx(locale, 'برگرد به نیم‌شیت', 'Return to half sheet') : tx(locale, 'گسترش به ارتفاع کامل', 'Expand to full height')}</SpecButton>
          </div>
        </section>
      </div>
    </ProductFrame>
  )
}

function TabBarMinimizeDemo({ locale }: { locale: SpecLocale }) {
  const [minimized, setMinimized] = useState(false)
  const rows = locale === 'fa' ? ['گرم‌کردن', 'اسکوات جام', 'پرس سینه', 'پارویی', 'ددلیفت', 'پلانک', 'سردکردن'] : ['Warm-up', 'Goblet squat', 'Chest press', 'Row', 'Deadlift', 'Plank', 'Cool-down']
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'جمع‌شدن نوار تب', 'Tab bar minimize')}>
      <SpecHeader eyebrow={tx(locale, 'ناوبری شناور', 'Floating navigation')} title={tx(locale, 'اسکرول محتوا را بالا می‌آورد', 'Scroll elevates the content')} body={tx(locale, 'نوار تب روی لایهٔ Function شناور است. با اسکرول به پایین جمع می‌شود و با اسکرول معکوس برمی‌گردد. این حرکت اپل است، نه تزئین دائم.', 'The tab bar floats on the Function layer. It recedes on scroll-down and returns on the opposite scroll. This is Apple’s causal motion, not idle decoration.')} />
      <div className="mo-spec__scroll-demo" onScroll={(event) => {
        const node = event.currentTarget
        setMinimized(node.scrollTop > 48)
      }} tabIndex={0}>
        <header className="mo-spec__scroll-edge"><span><Dumbbell /><strong>{tx(locale, 'تمرین امروز', 'Today’s workout')}</strong></span><SpecBadge tone="brand">45 min</SpecBadge></header>
        <div className="mo-spec__scroll-content">{rows.map((row, index) => <article key={row}><b>{index + 1}</b><div><strong>{row}</strong><p>{tx(locale, '۳ ست · ریتم کنترل‌شده', '3 sets · controlled tempo')}</p></div></article>)}</div>
      </div>
      <nav aria-label={tx(locale, 'ناوبری اصلی', 'Primary navigation')} className={`mo-spec__tabbar ${minimized ? 'is-minimized' : ''}`} style={{ position: 'relative', inset: 'auto', width: 'min(100%, 34rem)', margin: '1rem auto 0' }}>
        {[{ id: 'today', fa: 'امروز', en: 'Today', icon: House }, { id: 'plan', fa: 'برنامه', en: 'Plan', icon: Salad }, { id: 'progress', fa: 'پیشرفت', en: 'Progress', icon: Dumbbell }, { id: 'me', fa: 'من', en: 'Me', icon: CircleUserRound }].map((item) => (
          <button className={item.id === 'today' ? 'is-active' : ''} key={item.id} type="button"><item.icon /><span>{tx(locale, item.fa, item.en)}</span></button>
        ))}
      </nav>
    </ProductFrame>
  )
}

function FallbackDemo({ locale }: { locale: SpecLocale }) {
  const variants = [
    { className: 'is-regular', title: tx(locale, 'شیشه معمولی', 'Regular Glass'), body: tx(locale, 'محوشدگی و تینت کنترل‌شده برای ناوبری و پاپ‌اور', 'Controlled blur and tint for navigation and popovers') },
    { className: 'is-prominent', title: tx(locale, 'شیشه برجسته', 'Prominent Glass'), body: tx(locale, 'تینت Plum قوی‌تر، فقط برای یک کنترل شناور با اولویت بالا', 'A stronger Plum tint for one hierarchy-critical floating control') },
    { className: 'is-clear', title: tx(locale, 'شیشه شفاف', 'Clear Glass'), body: tx(locale, 'فقط روی پس‌زمینه محدود و کنترل‌شده با لبه محافظ', 'Only on a bounded, controlled backdrop with a protective edge') },
    { className: 'mo-spec--force-reduced-transparency', title: tx(locale, 'شفافیت کاهش‌یافته', 'Reduced transparency'), body: tx(locale, 'سطح مات و کنتراست پایدار؛ بدون نویز و محوشدگی', 'Opaque, stable-contrast surface without noise or blur') },
    { className: 'mo-spec--force-reduced-motion', title: tx(locale, 'حرکت کاهش‌یافته', 'Reduced motion'), body: tx(locale, 'تغییر وضعیت فوری؛ بدون بزرگ‌نمایی، چرخش یا جهش', 'Instant state change without scale, rotation, or bounce') },
  ]
  return (
    <ProductFrame locale={locale} nav={false} title={tx(locale, 'حالت‌های جایگزین', 'Fallback modes')}>
      <SpecHeader eyebrow={tx(locale, 'دسترس‌پذیری ماتریال', 'Material accessibility')} title={tx(locale, 'همان هندسه، وابستگی حسی کمتر', 'Same geometry, lower sensory dependence')} body={tx(locale, 'حالت‌های جایگزین خودکار هستند و جایگاه، معنا و ترتیب کنترل‌ها را عوض نمی‌کنند.', 'Fallbacks are automatic and never change control placement, meaning, or order.')} />
      <div className="mo-spec__fallback-grid">{variants.map((variant) => <article className={`mo-spec__fallback-card ${variant.className}`} key={variant.title}><div className="mo-spec__fallback-toolbar"><span><House />{tx(locale, 'امروز', 'Today')}</span><button aria-label={tx(locale, 'تنظیمات', 'Settings')} type="button"><Settings2 /></button></div><h2>{variant.title}</h2><p>{variant.body}</p></article>)}</div>
    </ProductFrame>
  )
}

const meta = { title: 'Visual direction/Liquid Glass motion', parameters: { controls: { disable: true }, layout: 'fullscreen', docs: { description: { component: 'Interactive, Apple-like Liquid Glass behavior for functional chrome only. Content, forms, health, and nutrition surfaces remain opaque.' } } } } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const InteractiveChromeAndFloatingControls: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass interactive motion and selection lens'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <GlassInteractionLab locale={localeFromStory(context.globals.locale)} /> }
export const BottomSheetDepthAndEntryMotion: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass sheet depth and reduced-motion fallback', 'sheet'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <GlassSheetDemo locale={localeFromStory(context.globals.locale)} /> }
export const MaterialAnatomyAndBoundaries: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass material anatomy and content boundary'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <GlassAnatomyDemo locale={localeFromStory(context.globals.locale)} /> }
export const QuietAndBusyBackdropBehavior: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass quiet and busy backdrop comparison'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <QuietBusyDemo locale={localeFromStory(context.globals.locale)} /> }
export const PressFeedbackAndSharedMorph: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass press response and source-to-panel morph'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <PressMorphDemo locale={localeFromStory(context.globals.locale)} /> }
export const SourcePopoverAndInsetSheet: Story = { parameters: momentumSupportingVariant('/[locale]/app/plan', 'liquid-glass source popover and inset sheet', 'in-page'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <PopoverSheetDemo locale={localeFromStory(context.globals.locale)} /> }
export const ScrollEdgeBehavior: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass scroll-edge continuity', 'in-page'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <ScrollEdgeDemo locale={localeFromStory(context.globals.locale)} /> }
export const ToolbarGroupingAndContainerMorph: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass toolbar grouping and GlassEffectContainer morph'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <ToolbarGroupingDemo locale={localeFromStory(context.globals.locale)} /> }
export const InsetSheetExpandToOpaque: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass inset half sheet expanding to opaque', 'sheet'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <InsetSheetExpandDemo locale={localeFromStory(context.globals.locale)} /> }
export const TabBarMinimizeOnScroll: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass tab bar minimize on scroll'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <TabBarMinimizeDemo locale={localeFromStory(context.globals.locale)} /> }
export const ReducedTransparencyAndMotionFallbacks: Story = { parameters: momentumSupportingVariant('/[locale]/app/today', 'liquid-glass reduced transparency, reduced motion, and no-blur fallbacks'), render: (_: unknown, context: { globals: Record<string, unknown> }) => <FallbackDemo locale={localeFromStory(context.globals.locale)} /> }
