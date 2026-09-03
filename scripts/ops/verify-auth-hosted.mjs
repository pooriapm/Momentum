import { randomUUID } from 'node:crypto'
import {
  HOSTED_API_URL,
  HOSTED_PROJECT_REF,
  HOSTED_REDIRECT,
  assert,
  assertHostedAuthUrl,
  authClient,
  disposableProofEmail,
  isRateLimitedError,
  isUnverifiedError,
  readHostedApiKeysFromCli,
  readHostedAuthSettings,
  resolveHostedAuthTarget,
  signupAnonymous,
  signupMetadata,
  verifyGeneratedLink,
  writeProof,
} from './auth-proof-lib.mjs'

const requireHosted = process.argv.includes('--require') || process.env.MOMENTUM_HOSTED_AUTH_PROOF === '1'
const ciSkip = Boolean(process.env.CI) && process.env.MOMENTUM_HOSTED_AUTH_PROOF !== '1'

function step(label) {
  process.stdout.write(`${label}\n`)
}

function resolveCredentials() {
  step('Resolving hosted Auth credentials')
  const target = resolveHostedAuthTarget()
  let { url, anon, serviceRole } = target
  if (!anon || !serviceRole) {
    step('Reading hosted API keys from Supabase CLI')
    const fromCli = readHostedApiKeysFromCli(HOSTED_PROJECT_REF)
    anon = anon || fromCli.anon
    serviceRole = serviceRole || fromCli.serviceRole
  }
  return { url, anon, serviceRole }
}

if (ciSkip && !requireHosted) {
  console.log(JSON.stringify({
    hostedAuthProof: 'skipped',
    reason: 'CI does not hit production Auth unless MOMENTUM_HOSTED_AUTH_PROOF=1',
  }, null, 2))
  process.exit(0)
}

let credentials
try {
  credentials = resolveCredentials()
} catch (error) {
  if (!requireHosted) {
    console.log(JSON.stringify({
      hostedAuthProof: 'skipped',
      reason: 'Could not read hosted Auth keys from env or `supabase projects api-keys`.',
    }, null, 2))
    process.exit(0)
  }
  throw error
}

assertHostedAuthUrl(credentials.url || HOSTED_API_URL)
assert(credentials.anon, 'Hosted anon key is missing.')
assert(credentials.serviceRole, 'Hosted service-role key is missing; needed for generateLink, revocation proof, and cleanup.')

const anonymous = authClient(credentials.url, credentials.anon)
const admin = authClient(credentials.url, credentials.serviceRole)
const suffix = randomUUID()
const frequencyEmail = disposableProofEmail('momentum-hosted-freq', suffix)
const lifecycleEmail = disposableProofEmail('momentum-hosted-life', suffix)
const originalPassword = `Hosted-Original-${suffix}-aA1!`
const updatedPassword = `Hosted-Updated-${suffix}-bB2!`
const created = []
const startedAt = new Date().toISOString()

step('Reading hosted Auth settings')
const settings = await readHostedAuthSettings(credentials.url, credentials.anon)
const mailerAutoconfirm = Boolean(settings.mailer_autoconfirm)
const disableSignup = Boolean(settings.disable_signup)
assert(!disableSignup, 'Hosted Auth has signup disabled.')
assert(!mailerAutoconfirm, 'Hosted Auth auto-confirms email; verification can be bypassed.')

async function cleanup() {
  await Promise.all(created.map((userId) => admin.auth.admin.deleteUser(userId).catch(() => undefined)))
}

function remember(user) {
  if (user?.id) created.push(user.id)
  return user
}

try {
  step('Creating an unconfirmed user without sending SMTP')
  const unconfirmed = await admin.auth.admin.createUser({
    email: frequencyEmail,
    password: originalPassword,
    email_confirm: false,
    user_metadata: signupMetadata(),
  })
  if (unconfirmed.error && /aborted|timeout/i.test(unconfirmed.error.message)) {
    writeProof(`auth-hosted-${startedAt.replaceAll(':', '')}.json`, {
      environment: 'hosted',
      projectRef: HOSTED_PROJECT_REF,
      apiUrl: HOSTED_API_URL,
      startedAt,
      finishedAt: new Date().toISOString(),
      hostedAuthProof: 'failed',
      reason: 'auth_write_timeout',
      settings: {
        disable_signup: disableSignup,
        mailer_autoconfirm: mailerAutoconfirm,
      },
      note: 'Auth settings were readable, but user-creation did not complete. SMTP or an Auth hook is likely blocking GoTrue writes.',
    })
    throw new Error('Hosted Auth user-creation timed out after settings were readable. SMTP or an Auth hook is likely blocking writes.')
  }
  if (unconfirmed.error) throw new Error(`Hosted admin createUser failed: ${unconfirmed.error.message}`)
  remember(unconfirmed.data.user)

  step('Unverified password sign-in must fail')
  const unverified = await anonymous.auth.signInWithPassword({
    email: frequencyEmail,
    password: originalPassword,
  })
  assert(unverified.error && isUnverifiedError(unverified.error), 'Unverified hosted sign-in was not blocked.')

  step('Invalid verification token must fail')
  const invalid = await anonymous.auth.verifyOtp({
    type: 'signup',
    token_hash: '0'.repeat(64),
  })
  assert(invalid.error, 'Hosted Auth accepted an invalid verification token.')

  step('Verifying signup via generateLink')
  const generated = await admin.auth.admin.generateLink({
    type: 'signup',
    email: lifecycleEmail,
    password: originalPassword,
    options: { redirectTo: HOSTED_REDIRECT },
  })
  if (generated.error) throw new Error(`Hosted generateLink(signup) failed: ${generated.error.message}`)
  remember(generated.data?.user)
  const verifiedClient = authClient(credentials.url, credentials.anon)
  const verified = await verifyGeneratedLink(verifiedClient, {
    type: 'signup',
    email: lifecycleEmail,
    data: generated.data,
  })
  if (verified.error) throw new Error(`Hosted email verification failed: ${verified.error.message}`)
  assert(verified.data.session?.user.id === generated.data.user.id, 'Hosted verification returned the wrong account.')

  step('Revoking the session globally')
  const firstSession = verified.data.session
  const signedOut = await verifiedClient.auth.signOut({ scope: 'global' })
  if (signedOut.error) throw new Error(`Hosted global sign-out failed: ${signedOut.error.message}`)
  const revoked = await authClient(credentials.url, credentials.anon).auth.refreshSession({
    refresh_token: firstSession.refresh_token,
  })
  assert(revoked.error, 'A globally signed-out hosted refresh token remained valid.')

  const signedIn = authClient(credentials.url, credentials.anon)
  const passwordSignIn = await signedIn.auth.signInWithPassword({
    email: lifecycleEmail,
    password: originalPassword,
  })
  if (passwordSignIn.error) throw new Error(`Verified hosted user could not sign in: ${passwordSignIn.error.message}`)

  step('Recovering the account and rotating the password')
  const recoveryLink = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: lifecycleEmail,
    options: { redirectTo: 'https://momentum.pooria-pm.workers.dev/en/auth/update-password' },
  })
  if (recoveryLink.error) throw new Error(`Hosted generateLink(recovery) failed: ${recoveryLink.error.message}`)
  const recoveryClient = authClient(credentials.url, credentials.anon)
  const recovered = await verifyGeneratedLink(recoveryClient, {
    type: 'recovery',
    email: lifecycleEmail,
    data: recoveryLink.data,
  })
  if (recovered.error) throw new Error(`Hosted recovery verification failed: ${recovered.error.message}`)
  const updated = await recoveryClient.auth.updateUser({ password: updatedPassword })
  if (updated.error) throw new Error(`Hosted password update failed: ${updated.error.message}`)
  await recoveryClient.auth.signOut({ scope: 'global' })

  const oldPassword = await authClient(credentials.url, credentials.anon).auth.signInWithPassword({
    email: lifecycleEmail,
    password: originalPassword,
  })
  assert(oldPassword.error, 'Hosted recovery left the previous password valid.')
  const newPasswordClient = authClient(credentials.url, credentials.anon)
  const newPassword = await newPasswordClient.auth.signInWithPassword({
    email: lifecycleEmail,
    password: updatedPassword,
  })
  if (newPassword.error) throw new Error(`Hosted updated password could not sign in: ${newPassword.error.message}`)
  await newPasswordClient.auth.signOut({ scope: 'global' })

  const publicAnonymous = authClient(credentials.url, credentials.anon, 90_000)
  let publicSignup = { timedOut: false, sessionGranted: null, rateLimited: false }
  step('Public signup and confirmation-resend rate limit')
  try {
    const frequencySignup = await signupAnonymous(publicAnonymous, {
      email: disposableProofEmail('momentum-hosted-public', suffix),
      password: originalPassword,
      redirectTo: HOSTED_REDIRECT,
    })
    if (frequencySignup.error && isRateLimitedError(frequencySignup.error)) {
      publicSignup.rateLimited = true
      publicSignup.sessionGranted = false
    } else {
      if (frequencySignup.error) throw new Error(`Hosted public signup failed: ${frequencySignup.error.message}`)
      assert(frequencySignup.data?.user, 'Hosted public signup did not return a user.')
      assert(!frequencySignup.data.session, 'Hosted public signup granted a session before email verification.')
      remember(frequencySignup.data.user)
      publicSignup.sessionGranted = false
      const resend = await publicAnonymous.auth.resend({
        type: 'signup',
        email: disposableProofEmail('momentum-hosted-public', suffix),
        options: { emailRedirectTo: HOSTED_REDIRECT },
      })
      publicSignup.rateLimited = Boolean(resend.error && isRateLimitedError(resend.error))
      if (!publicSignup.rateLimited) {
        throw new Error(resend.error?.message || 'Hosted confirmation resend was not rate-limited. Production max_frequency should be 1m.')
      }
    }
  } catch (error) {
    if (/aborted|timeout/i.test(String(error?.message ?? error))) {
      publicSignup.timedOut = true
    } else {
      throw error
    }
  }

  await cleanup()
  created.length = 0

  if (publicSignup.timedOut) {
    throw new Error('Hosted public signup/resend timed out waiting for Auth/SMTP. Verification, recovery, and session revocation still passed via generateLink.')
  }
  if (!publicSignup.rateLimited) {
    throw new Error('Hosted public signup/resend was not rate-limited.')
  }

  const proof = writeProof(`auth-hosted-${startedAt.replaceAll(':', '')}.json`, {
    environment: 'hosted',
    projectRef: HOSTED_PROJECT_REF,
    apiUrl: HOSTED_API_URL,
    startedAt,
    finishedAt: new Date().toISOString(),
    checks: {
      unverifiedSignInBlocked: true,
      invalidOtpRejected: true,
      emailVerification: true,
      globalSessionRevocation: true,
      recoveryAndPasswordUpdate: true,
      previousPasswordRejected: true,
      signupRequiresVerification: publicSignup.sessionGranted === false,
      confirmationResendRateLimited: publicSignup.rateLimited,
    },
    smtpInbox: 'not_read',
    note: 'Verification and recovery used admin generateLink so SMTP contents were never copied into logs or Git.',
  })

  console.log(JSON.stringify({
    hostedAuthProof: 'passed',
    projectRef: HOSTED_PROJECT_REF,
    evidence: proof,
  }, null, 2))
} catch (error) {
  await cleanup()
  throw error
}
