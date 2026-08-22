import { describe, expect, it } from 'vitest'
import { computeRunwayCalc } from './runway'
import type { RunwayCorrectionFactors, RunwayTableRow } from './types'

const table: RunwayTableRow[] = [
  { pressureAltitudeFt: 0, temperatureC: 0, groundRunM: 200, distanceOver15mM: 350 },
  { pressureAltitudeFt: 0, temperatureC: 30, groundRunM: 260, distanceOver15mM: 420 },
  { pressureAltitudeFt: 4000, temperatureC: 0, groundRunM: 280, distanceOver15mM: 460 },
  { pressureAltitudeFt: 4000, temperatureC: 30, groundRunM: 360, distanceOver15mM: 560 },
]

const noFactors: RunwayCorrectionFactors = {
  perThousandFtAltitude: 0,
  perDegreeAboveIsa: 0,
  perKnotHeadwind: 0,
  perKnotTailwind: 0,
  perPercentSlopeUphill: 0,
  perPercentSlopeDownhill: 0,
  grassSurface: 0,
  wetOrContaminatedSurface: 0,
}

const baseConditions = {
  pressureAltitudeFt: 0,
  temperatureC: 0,
  headwindComponentKt: 0,
  slopePercent: 0,
  isGrass: false,
  isWetOrContaminated: false,
  availableRunwayLengthM: 1000,
}

describe('computeRunwayCalc', () => {
  it('interpolates the base table exactly at grid points', () => {
    const result = computeRunwayCalc(table, noFactors, baseConditions)
    expect(result.baseGroundRunM).toBe(200)
    expect(result.baseDistanceOver15mM).toBe(350)
    expect(result.correctedGroundRunM).toBe(200)
  })

  it('interpolates bilinearly between grid points', () => {
    const result = computeRunwayCalc(table, noFactors, {
      ...baseConditions,
      pressureAltitudeFt: 2000,
      temperatureC: 15,
    })
    // Midpoint of the 4 corners: (200+260+280+360)/4 = 275
    expect(result.baseGroundRunM).toBe(275)
  })

  it('clamps to the table edges instead of extrapolating', () => {
    const result = computeRunwayCalc(table, noFactors, {
      ...baseConditions,
      pressureAltitudeFt: -1000,
      temperatureC: -20,
    })
    expect(result.baseGroundRunM).toBe(200)
  })

  it('applies a multiplicative altitude surcharge', () => {
    const factors: RunwayCorrectionFactors = { ...noFactors, perThousandFtAltitude: 0.1 }
    const result = computeRunwayCalc(table, factors, { ...baseConditions, pressureAltitudeFt: 0 })
    // at 0 ft the altitude factor is 0, so no surcharge is applied here
    expect(result.correctedGroundRunM).toBe(200)
  })

  it('reduces distance for headwind and increases it for tailwind', () => {
    const factors: RunwayCorrectionFactors = {
      ...noFactors,
      perKnotHeadwind: -0.01,
      perKnotTailwind: 0.01,
    }
    const headwind = computeRunwayCalc(table, factors, { ...baseConditions, headwindComponentKt: 10 })
    const tailwind = computeRunwayCalc(table, factors, { ...baseConditions, headwindComponentKt: -10 })
    expect(headwind.correctedGroundRunM).toBe(180) // 200 * (1 - 0.10)
    expect(tailwind.correctedGroundRunM).toBe(220) // 200 * (1 + 0.10)
  })

  it('applies grass and wet/contaminated surcharges', () => {
    const factors: RunwayCorrectionFactors = { ...noFactors, grassSurface: 0.2, wetOrContaminatedSurface: 0.15 }
    const result = computeRunwayCalc(table, factors, { ...baseConditions, isGrass: true, isWetOrContaminated: true })
    expect(result.correctedGroundRunM).toBe(270) // 200 * 1.35
  })

  it('flags whether the corrected distance fits the available runway length', () => {
    const fits = computeRunwayCalc(table, noFactors, { ...baseConditions, availableRunwayLengthM: 400 })
    expect(fits.withinAvailableLength).toBe(true) // 350 <= 400

    const doesNotFit = computeRunwayCalc(table, noFactors, { ...baseConditions, availableRunwayLengthM: 300 })
    expect(doesNotFit.withinAvailableLength).toBe(false) // 350 > 300
  })
})
