/**
 * Offline-friendly unit-economics model for Momentum Iran launch planning.
 * Assumptions are editable inputs — not measured production averages.
 */

export type PlanModelChoice = 'terra' | 'luna'

export interface UnitEconomicsAssumptions {
  priceToman: number
  fxTomanPerUsd: number
  model: PlanModelChoice
  /** Estimated direct AI USD per successful plan for the selected model workload. */
  planCostUsd: number
  /** Multiplier for chargeable failed/repair attempts on top of delivered plans. */
  failedAttemptMultiplier: number
  advertisingToman: number
  giftRecipientsPerMonth: number
  giftToPaidConversion: number
  monthlyChurn: number
  serverPrepaidToman: number
  /**
   * Optional advertising CAC already expressed as spend per acquired paying customer.
   * When set, advertisingToman is derived and conversion is NOT applied a second time
   * onto that CAC value. Gift generation remains a separate COGS line.
   */
  advertisingCacToman?: number
}

export interface FunnelMonth {
  month: number
  giftRecipients: number
  newPaid: number
  payingCustomers: number
  revenueToman: number
  paidGenerationToman: number
  giftGenerationToman: number
  failedAttemptGenerationToman: number
  totalGenerationToman: number
  advertisingToman: number
  serverPrepaidToman: number
  totalSpendToman: number
  profitToman: number
  cumulativeToman: number
}

export const DEFAULT_PLAN_COST_USD: Record<PlanModelChoice, number> = {
  // Workload assumption 12k in / 6k out at official short-context Standard rates (2026-09-07).
  terra: 0.096,
  luna: 0.0096,
}

function planCostToman(a: UnitEconomicsAssumptions): number {
  return a.planCostUsd * a.fxTomanPerUsd
}

/** CAC is already per eventual payer; conversion determines all gifted plans required. */
export function acquisitionCosts(a: UnitEconomicsAssumptions) {
  let advertising = a.advertisingToman
  let gifts = a.giftRecipientsPerMonth
  if (a.advertisingCacToman && a.advertisingCacToman > 0) {
    if (a.giftToPaidConversion <= 0 && advertising > 0) {
      throw new RangeError('Positive paid-CAC spend requires positive conversion; use gift-recipient mode for zero conversion.')
    }
    const targetNewPaid = advertising > 0
      ? advertising / a.advertisingCacToman
      : gifts * a.giftToPaidConversion
    advertising = targetNewPaid * a.advertisingCacToman
    gifts = a.giftToPaidConversion > 0 ? targetNewPaid / a.giftToPaidConversion : gifts
  }
  return { advertising, gifts }
}

/** Monthly break-even at a fixed acquisition budget, including all free plans and retries. */
export function recurringEconomics(a: UnitEconomicsAssumptions, payingCustomers: number) {
  const { advertising, gifts } = acquisitionCosts(a)
  const effectiveUnit = planCostToman(a) * Math.max(1, a.failedAttemptMultiplier)
  const giftGenerationToman = gifts * effectiveUnit
  const paidGenerationToman = payingCustomers * effectiveUnit
  const fixedSpend = advertising + giftGenerationToman
  const margin = a.priceToman - effectiveUnit
  return {
    giftRecipients: gifts,
    giftGenerationToman,
    paidGenerationToman,
    advertisingToman: advertising,
    profitToman: payingCustomers * a.priceToman - paidGenerationToman - fixedSpend,
    breakEvenPayingCustomers: margin > 0 ? Math.ceil(fixedSpend / margin) : null,
  }
}

/**
 * Advertising → gift recipients → first payment in the following cycle → retained paid.
 * Denominators:
 * - giftRecipients: accounts that received a gifted first plan this month
 * - newPaid: gift recipients from the prior month × conversion (not same-month)
 * - payingCustomers: retained prior paid + newPaid
 */
export function giftToPaidFunnel(
  a: UnitEconomicsAssumptions,
  monthIndex: number,
  priorPaying: number,
): Omit<FunnelMonth, 'cumulativeToman'> {
  const unit = planCostToman(a)
  const { advertising, gifts } = acquisitionCosts(a)

  const newPaid = monthIndex === 0 ? 0 : gifts * a.giftToPaidConversion
  const payingCustomers = priorPaying * (1 - a.monthlyChurn) + newPaid
  const paidGeneration = payingCustomers * unit
  const giftGeneration = gifts * unit
  const failedAttemptGeneration = (paidGeneration + giftGeneration) *
    Math.max(0, a.failedAttemptMultiplier - 1)
  const totalGeneration = paidGeneration + giftGeneration + failedAttemptGeneration
  const serverPrepaid = monthIndex === 0 ? a.serverPrepaidToman : 0
  const totalSpend = totalGeneration + advertising + serverPrepaid
  const revenue = payingCustomers * a.priceToman

  return {
    month: monthIndex,
    giftRecipients: gifts,
    newPaid,
    payingCustomers,
    revenueToman: revenue,
    paidGenerationToman: paidGeneration,
    giftGenerationToman: giftGeneration,
    failedAttemptGenerationToman: failedAttemptGeneration,
    totalGenerationToman: totalGeneration,
    advertisingToman: advertising,
    serverPrepaidToman: serverPrepaid,
    totalSpendToman: totalSpend,
    profitToman: revenue - totalSpend,
  }
}

export function monthlyCashflow(
  a: UnitEconomicsAssumptions,
  months = 12,
): FunnelMonth[] {
  const rows: FunnelMonth[] = []
  let paid = 0
  let cumulative = 0
  for (let month = 0; month < months; month += 1) {
    const row = giftToPaidFunnel(a, month, paid)
    paid = row.payingCustomers
    cumulative += row.profitToman
    rows.push({ ...row, cumulativeToman: cumulative })
  }
  return rows
}
