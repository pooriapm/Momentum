// Uploads the Android exercise media (library.zip + anim/*.zip) to the public exercise-media
// bucket under v1/, then checks that library.zip is publicly downloadable.
//
//   Local:      node scripts/ops/upload-exercise-media.mjs --local [mediaDir]
//   Production: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//                 node scripts/ops/upload-exercise-media.mjs [mediaDir]
//
// mediaDir defaults to ../Momentum-android/media/exercise/v1. Re-running replaces files in place.
// Keys come only from the environment (or the local CLI) and are never printed.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'exercise-media'
const PREFIX = 'v1'
const supabaseCli = fileURLToPath(new URL('../../node_modules/.bin/supabase', import.meta.url))

const args = process.argv.slice(2)
const local = args.includes('--local')
const mediaDir = resolve(
  args.find((arg) => !arg.startsWith('--')) ?? '../Momentum-android/media/exercise/v1',
)

function localEnvironment() {
  let output
  try {
    const cli = process.platform === 'win32' ? `${supabaseCli}.cmd` : supabaseCli
    output = execFileSync(cli, ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    })
  } catch {
    throw new Error('Local Supabase is not running. Start it with npx supabase start.')
  }
  const environment = JSON.parse(output.slice(output.indexOf('{')))
  return { url: environment.API_URL, key: environment.SERVICE_ROLE_KEY }
}

function hostedEnvironment() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  return { url, key }
}

function mediaFiles() {
  const files = [{ path: join(mediaDir, 'library.zip'), name: `${PREFIX}/library.zip` }]
  const animDir = join(mediaDir, 'anim')
  for (const entry of readdirSync(animDir).sort()) {
    if (!/^[a-z0-9_-]+\.zip$/.test(entry)) throw new Error(`Unexpected file in anim/: ${entry}`)
    files.push({ path: join(animDir, entry), name: `${PREFIX}/anim/${entry}` })
  }
  for (const file of files) {
    if (!statSync(file.path).isFile()) throw new Error(`Missing ${file.path}`)
  }
  return files
}

const { url, key } = local ? localEnvironment() : hostedEnvironment()
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const files = mediaFiles()
let uploaded = 0
for (const file of files) {
  const { error } = await supabase.storage.from(BUCKET).upload(file.name, readFileSync(file.path), {
    contentType: 'application/zip',
    cacheControl: '3600',
    upsert: true,
  })
  if (error) throw new Error(`Upload failed for ${file.name}: ${error.message}`)
  uploaded++
}
console.log(`Uploaded ${uploaded} files to ${BUCKET}/${PREFIX}/`)

const publicUrl = `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${PREFIX}/library.zip`
const response = await fetch(publicUrl)
const body = new Uint8Array(await response.arrayBuffer())
const expected = readFileSync(files[0].path)
if (response.status !== 200 || body.length !== expected.length) {
  throw new Error(`Public check failed: ${publicUrl} returned ${response.status}`)
}
console.log(`Public check ok: ${publicUrl} (200, ${body.length} bytes)`)
