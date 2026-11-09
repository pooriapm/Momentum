import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// docs/design/CONTENT-GUIDE.md: short, clear, professional; behaviour carries the reassurance.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const productCopy = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', 'src/v2', 'src/platform/i18n'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((path) => /\.(tsx?|json)$/.test(path) && !/\.(test|stories)\./.test(path))

const BANNED = [
  /آفرین/, /نمره نیست/, /جریمه نیست/, /بدهی ندار/, /از نو شروع کن/, /یک قدم شدنی/, /اختیارش دست توست/,
  /\bNice work\b/i, /\bGreat job\b/i, /\bWell done\b/i, /\bAwesome\b/i, /\bnot a grade\b/i, /\bno penalty\b/i,
]

function strings(text: string) {
  return [...text.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((match) => match[1] ?? match[2] ?? match[3] ?? '')
}

describe('product voice', () => {
  it('keeps slogans, praise and defensive reassurance out of the UI', () => {
    const offenders = productCopy.flatMap((path) =>
      strings(readFileSync(resolve(root, path), 'utf8')).filter((text) => BANNED.some((re) => re.test(text))).map((text) => `${path}: ${text.slice(0, 60)}`),
    )
    expect(offenders).toEqual([])
  })

  it('ends no UI sentence with an exclamation mark', () => {
    const offenders = productCopy.flatMap((path) =>
      strings(readFileSync(resolve(root, path), 'utf8'))
        .filter((text) => /[\p{L}\p{N})]!$/u.test(text.trim()) && /\s/.test(text))
        .map((text) => `${path}: ${text.slice(0, 60)}`),
    )
    expect(offenders).toEqual([])
  })
})
