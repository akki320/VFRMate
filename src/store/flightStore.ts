/**
 * Flug-Verwaltung: Liste aller gespeicherten Flüge + der aktuell geöffnete
 * Flug. Jede Mutation am aktuellen Flug (Leg-Änderung, ATO-Eintrag, ...)
 * schreibt sofort nach IndexedDB — Autosave, damit ein Absturz oder Reload
 * im Flug keine ATOs verliert (siehe patchCurrentFlight).
 */
import { create } from 'zustand'
import type { Flight, Leg } from '../domain/types'
import * as db from './db'
import { generateId } from './id'

interface FlightStoreState {
  flights: Flight[]
  currentFlight: Flight | undefined
  isLoaded: boolean

  loadAll: () => Promise<void>
  createNew: (input: Omit<Flight, 'id' | 'legs' | 'legActuals'>) => Promise<Flight>
  /** Legt einen Flug aus vollständigen (importierten) Daten an — anders
   * als createNew() bleiben Legs/ATOs dabei erhalten. Vergibt immer eine
   * neue id, damit ein Import nie einen bestehenden Flug überschreibt. */
  importFlight: (input: Omit<Flight, 'id'>) => Promise<Flight>
  open: (id: string) => void
  closeCurrent: () => void
  duplicateAsTemplate: (id: string) => Promise<Flight | undefined>
  remove: (id: string) => Promise<void>

  /** Generischer, sofort persistierender Patch auf den aktuellen Flug.
   * Alle spezifischeren Mutatoren (addLeg, recordAto, ...) bauen darauf
   * auf. Kein Auto-Save-Timer nötig, weil jede Aktion synchron im
   * Anschluss an die State-Änderung schreibt. */
  patchCurrentFlight: (patch: Partial<Flight> | ((flight: Flight) => Flight)) => Promise<void>

  addLeg: (leg: Omit<Leg, 'id'>) => Promise<void>
  updateLeg: (legId: string, patch: Partial<Omit<Leg, 'id'>>) => Promise<void>
  removeLeg: (legId: string) => Promise<void>
  reorderLegs: (orderedLegIds: string[]) => Promise<void>

  recordAto: (legId: string, atoUtcMin: number) => Promise<void>
  clearAto: (legId: string) => Promise<void>
}

export const useFlightStore = create<FlightStoreState>((set, get) => ({
  flights: [],
  currentFlight: undefined,
  isLoaded: false,

  loadAll: async () => {
    const flights = await db.listFlights()
    set({ flights, isLoaded: true })
  },

  createNew: async (input) => {
    const flight: Flight = { ...input, id: generateId(), legs: [], legActuals: [] }
    await db.putFlight(flight)
    set((state) => ({ flights: [...state.flights, flight], currentFlight: flight }))
    return flight
  },

  importFlight: async (input) => {
    const flight: Flight = { ...input, id: generateId() }
    await db.putFlight(flight)
    set((state) => ({ flights: [...state.flights, flight] }))
    return flight
  },

  open: (id) => {
    set({ currentFlight: get().flights.find((f) => f.id === id) })
  },

  closeCurrent: () => set({ currentFlight: undefined }),

  duplicateAsTemplate: async (id) => {
    const source = get().flights.find((f) => f.id === id)
    if (!source) return undefined
    const copy: Flight = {
      ...source,
      id: generateId(),
      name: `${source.name} (Kopie)`,
      atdUtcMin: undefined,
      legActuals: [],
      legs: source.legs.map((leg) => ({ ...leg, id: generateId() })),
    }
    await db.putFlight(copy)
    set((state) => ({ flights: [...state.flights, copy] }))
    return copy
  },

  remove: async (id) => {
    await db.deleteFlight(id)
    set((state) => ({
      flights: state.flights.filter((f) => f.id !== id),
      currentFlight: state.currentFlight?.id === id ? undefined : state.currentFlight,
    }))
  },

  patchCurrentFlight: async (patch) => {
    const current = get().currentFlight
    if (!current) return
    const updated = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
    await db.putFlight(updated)
    set((state) => ({
      currentFlight: updated,
      flights: state.flights.map((f) => (f.id === updated.id ? updated : f)),
    }))
  },

  addLeg: async (legInput) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legs: [...flight.legs, { ...legInput, id: generateId() }],
    }))
  },

  updateLeg: async (legId, patch) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legs: flight.legs.map((leg) => (leg.id === legId ? { ...leg, ...patch } : leg)),
    }))
  },

  removeLeg: async (legId) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legs: flight.legs.filter((leg) => leg.id !== legId),
      legActuals: flight.legActuals.filter((a) => a.legId !== legId),
    }))
  },

  reorderLegs: async (orderedLegIds) => {
    await get().patchCurrentFlight((flight) => {
      const byId = new Map(flight.legs.map((leg) => [leg.id, leg]))
      const reordered = orderedLegIds
        .map((id) => byId.get(id))
        .filter((leg): leg is Leg => leg !== undefined)
      return { ...flight, legs: reordered }
    })
  },

  recordAto: async (legId, atoUtcMin) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legActuals: [...flight.legActuals.filter((a) => a.legId !== legId), { legId, atoUtcMin }],
    }))
  },

  clearAto: async (legId) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legActuals: flight.legActuals.filter((a) => a.legId !== legId),
    }))
  },
}))
