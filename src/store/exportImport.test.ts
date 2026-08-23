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
    // Leer, wie bei jedem in der aktuellen UI neu angelegten Flug — das
    // Feld ist seit Phase 9 gar nicht mehr editierbar (siehe
    // FlightHeader.tsx). Kein aircraftId: das Feld ist optional und wird
    // von der aktuellen UI nicht mehr geschrieben (siehe
    // domain/types.ts::Flight). Beides bewusst so gewählt, damit dieser
    // Helfer echte Exporte aus der App abbildet statt eines Idealfalls.
    transitionLevel: '',
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

  // Regression: ein Nutzer-Export scheiterte am Re-Import mit "transitionLevel
  // fehlt oder ist kein Text; aircraftId fehlt oder ist kein Text" — obwohl
  // beides beim Export einer ganz normal in der App angelegten Datei
  // entstand. Ursache: requireString verbot fälschlich Leerstrings (jeder
  // neue Flug hat transitionLevel: "", da das Feld seit Phase 9 nicht mehr
  // editierbar ist), und aircraftId wurde als Pflichtfeld verlangt, obwohl
  // es im Domain-Typ optional ist und die aktuelle UI es nie schreibt.
  it('accepts an empty transitionLevel (not editable in the current UI)', () => {
    const flight = makeFlight({ transitionLevel: '' })
    expect(() => parseFlightImport(serializeFlight(flight))).not.toThrow()
  })

  it('accepts a flight without aircraftId (optional, unused by the current UI)', () => {
    const flight = makeFlight()
    expect(flight).not.toHaveProperty('aircraftId')
    expect(() => parseFlightImport(serializeFlight(flight))).not.toThrow()
  })

  it('imports a real exported flight with an empty transitionLevel and no aircraftId', () => {
    const exported = {
      kind: 'vfrmate-flight',
      version: 1,
      data: {
        name: 'EDKL->EDXJ',
        date: '2026-08-23',
        departureAerodrome: 'EDKL',
        destinationAerodrome: 'EDXJ',
        etdUtcMin: 900,
        transitionAltitudeFt: 5000,
        transitionLevel: '',
        globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 },
        id: '1ce078ed-05a6-4699-9664-edefad7a7182',
        legs: [{ id: 'leg-1', waypoint: 'EDKL', plannedAltitude: 'Start', tc: 1, distanceNm: 1.6 }],
        legActuals: [],
        aircraftType: 'DR40',
        aircraftRegistration: 'D-EFMD',
      },
    }
    const imported = parseFlightImport(JSON.stringify(exported))
    expect(imported.name).toBe('EDKL->EDXJ')
    expect(imported.aircraftType).toBe('DR40')
  })
})
