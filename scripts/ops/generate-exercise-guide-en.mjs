// Builds src/v2/data/exercise-guide-en.json: the English text of every exercise guide for the
// website. The shared library (library.json, uploaded to the exercise-media bucket) is Persian;
// this maps each of its sentences and terms through scripts/ops/exercise-guide-en-phrases.json.
//
//   node scripts/ops/generate-exercise-guide-en.mjs [path/to/library.json]
//
// The path defaults to ../Momentum-android/media/exercise/v1/library.json. A sentence or term
// without an English entry fails the run, so a new library version is never half translated.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const libraryPath = resolve(process.argv[2] ?? resolve(root, '../Momentum-android/media/exercise/v1/library.json'))
const phrases = JSON.parse(readFileSync(resolve(root, 'scripts/ops/exercise-guide-en-phrases.json'), 'utf8'))
const library = JSON.parse(readFileSync(libraryPath, 'utf8'))

const missing = new Set()
function lookup(table, text) {
  const english = table[text]
  if (!english) missing.add(text)
  return english ?? ''
}

const guides = {}
for (const exercise of library.exercises) {
  const guide = {
    muscles: exercise.muscles.split('،').map((part) => lookup(phrases.muscles, part.trim())).join(', '),
    steps: exercise.steps.map((step) => lookup(phrases.sentences, step)),
  }
  if (exercise.tip) guide.tip = lookup(phrases.sentences, exercise.tip)
  if (exercise.eq?.length) guide.eq = exercise.eq.map((item) => lookup(phrases.equipment, item))
  guides[exercise.id] = guide
}

if (missing.size) {
  console.error(`No English for ${missing.size} sentence(s) or term(s):\n${[...missing].join('\n')}`)
  process.exit(1)
}

const target = resolve(root, 'src/v2/data/exercise-guide-en.json')
writeFileSync(target, `${JSON.stringify(guides)}\n`)
console.log(`Wrote ${Object.keys(guides).length} English guides (library v${library.version}).`)
