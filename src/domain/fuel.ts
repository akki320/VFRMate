/**
 * Kraftstoffrechnung: Mindestbedarf, sichere Flugzeit, Warnung bei
 * unzureichendem Vorrat.
 */
import type { FuelPlan } from './types'

/** Summe aller Kraftstoffpositionen des Plans (Mindestbedarf), in l. */
export function minimumRequiredFuelL(plan: FuelPlan): number {
  return (
    plan.startAndTaxiL +
    plan.climbL +
    plan.cruiseL +
    plan.approachContingencyL +
    plan.alternateL +
    plan.reserveL +
    plan.extraL
  )
}

/**
 * „Sichere Flugzeit" = (Vorrat / Reiseverbrauch) − 30 min, in Minuten.
 * cruiseConsumptionLPerHour ist der Reiseverbrauch des Musters in l/h.
 */
export function safeEnduranceMin(plan: FuelPlan, cruiseConsumptionLPerHour: number): number {
  if (cruiseConsumptionLPerHour <= 0) return 0
  const enduranceMin = (plan.onboardL / cruiseConsumptionLPerHour) * 60
  return Math.round(enduranceMin - 30)
}

export interface FuelCheckResult {
  minimumRequiredL: number
  onboardL: number
  /** true, wenn der Vorrat den Mindestbedarf unterschreitet. */
  insufficientFuel: boolean
  safeEnduranceMin: number
}

/** Prüft den Kraftstoffplan gegen den vorhandenen Vorrat und warnt, wenn
 * der Vorrat den Mindestbedarf unterschreitet. */
export function checkFuelPlan(plan: FuelPlan, cruiseConsumptionLPerHour: number): FuelCheckResult {
  const minimumRequiredL = minimumRequiredFuelL(plan)
  return {
    minimumRequiredL,
    onboardL: plan.onboardL,
    insufficientFuel: plan.onboardL < minimumRequiredL,
    safeEnduranceMin: safeEnduranceMin(plan, cruiseConsumptionLPerHour),
  }
}
