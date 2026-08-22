import { describe, expect, it } from 'vitest'
import {
  ImportValidationError,
  parseAircraftImport,
  parseFlightImport,
  serializeAircraft,
  serializeFlight,
} from './exportImport'
import type { Aircraft, Flight } from '../domain/types'

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
    cgEnvelope: [{ mass: 600, moment: 540 }],
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

describe('serializeAircraft / parseAircraftImport', () => {
  it('round-trips an aircraft through export and import, dropping the id', () => {
    const aircraft = makeAircraft()
    const json = serializeAircraft(aircraft)
    const imported = parseAircraftImport(json)

    expect(imported).not.toHaveProperty('id')
    expect(imported.type).toBe(aircraft.type)
    expect(imported.registration).toBe(aircraft.registration)
    expect(imported.cgEnvelope).toEqual(aircraft.cgEnvelope)
  })

  it('also accepts a bare Aircraft object without the export wrapper', () => {
    const { id, ...bare } = makeAircraft()
    void id
    const imported = parseAircraftImport(JSON.stringify(bare))
    expect(imported.type).toBe('Cessna 172S')
  })

  it('rejects malformed JSON', () => {
    expect(() => parseAircraftImport('{not json')).toThrow(ImportValidationError)
  })

  it('rejects an object missing required fields, listing what is missing', () => {
    expect(() => parseAircraftImport(JSON.stringify({ type: 'X' }))).toThrow(/registration/)
  })

  it('rejects a JSON array at the top level', () => {
    expect(() => parseAircraftImport('[]')).toThrow(ImportValidationError)
  })
})

describe('serializeFlight / parseFlightImport', () => {
  it('round-trips a flight through export and import, dropping the id', () => {
    const flight = makeFlight({
      legs: [{ id: 'leg-1', waypoint: 'EDXY', plannedAltitude: '2500 ft', tc: 90, distanceNm: 30 }],
    })
    const json = serializeFlight(flight)
    const imported = parseFlightImport(json)

    expect(imported).not.toHaveProperty('id')
    expect(imported.name).toBe(flight.name)
    expect(imported.legs).toHaveLength(1)
    expect(imported.legs[0].waypoint).toBe('EDXY')
  })

  it('rejects an object missing required fields', () => {
    expect(() => parseFlightImport(JSON.stringify({ name: 'X' }))).toThrow(/departureAerodrome/)
  })
})
