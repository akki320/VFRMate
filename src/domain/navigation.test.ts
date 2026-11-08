import { describe, expect, it } from 'vitest'
import { computeFlightLegs, courseChain, legTime, reEstimateLegs, resolveLeg, windTriangle } from './navigation'
import type { Flight, Leg } from './types'

describe('windTriangle', () => {
  it('returns zero WCA with no wind', () => {
    const { wca, gs } = windTriangle(90, 100, { directionDeg: 0, speedKt: 0 })
    expect(wca).toBe(0)
    expect(gs).toBe(100)
  })

  it('gives a negative WCA and reduced GS for a crosswind from the left-of-track side pushing right', () => {
    // TC 000, wind FROM 270 (blows toward east) at 20 kt: pushes the
    // aircraft to the right of track, so the correction (and TH) must be
    // to the left of TC ⇒ WCA negative. This is also a pure crosswind,
    // so GS should be reduced only slightly (no head/tailwind component).
    const { wca, gs } = windTriangle(0, 100, { directionDeg: 270, speedKt: 20 })
    expect(wca).toBeLessThan(0)
    expect(wca).toBe(-12) // asin(20/100) ≈ 11.54° → rounds to 12
    expect(gs).toBeCloseTo(100 * Math.cos((-12 * Math.PI) / 180), 0)
  })

  it('gives a positive WCA for wind from the right-of-track side', () => {
    const { wca } = windTriangle(0, 100, { directionDeg: 90, speedKt: 20 })
    expect(wca).toBeGreaterThan(0)
  })

  it('reduces GS to TAS − wind speed for a straight headwind', () => {
    const { wca, gs } = windTriangle(0, 100, { directionDeg: 0, speedKt: 20 })
    expect(wca).toBe(0)
    expect(gs).toBe(80)
  })

  it('increases GS to TAS + wind speed for a straight tailwind', () => {
    const { wca, gs } = windTriangle(0, 100, { directionDeg: 180, speedKt: 20 })
    expect(wca).toBe(0)
    expect(gs).toBe(120)
  })

  it('clamps WCA to ±90° when the crosswind exceeds TAS (unsolvable triangle)', () => {
    const { wca } = windTriangle(0, 10, { directionDeg: 90, speedKt: 50 })
    expect(Math.abs(wca)).toBeLessThanOrEqual(90)
  })
})

describe('courseChain', () => {
  // VAR-Vorzeichen seit Phase 20: negativ = östliche Missweisung, positiv
  // = westliche — wie in SkyDemon direkt ablesbar (siehe Doc-Kommentar an
  // courseChain). Addiert statt subtrahiert, daher VAR hier negativ für
  // "östlich".
  it('adds WCA to TC to get TH, and adds (negative) easterly VAR to get MH/MC', () => {
    const { th, mh, mc } = courseChain(90, 5, -3)
    expect(th).toBe(95)
    expect(mh).toBe(92)
    expect(mc).toBe(87)
  })

  it('adds a positive (westerly) VAR straight to TH/TC', () => {
    const { mh, mc } = courseChain(90, 0, 3)
    expect(mh).toBe(93)
    expect(mc).toBe(93)
  })

  it('normalizes results into 0–359', () => {
    const { th } = courseChain(359, 5, 0)
    expect(th).toBe(4)
    const { mc } = courseChain(2, 0, 5)
    expect(mc).toBe(7)
    const { mh } = courseChain(2, 0, -5)
    expect(mh).toBe(357)
  })
})

describe('legTime', () => {
  it('computes minutes from distance and GS, rounded to whole minutes', () => {
    expect(legTime(60, 120)).toBe(30)
    expect(legTime(10, 90)).toBe(7) // 6.666.. → 7
  })

  it('returns 0 for zero or negative GS instead of Infinity/NaN', () => {
    expect(legTime(10, 0)).toBe(0)
    expect(legTime(10, -5)).toBe(0)
  })
})

function makeLeg(overrides: Partial<Leg>): Leg {
  return {
    id: 'leg-1',
    waypoint: 'EDXY',
    plannedAltitude: '2500 ft',
    tc: 90,
    distanceNm: 60,
    tasKt: 120,
    wind: { directionDeg: 0, speedKt: 0 },
    variationDeg: 0,
    ...overrides,
  }
}

function makeFlight(legs: Leg[], overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'flight-1',
    name: 'Testflug',
    date: '2026-08-22',
    departureAerodrome: 'EDXA',
    destinationAerodrome: 'EDXB',
    etdUtcMin: 8 * 60,
    transitionAltitudeFt: 5000,
    transitionLevel: 'FL065',
    aircraftId: 'ac-1',
    globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 },
    legs,
    legActuals: [],
    ...overrides,
  }
}

describe('resolveLeg', () => {
  it('falls back to the flight-wide global defaults when a leg field is unset', () => {
    const leg = makeLeg({ tasKt: undefined, wind: undefined, variationDeg: undefined })
    const flight = makeFlight([leg], {
      globalDefaults: { tasKt: 95, wind: { directionDeg: 270, speedKt: 15 }, variationDeg: 2 },
    })
    const resolved = resolveLeg(flight, leg)

    expect(resolved.tasKt).toBe(95)
    expect(resolved.wind).toEqual({ directionDeg: 270, speedKt: 15 })
    expect(resolved.variationDeg).toBe(2)
    expect(resolved.tasKtIsOverridden).toBe(false)
    expect(resolved.windIsOverridden).toBe(false)
    expect(resolved.variationDegIsOverridden).toBe(false)
  })

  it('lets a leg-level value override the global default and flags it as overridden', () => {
    const leg = makeLeg({ tasKt: 130, wind: undefined, variationDeg: undefined })
    const flight = makeFlight([leg], {
      globalDefaults: { tasKt: 95, wind: { directionDeg: 270, speedKt: 15 }, variationDeg: 2 },
    })
    const resolved = resolveLeg(flight, leg)

    expect(resolved.tasKt).toBe(130)
    expect(resolved.tasKtIsOverridden).toBe(true)
    expect(resolved.wind).toEqual({ directionDeg: 270, speedKt: 15 })
    expect(resolved.windIsOverridden).toBe(false)
  })
})

describe('computeFlightLegs', () => {
  it('chains cumulative time, remaining time/distance and ETO across legs', () => {
    const legs = [
      makeLeg({ id: 'leg-1', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }), // 30 min
      makeLeg({ id: 'leg-2', distanceNm: 30, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }), // 15 min
    ]
    const flight = makeFlight(legs, { etdUtcMin: 8 * 60 })
    const computed = computeFlightLegs(flight)

    expect(computed[0].legTimeMin).toBe(30)
    expect(computed[0].cumulativeTimeMin).toBe(30)
    expect(computed[0].remainingDistanceNm).toBe(30)
    expect(computed[0].remainingTimeMin).toBe(15)
    expect(computed[0].etoUtcMin).toBe(8 * 60 + 30)

    expect(computed[1].cumulativeTimeMin).toBe(45)
    expect(computed[1].remainingDistanceNm).toBe(0)
    expect(computed[1].remainingTimeMin).toBe(0)
    expect(computed[1].etoUtcMin).toBe(8 * 60 + 45)
  })
})

describe('reEstimateLegs', () => {
  it('carries the delta from an ATO forward onto later legs', () => {
    const legs = [
      makeLeg({ id: 'leg-1', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }), // planned 30 min
      makeLeg({ id: 'leg-2', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }), // planned 30 min
      makeLeg({ id: 'leg-3', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }), // planned 30 min
    ]
    const flight = makeFlight(legs, {
      etdUtcMin: 8 * 60,
      atdUtcMin: 8 * 60,
      legActuals: [{ legId: 'leg-1', atoMin: 8 * 60 + 33 }], // 3 min late
    })
    const computed = computeFlightLegs(flight)
    const reEstimated = reEstimateLegs(flight, computed)

    expect(reEstimated[0].deltaMin).toBe(3)
    expect(reEstimated[0].revisedEtoUtcMin).toBe(8 * 60 + 33)
    expect(reEstimated[0].actualGsKt).toBe(109) // 60 NM / 33 min * 60 ≈ 109.09 kt

    // Planned ETO for leg 2 is 09:00 (60 min after ETD); revised = +3 min carried forward.
    expect(reEstimated[1].deltaMin).toBe(3)
    expect(reEstimated[1].revisedEtoUtcMin).toBe(computed[1].etoUtcMin + 3)

    expect(reEstimated[2].deltaMin).toBe(3)
    expect(reEstimated[2].revisedEtoUtcMin).toBe(computed[2].etoUtcMin + 3)
  })

  it('re-anchors the delta when a later leg also has an ATO', () => {
    const legs = [
      makeLeg({ id: 'leg-1', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }),
      makeLeg({ id: 'leg-2', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }),
      makeLeg({ id: 'leg-3', distanceNm: 60, tasKt: 120, wind: { directionDeg: 0, speedKt: 0 } }),
    ]
    const flight = makeFlight(legs, {
      etdUtcMin: 8 * 60,
      atdUtcMin: 8 * 60,
      legActuals: [
        { legId: 'leg-1', atoMin: 8 * 60 + 33 }, // +3
        { legId: 'leg-2', atoMin: 8 * 60 + 33 + 25 }, // this leg flown in 25 min → -2 vs planned 09:00
      ],
    })
    const computed = computeFlightLegs(flight)
    const reEstimated = reEstimateLegs(flight, computed)

    expect(reEstimated[1].deltaMin).toBe(-2)
    expect(reEstimated[2].deltaMin).toBe(-2)
  })

  it('keeps the planned ETO (delta 0) when no ATO has been entered yet', () => {
    const legs = [makeLeg({ id: 'leg-1' })]
    const flight = makeFlight(legs)
    const computed = computeFlightLegs(flight)
    const reEstimated = reEstimateLegs(flight, computed)

    expect(reEstimated[0].deltaMin).toBe(0)
    expect(reEstimated[0].revisedEtoUtcMin).toBe(computed[0].etoUtcMin)
    expect(reEstimated[0].actualGsKt).toBeUndefined()
  })
})
