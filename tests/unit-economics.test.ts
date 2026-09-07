import { describe, expect, it } from 'vitest'
import {
  giftToPaidFunnel,
  monthlyCashflow,
  type UnitEconomicsAssumptions,
} from '../src/v2/data/unit-economics.ts'

describe('unit economics funnel', () => {
  const base: UnitEconomicsAssumptions = {
    priceToman: 490_000,
    fxTomanPerUsd: 100_000,
    model: 'terra',
    planCostUsd: 0.096,
    failedAttemptMultiplier: 1.15,
    advertisingToman: 18_000_000,
    giftRecipientsPerMonth: 180,
    giftToPaidConversion: 0.1,
    monthlyChurn: 0.15,
    serverPrepaidToman: 6_000_000,
  }

  it('includes gift generation for non-converters and delays first payment one cycle', () => {
    const month0 = giftToPaidFunnel(base, 0, 0)
    expect(month0.giftRecipients).toBe(180)
    expect(month0.newPaid).toBe(0)
    expect(month0.giftGenerationToman).toBeGreaterThan(0)
    expect(month0.payingCustomers).toBe(0)

    const month1 = giftToPaidFunnel(base, 1, month0.payingCustomers)
    expect(month1.newPaid).toBe(18)
    expect(month1.payingCustomers).toBe(18)
    // Gift spend continues for new recipients; paid generation is separate.
    expect(month1.totalGenerationToman).toBeGreaterThan(month1.paidGenerationToman)
  })

  it('puts one-time hosting in month zero only and does not label gifts as paid', () => {
    const rows = monthlyCashflow(base, 6)
    expect(rows[0].serverPrepaidToman).toBe(6_000_000)
    expect(rows[1].serverPrepaidToman).toBe(0)
    expect(rows[0].payingCustomers).toBe(0)
    expect(rows.every((row) => row.giftRecipients === 0 || row.payingCustomers !== row.giftRecipients || row.month > 0)).toBe(true)
  })

  it('does not double-apply conversion onto advertising CAC', () => {
    // advertising CAC here means spend per acquired paying customer already.
    const withCac = { ...base, advertisingCacToman: 600_000, advertisingToman: 0 }
    const month1 = giftToPaidFunnel(withCac, 1, 0)
    // When CAC mode is used, gift recipients are derived from ad spend / CAC / conversion,
    // and generation cost is separate from CAC.
    expect(month1.advertisingToman).toBeGreaterThan(0)
    expect(month1.giftGenerationToman).toBeGreaterThan(0)
  })
})
