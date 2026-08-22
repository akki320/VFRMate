/**
 * IndexedDB-Persistenz via `idb`. Kein Backend, keine Cloud — alles bleibt
 * lokal im Browser-Storage des Geräts. Diese Datei kennt nur Rohdaten
 * (Aircraft/Flight); Ableitungen/Berechnungen bleiben Sache von
 * src/domain/.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Aircraft, Flight } from '../domain/types'

interface VfrDbSchema extends DBSchema {
  aircraft: {
    key: string
    value: Aircraft
  }
  flights: {
    key: string
    value: Flight
  }
}

const DB_NAME = 'vfr-flugdurchfuehrungsplan'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<VfrDbSchema>> | undefined

function getDb(): Promise<IDBPDatabase<VfrDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<VfrDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('aircraft')) {
          db.createObjectStore('aircraft', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('flights')) {
          db.createObjectStore('flights', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/** Only for tests: forces the next getDb() call to open a fresh
 * connection, so each test can start from an empty (freshly-deleted)
 * database instead of sharing the previous test's cached handle. */
export function _resetDbHandleForTests(): void {
  dbPromise = undefined
}

/** Only for tests: drops the whole database and resets the cached
 * connection, so each test starts from a clean slate. Closes the current
 * connection first — otherwise deleteDatabase() blocks forever waiting
 * for a close that never comes. */
export async function _deleteDatabaseForTests(): Promise<void> {
  if (dbPromise) {
    ;(await dbPromise).close()
  }
  dbPromise = undefined
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error as Error)
    request.onblocked = () => resolve()
  })
}

// ---- Aircraft -------------------------------------------------------

export async function listAircraft(): Promise<Aircraft[]> {
  return (await getDb()).getAll('aircraft')
}

export async function getAircraft(id: string): Promise<Aircraft | undefined> {
  return (await getDb()).get('aircraft', id)
}

export async function putAircraft(aircraft: Aircraft): Promise<void> {
  await (await getDb()).put('aircraft', aircraft)
}

export async function deleteAircraft(id: string): Promise<void> {
  await (await getDb()).delete('aircraft', id)
}

// ---- Flights ----------------------------------------------------------

export async function listFlights(): Promise<Flight[]> {
  return (await getDb()).getAll('flights')
}

export async function getFlight(id: string): Promise<Flight | undefined> {
  return (await getDb()).get('flights', id)
}

export async function putFlight(flight: Flight): Promise<void> {
  await (await getDb()).put('flights', flight)
}

export async function deleteFlight(id: string): Promise<void> {
  await (await getDb()).delete('flights', id)
}
