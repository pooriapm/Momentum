#!/usr/bin/env node
/**
 * Automatic versioning for pushes to main.
 *
 * Every push bumps the patch (0.4.4 -> 0.4.5). Milestones (0.5.0, 0.6.0, ...) are set by hand
 * in package.json; when the pushed version is already newer than the last release tag, it is
 * kept as-is instead of bumped again. 0.9.0 is reserved for the first release to real users and
 * is never reached automatically.
 *
 * Usage: node scripts/ops/next-version.mjs <current-version> <last-released-version|none>
 * Prints the version to release, or exits 1 when the result would be the reserved 0.9.0+.
 */
import { pathToFileURL } from 'node:url'

export const FIRST_USER_VERSION = '0.9.0'

export function parseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value).trim().replace(/^v/, ''))
  if (!match) throw new Error(`Not a plain semantic version: ${value}`)
  return match.slice(1).map(Number)
}

export function compareVersions(left, right) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index]
  }
  return 0
}

/**
 * @param {string} current version in package.json at the pushed commit
 * @param {string | null} lastReleased newest release tag, or null when none exists
 * @param {{ allowFirstUserVersion?: boolean }} options set only for the deliberate 0.9.0 release
 */
export function nextVersion(current, lastReleased, options = {}) {
  const [major, minor, patch] = parseVersion(current)
  const manuallyRaised = lastReleased !== null && compareVersions(current, lastReleased) > 0
  const next = manuallyRaised ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`
  if (!options.allowFirstUserVersion && compareVersions(next, FIRST_USER_VERSION) >= 0) {
    throw new Error(
      `${next} would reach ${FIRST_USER_VERSION}, which is reserved for the first user release. ` +
        'Set it deliberately instead of through an automatic bump.',
    )
  }
  return next
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [current, last] = process.argv.slice(2)
  try {
    process.stdout.write(`${nextVersion(current, last && last !== 'none' ? last : null)}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}
