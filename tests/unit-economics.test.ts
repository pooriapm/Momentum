import { describe, expect, it } from 'vitest'
import {
  giftToPaidFunnel,
  monthlyCashflow,
  recurringEconomics,
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
  it('matches recurring break-even with monthly cashflow including every free nonconverter and retry', () => {
    const a = { ...base, advertisingCacToman: 600_000 }
    const recurring = recurringEconomics(a, 100)
    const row = giftToPaidFunnel(a, 1, (100 - 30) / (1 - a.monthlyChurn))
    expect(row.payingCustomers).toBeCloseTo(100)
    expect(row.giftRecipients).toBe(300)
    expect(recurring.profitToman).toBeCloseTo(row.profitToman)
    expect(recurring.breakEvenPayingCustomers).toBe(45)
    expect(recurringEconomics(a, 44).profitToman).toBeLessThan(0)
    expect(recurringEconomics(a, 45).profitToman).toBeGreaterThanOrEqual(0)
    expect(recurring.giftGenerationToman).toBeCloseTo(300 * 9600 * 1.15)
  })

  it('shows a loss for the first gift-only month and pays prepaid hosting only once', () => {
    const rows = monthlyCashflow({ ...base, advertisingCacToman: 600_000 })
    expect(rows[0].revenueToman).toBe(0)
    expect(rows[0].totalSpendToman).toBeCloseTo(27_312_000)
    expect(rows.reduce((sum, r) => sum + r.serverPrepaidToman, 0)).toBe(6_000_000)
    expect(rows[1].newPaid).toBe(30)
    expect(rows[2].payingCustomers).toBeCloseTo(55.5)
    expect(rows.at(-1)?.cumulativeToman).toBeCloseTo(rows.reduce((sum, r) => sum + r.profitToman, 0))
  })

  it('charges all free plans when no recipients convert and avoids inventing a paid-CAC funnel', () => {
    const a = { ...base, giftToPaidConversion: 0 }
    const rows = monthlyCashflow(a)
    expect(rows.every(r => r.revenueToman === 0)).toBe(true)
    expect(rows.every(r => r.giftGenerationToman === 180 * 9600)).toBe(true)
    expect(() => monthlyCashflow({ ...a, advertisingCacToman: 600_000 })).toThrow(RangeError)
  })

  it('makes model cost, FX and failure assumptions affect both cashflow and break-even', () => {
    const terra = { ...base, advertisingCacToman: 600_000 }
    const luna = { ...terra, model: 'luna' as const, planCostUsd: 0.0096 }
    const terraRows = monthlyCashflow(terra)
    const lunaRows = monthlyCashflow(luna)
    expect(lunaRows[0].totalGenerationToman).toBeCloseTo(terraRows[0].totalGenerationToman / 10)
    expect(lunaRows[11].payingCustomers).toEqual(terraRows[11].payingCustomers)
    expect(recurringEconomics(luna, 100).profitToman).toBeGreaterThan(recurringEconomics(terra, 100).profitToman)
    const doubleFx = monthlyCashflow({ ...terra, fxTomanPerUsd: 200_000 })
    expect(doubleFx[5].totalGenerationToman).toBeCloseTo(terraRows[5].totalGenerationToman * 2)
    const noFailure = monthlyCashflow({ ...terra, failedAttemptMultiplier: 1 })
    expect(noFailure[5].failedAttemptGenerationToman).toBe(0)
    expect(recurringEconomics({ ...terra, priceToman: 1000 }, 100).breakEvenPayingCustomers).toBeNull()
  })

})
