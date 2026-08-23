import { describe, expect, it } from 'vitest'
import { computeLegDerived, computeMc, reEstimateEto, totalDistanceNm, totalTimeMin } from './flightPlan'
import type { Flight, Leg } from './types'

function makeLeg(overrides: Partial<Leg> = {}): Leg {
  return {
    id: 'leg-1',
    waypoint: 'A',
    plannedAltitude: '2500 ft',
    tc: 90,
    distanceNm: 20,
    timeMin: 10,
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
    globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 2 },
    legs,
    legActuals: [],
    ...overrides,
  }
}

describe('computeMc', () => {
  it('is TC minus VAR, normalized to 0-359', () => {
    expect(computeMc(90, 3)).toBe(87)
    expect(computeMc(2, 5)).toBe(357)
    expect(computeMc(90, -3)).toBe(93)
  })
})

describe('totalDistanceNm / totalTimeMin', () => {
  it('sum the leg distance/time values', () => {
    const flight = makeFlight([
      makeLeg({ id: 'leg-1', distanceNm: 20, timeMin: 10 }),
      makeLeg({ id: 'leg-2', distanceNm: 15.5, timeMin: 8 }),
    ])
    expect(totalDistanceNm(flight)).toBe(35.5)
    expect(totalTimeMin(flight)).toBe(18)
  })

  it('treats a missing timeMin as 0', () => {
    const flight = makeFlight([makeLeg({ timeMin: undefined })])
    expect(totalTimeMin(flight)).toBe(0)
  })
})

describe('computeLegDerived', () => {
  it('chains MC, cumulative distance/time and remaining time across legs', () => {
    const flight = makeFlight([
      makeLeg({ id: 'leg-1', tc: 90, distanceNm: 20, timeMin: 10 }),
      makeLeg({ id: 'leg-2', tc: 100, distanceNm: 15, timeMin: 8, variationDeg: -1 }),
    ])
    const derived = computeLegDerived(flight)

    expect(derived[0].mc).toBe(88) // 90 - 2 (global VAR)
    expect(derived[0].cumulativeDistanceNm).toBe(20)
    expect(derived[0].cumulativeTimeMin).toBe(10)
    expect(derived[0].remainingTimeMin).toBe(8)

    expect(derived[1].mc).toBe(101) // 100 - (-1) leg override
    expect(derived[1].cumulativeDistanceNm).toBe(35)
    expect(derived[1].cumulativeTimeMin).toBe(18)
    expect(derived[1].remainingTimeMin).toBe(0)
  })
})

describe('reEstimateEto', () => {
  it('keeps the planned ETO (delta 0) with no ATO recorded', () => {
    const flight = makeFlight([makeLeg({ id: 'leg-1', timeMin: 10 })])
    const derived = computeLegDerived(flight)
    const eto = reEstimateEto(flight, derived)

    expect(eto[0].plannedEtoMin).toBe(10)
    expect(eto[0].revisedEtoMin).toBe(10)
    expect(eto[0].deltaMin).toBe(0)
  })

  it('carries the delta from a recorded ATO forward onto later legs', () => {
    const flight = makeFlight(
      [
        makeLeg({ id: 'leg-1', timeMin: 10 }),
        makeLeg({ id: 'leg-2', timeMin: 10 }),
        makeLeg({ id: 'leg-3', timeMin: 10 }),
      ],
      { legActuals: [{ legId: 'leg-1', atoMin: 13 }] }, // 3 min late
    )
    const derived = computeLegDerived(flight)
    const eto = reEstimateEto(flight, derived)

    expect(eto[0].deltaMin).toBe(3)
    expect(eto[0].revisedEtoMin).toBe(13)
    expect(eto[1].plannedEtoMin).toBe(20)
    expect(eto[1].deltaMin).toBe(3)
    expect(eto[1].revisedEtoMin).toBe(23)
    expect(eto[2].deltaMin).toBe(3)
    expect(eto[2].revisedEtoMin).toBe(33)
  })

  it('re-anchors the delta when a later leg also has an ATO', () => {
    const flight = makeFlight(
      [makeLeg({ id: 'leg-1', timeMin: 10 }), makeLeg({ id: 'leg-2', timeMin: 10 }), makeLeg({ id: 'leg-3', timeMin: 10 })],
      {
        legActuals: [
          { legId: 'leg-1', atoMin: 13 }, // +3
          { legId: 'leg-2', atoMin: 18 }, // planned 20, actual 18 -> -2
        ],
      },
    )
    const derived = computeLegDerived(flight)
    const eto = reEstimateEto(flight, derived)

    expect(eto[1].deltaMin).toBe(-2)
    expect(eto[2].deltaMin).toBe(-2)
    expect(eto[2].revisedEtoMin).toBe(28)
  })
})
