import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const macros = JSON.parse(fs.readFileSync(path.join(root, 'ops/support-macros.json'), 'utf8'))
const id = process.argv[2]
const locale = process.argv[3] === 'fa' ? 'fa' : process.argv[3] === 'en' ? 'en' : ''

if (!id || !locale) {
  console.error('Usage: node scripts/ops/render-support-macro.mjs <MACRO-ID> <fa|en>')
  process.exit(1)
}

const macro = macros.macros.find((entry) => entry.id === id)
if (!macro) {
  console.error(`Unknown support macro: ${id}`)
  process.exit(1)
}

const copy = macro[locale]
process.stdout.write(`${copy.subject}\n\n${copy.body}\n\nNever ask for: ${macro.neverAskFor.join(', ')}\nEscalate to: ${macro.escalation}\n`)
