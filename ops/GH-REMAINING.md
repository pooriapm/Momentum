# Package G/H remaining work

## G — UX / accessibility

Done in this package:

- Inventory locked at **137** via `tests/inventory-coverage.test.ts` and `scripts/design/reconcile-inventory.mjs`
- Coverage report copy no longer treats historical **132** as a reopen baseline
- Plan-source Storybook/product stories updated in Package A

Still owner/device-gated (do not fake with clip wrappers or emulation alone):

- VoiceOver + one additional screen reader on real devices
- Forced Colors on a real OS setting
- Install/update/offline on physical iOS/Android
- Full D14 visual audit across FA/RTL + EN/LTR at 320/375/390/768/1440, zoom 200%, reduced motion

No identity redesign outside Step 5 freeze.

## H — R6–R8 release decision

Use `node scripts/ops/release-readiness.mjs` for a dated readiness snapshot.

Do **not** invent `release-evidence/R*.json`. `npm run verify:r4-r8-release` must keep failing until real `go` signoffs exist.

If product chooses deterministic-only launch (no live AI/payments), record that scope explicitly — do not label it live R4/R5 success.
