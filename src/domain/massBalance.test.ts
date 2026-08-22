import { describe, expect, it } from 'vitest'
import { computeMassBalance, isWithinEnvelope } from './massBalance'
import type { Aircraft, MassBalance } from './types'

// A simple rectangular CG envelope for testing: mass 600–1000 kg,
// moment (mass × arm) between arm 0.9 m and arm 1.1 m at every mass.
const envelope = [
  { mass: 600, moment: 600 * 0.9 },
  { mass: 600, moment: 600 * 1.1 },
  { mass: 1000, moment: 1000 * 1.1 },
  { mass: 1000, moment: 1000 * 0.9 },
]

describe('isWithinEnvelope', () => {
  it('accepts a point clearly inside the polygon', () => {
    expect(isWithinEnvelope(envelope, { mass: 800, moment: 800 })).toBe(true)
  })

  it('rejects a point clearly outside the polygon', () => {
    expect(isWithinEnvelope(envelope, { mass: 800, moment: 800 * 1.5 })).toBe(false)
  })

  it('rejects a point outside the mass range even with a valid arm', () => {
    expect(isWithinEnvelope(envelope, { mass: 1200, moment: 1200 })).toBe(false)
  })

  it('treats a point exactly on the boundary as inside', () => {
    expect(isWithinEnvelope(envelope, { mass: 600, moment: 600 })).toBe(true)
    expect(isWithinEnvelope(envelope, { mass: 1000, moment: 1000 * 1.1 })).toBe(true)
  })

  it('returns false for a degenerate (too few points) envelope', () => {
    expect(isWithinEnvelope([{ mass: 1, moment: 1 }], { mass: 1, moment: 1 })).toBe(false)
  })
})

function makeAircraft(overrides: Partial<Aircraft> = {}): Aircraft {
  return {
    id: 'ac-1',
    type: 'Cessna 172S',
    registration: 'D-EABC',
    defaultTasKt: 110,
    fuelConsumption: { cruiseLh: 30, climbLh: 35, taxiL: 3 },
    emptyMassKg: 700,
    arms: {
      seatRow1: 1.0,
      seatRow2: 1.9,
      seatRow3: 2.5,
      baggageFront: 0.5,
      baggageMid: 2.2,
      baggageRear: 2.8,
      fuel: 1.05,
    },
    fuelDensityKgPerL: 0.72,
    fuelCapacityL: 200,
    cgEnvelope: envelope,
    takeoffTable: [],
    landingTable: [],
    runwayCorrectionFactors: {
      perThousandFtAltitude: 0,
      perDegreeAboveIsa: 0,
      perKnotHeadwind: 0,
      perKnotTailwind: 0,
      perPercentSlopeUphill: 0,
      perPercentSlopeDownhill: 0,
      grassSurface: 0,
      wetOrContaminatedSurface: 0,
    },
    ...overrides,
  }
}

function makeLoad(overrides: Partial<MassBalance> = {}): MassBalance {
  return {
    emptyMassKg: 700,
    usableFuelL: 100,
    unusableFuelL: 2,
    oilKg: 4,
    seatRow1Kg: 80,
    seatRow2Kg: 0,
    seatRow3Kg: 0,
    baggageFrontKg: 0,
    baggageMidKg: 0,
    baggageRearKg: 0,
    ...overrides,
  }
}

describe('computeMassBalance', () => {
  it('sums mass and moment across all positions and derives the CG', () => {
    const aircraft = makeAircraft()
    const load = makeLoad()
    const result = computeMassBalance(aircraft, load)

    const fuelMassKg = 100 * 0.72
    const expectedTotalMass = 700 + fuelMassKg + 80
    const expectedTotalMoment = fuelMassKg * 1.05 + 80 * 1.0 // Leermasse-Hebelarm ist 0

    expect(result.totalMassKg).toBe(Math.round(expectedTotalMass))
    expect(result.totalMomentKgM).toBeCloseTo(expectedTotalMoment, 6)
    expect(result.cgM).toBeCloseTo(expectedTotalMoment / expectedTotalMass, 6)
  })

  it('flags a loading outside the CG envelope', () => {
    const aircraft = makeAircraft()
    // Massive rear baggage pushes the CG far aft, outside the 0.9–1.1 m envelope.
    const load = makeLoad({ baggageRearKg: 400 })
    const result = computeMassBalance(aircraft, load)
    expect(result.withinEnvelope).toBe(false)
  })
})
