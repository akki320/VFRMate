import { describe, expect, it } from 'vitest'
import { checkFuelPlan, minimumRequiredFuelL, safeEnduranceMin } from './fuel'
import type { FuelPlan } from './types'

function makePlan(overrides: Partial<FuelPlan> = {}): FuelPlan {
  return {
    startAndTaxiL: 3,
    climbL: 8,
    cruiseL: 40,
    approachContingencyL: 5,
    alternateL: 10,
    reserveL: 15,
    extraL: 0,
    onboardL: 100,
    ...overrides,
  }
}

describe('minimumRequiredFuelL', () => {
  it('sums all fuel positions', () => {
    expect(minimumRequiredFuelL(makePlan())).toBe(3 + 8 + 40 + 5 + 10 + 15)
  })
})

describe('safeEnduranceMin', () => {
  it('is (onboard / cruise consumption) − 30 min', () => {
    // 100 l onboard, 30 l/h ⇒ 200 min endurance, minus 30 min reserve buffer = 170 min
    expect(safeEnduranceMin(makePlan({ onboardL: 100 }), 30)).toBe(170)
  })

  it('returns 0 for a zero or negative consumption figure', () => {
    expect(safeEnduranceMin(makePlan(), 0)).toBe(0)
  })
})

describe('checkFuelPlan', () => {
  it('warns when onboard fuel is below the minimum required', () => {
    const plan = makePlan({ onboardL: 50 }) // minimum required = 81
    const result = checkFuelPlan(plan, 30)
    expect(result.insufficientFuel).toBe(true)
    expect(result.minimumRequiredL).toBe(81)
  })

  it('does not warn when onboard fuel covers the minimum required', () => {
    const plan = makePlan({ onboardL: 100 })
    const result = checkFuelPlan(plan, 30)
    expect(result.insufficientFuel).toBe(false)
  })
})
