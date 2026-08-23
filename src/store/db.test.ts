import { afterEach, describe, expect, it } from 'vitest'
import {
  _deleteDatabaseForTests,
  deleteAircraft,
  deleteFlight,
  getAircraft,
  getFlight,
  listAircraft,
  listFlights,
  putAircraft,
  putFlight,
} from './db'
import type { Aircraft, Flight } from '../domain/types'

afterEach(async () => {
  await _deleteDatabaseForTests()
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
    cgEnvelope: [],
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

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'flight-1',
    name: 'Testflug',
    date: '2026-08-22',
    departureAerodrome: 'EDXA',
    destinationAerodrome: 'EDXB',
    etdUtcMin: 480,
    transitionAltitudeFt: 5000,
    transitionLevel: 'FL065',
    aircraftId: 'ac-1',
    globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 },
    legs: [],
    legActuals: [],
    ...overrides,
  }
}

describe('aircraft persistence', () => {
  it('round-trips put/get/list/delete', async () => {
    const aircraft = makeAircraft()
    await putAircraft(aircraft)

    expect(await getAircraft(aircraft.id)).toEqual(aircraft)
    expect(await listAircraft()).toEqual([aircraft])

    await deleteAircraft(aircraft.id)
    expect(await getAircraft(aircraft.id)).toBeUndefined()
    expect(await listAircraft()).toEqual([])
  })

  it('overwrites an existing record on put with the same id', async () => {
    await putAircraft(makeAircraft({ registration: 'D-EABC' }))
    await putAircraft(makeAircraft({ registration: 'D-EXYZ' }))

    const all = await listAircraft()
    expect(all).toHaveLength(1)
    expect(all[0].registration).toBe('D-EXYZ')
  })
})

describe('flight persistence', () => {
  it('round-trips put/get/list/delete, including nested legs', async () => {
    const flight = makeFlight({
      legs: [
        {
          id: 'leg-1',
          waypoint: 'EDXY',
          plannedAltitude: '2500 ft',
          tc: 90,
          distanceNm: 30,
        },
      ],
    })
    await putFlight(flight)

    expect(await getFlight(flight.id)).toEqual(flight)
    expect(await listFlights()).toEqual([flight])

    await deleteFlight(flight.id)
    expect(await getFlight(flight.id)).toBeUndefined()
  })

  it('persists an added ATO so it survives a fresh read (crash/reload safety)', async () => {
    const flight = makeFlight({ legActuals: [{ legId: 'leg-1', atoMin: 510 }] })
    await putFlight(flight)

    const reloaded = await getFlight(flight.id)
    expect(reloaded?.legActuals).toEqual([{ legId: 'leg-1', atoMin: 510 }])
  })
})
