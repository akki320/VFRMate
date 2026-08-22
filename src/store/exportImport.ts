/**
 * Export/Import einzelner Flüge und Flugzeugmuster als JSON-Datei. Reine
 * Serialisierungs-/Validierungslogik — das eigentliche Herunterladen/
 * Einlesen einer Datei ist DOM-Sache und liegt in src/ui/lib/fileIO.ts.
 */
import type { Aircraft, Flight } from '../domain/types'

const AIRCRAFT_KIND = 'vfrmate-aircraft'
const FLIGHT_KIND = 'vfrmate-flight'
const EXPORT_VERSION = 1

interface ExportedAircraft {
  kind: typeof AIRCRAFT_KIND
  version: number
  data: Aircraft
}

interface ExportedFlight {
  kind: typeof FLIGHT_KIND
  version: number
  data: Flight
}

export function serializeAircraft(aircraft: Aircraft): string {
  const payload: ExportedAircraft = { kind: AIRCRAFT_KIND, version: EXPORT_VERSION, data: aircraft }
  return JSON.stringify(payload, null, 2)
}

export function serializeFlight(flight: Flight): string {
  const payload: ExportedFlight = { kind: FLIGHT_KIND, version: EXPORT_VERSION, data: flight }
  return JSON.stringify(payload, null, 2)
}

export class ImportValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImportValidationError'
  }
}

type Json = Record<string, unknown>

function parseJson(json: string): Json {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new ImportValidationError('Datei ist kein gültiges JSON.')
  }
  if (!isRecord(parsed)) throw new ImportValidationError('Datei enthält kein Objekt auf oberster Ebene.')
  return parsed
}

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Akzeptiert sowohl das eigene Export-Format ({kind, version, data}) als
 * auch eine "nackte" Aircraft/Flight-Datenstruktur (z.B. manuell erstellt). */
function unwrap(parsed: Json, expectedKind: string): Json {
  if (parsed.kind === expectedKind && isRecord(parsed.data)) return parsed.data
  return parsed
}

function requireString(data: Json, field: string, errors: string[]): void {
  if (typeof data[field] !== 'string' || data[field] === '') errors.push(`${field} fehlt oder ist kein Text`)
}

function requireNumber(data: Json, field: string, errors: string[]): void {
  if (typeof data[field] !== 'number' || Number.isNaN(data[field])) errors.push(`${field} fehlt oder ist keine Zahl`)
}

function requireRecord(data: Json, field: string, errors: string[]): void {
  if (!isRecord(data[field])) errors.push(`${field} fehlt`)
}

function requireArray(data: Json, field: string, errors: string[]): void {
  if (!Array.isArray(data[field])) errors.push(`${field} fehlt oder ist keine Liste`)
}

/** Parst und validiert eine importierte Flugzeugmuster-Datei. Wirft
 * ImportValidationError mit einer verständlichen Fehlerliste, wenn die
 * Datei nicht zum erwarteten Schema passt. Die id wird verworfen — der
 * Aufrufer vergibt beim Speichern eine neue, damit ein Import nie
 * versehentlich ein bestehendes Muster überschreibt. */
export function parseAircraftImport(json: string): Omit<Aircraft, 'id'> {
  const data = unwrap(parseJson(json), AIRCRAFT_KIND)

  const errors: string[] = []
  requireString(data, 'type', errors)
  requireString(data, 'registration', errors)
  requireNumber(data, 'defaultTasKt', errors)
  requireNumber(data, 'emptyMassKg', errors)
  requireNumber(data, 'fuelDensityKgPerL', errors)
  requireNumber(data, 'fuelCapacityL', errors)
  requireRecord(data, 'fuelConsumption', errors)
  requireRecord(data, 'arms', errors)
  requireArray(data, 'cgEnvelope', errors)
  requireArray(data, 'takeoffTable', errors)
  requireArray(data, 'landingTable', errors)
  requireRecord(data, 'runwayCorrectionFactors', errors)

  if (errors.length > 0) {
    throw new ImportValidationError(`Ungültige Flugzeugmuster-Datei: ${errors.join('; ')}.`)
  }

  const { id: _id, ...rest } = data as Json & { id?: unknown }
  return rest as unknown as Omit<Aircraft, 'id'>
}

/** Parst und validiert eine importierte Flug-Datei. Wie bei Aircraft wird
 * die id verworfen und vom Aufrufer neu vergeben. */
export function parseFlightImport(json: string): Omit<Flight, 'id'> {
  const data = unwrap(parseJson(json), FLIGHT_KIND)

  const errors: string[] = []
  requireString(data, 'name', errors)
  requireString(data, 'date', errors)
  requireString(data, 'departureAerodrome', errors)
  requireString(data, 'destinationAerodrome', errors)
  requireNumber(data, 'etdUtcMin', errors)
  requireNumber(data, 'transitionAltitudeFt', errors)
  requireString(data, 'transitionLevel', errors)
  requireString(data, 'aircraftId', errors)
  requireRecord(data, 'globalDefaults', errors)
  requireArray(data, 'legs', errors)
  requireArray(data, 'legActuals', errors)

  if (errors.length > 0) {
    throw new ImportValidationError(`Ungültige Flug-Datei: ${errors.join('; ')}.`)
  }

  const { id: _id, ...rest } = data as Json & { id?: unknown }
  return rest as unknown as Omit<Flight, 'id'>
}
