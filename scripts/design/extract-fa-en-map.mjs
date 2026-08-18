import fs from 'fs'
import path from 'path'

const files = []
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p)
    else if (/\.(ts|tsx)$/.test(ent.name)) files.push(p)
  }
}
walk('src/stories')
files.push('src/platform/i18n/catalog.ts')

const map = new Map()
const reTx = /tx\(\s*locale\s*,\s*['`]([^'`]+)['`]\s*,\s*['`]([^'`]+)['`]\s*\)/g
const reFaEn = /fa:\s*['`]([^'`]+)['`]\s*,\s*en:\s*['`]([^'`]+)['`]/g
const reBody = /bodyFa:\s*['`]([^'`]+)['`]\s*,\s*bodyEn:\s*['`]([^'`]+)['`]/g

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8')
  for (const re of [reTx, reFaEn, reBody]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(s))) map.set(m[2], m[1])
  }
}

map.set('Save', 'ذخیره')
map.set('Continue', 'ادامه')
map.set('Back', 'قبلی')
map.set('Learn more', 'بیشتر بدانید')
map.set('Edit', 'ویرایش')
map.set('Changes saved', 'تغییرها ذخیره شدند')
map.set('Notifications', 'اعلان‌ها')
map.set('Help, safety and legal', 'راهنما، ایمنی و قوانین')
map.set('Help, safety & legal', 'راهنما، ایمنی و قوانین')
map.set('Reminders and plan-ready updates', 'یادآوری‌ها و وضعیت آماده‌شدن برنامه')
map.set('Support, health guidance, and legal documents', 'پشتیبانی، راهنمای سلامت و اسناد حقوقی')
map.set('Week', 'هفته')
map.set('Nutrition', 'تغذیه')
map.set('Training', 'تمرین')
map.set('Grocery', 'خرید')
map.set('Calendar', 'تقویم')
map.set('Today', 'امروز')
map.set('Plan', 'برنامه')
map.set('Progress', 'پیشرفت')
map.set('Me', 'من')
map.set('View', 'مشاهده')

fs.writeFileSync('scripts/design/fa-en-map.json', JSON.stringify([...map.entries()]))
console.log(JSON.stringify({ size: map.size }))
