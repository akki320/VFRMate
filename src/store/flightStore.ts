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

  recordAto: (legId: string, atoMin: number) => Promise<void>
  clearAto: (legId: string) => Promise<void>
  /** Setzt (oder löscht) die ATD. Anders als ein roher
   * `patchCurrentFlight({ atdUtcMin })` verschiebt dies zugleich alle
   * bereits erfassten ATOs um dasselbe Delta — siehe Begründung an der
   * Implementierung. */
  setAtd: (atdUtcMin: number | undefined) => Promise<void>
  /** Setzt den Flugfortschritt zurück: löscht alle ATOs und die ATD, ohne
   * Legs/Planung anzurühren — die ETOs fallen dadurch wieder auf ihre
   * ursprünglich geplanten Werte zurück (kein Re-Estimate-Delta mehr). */
  resetProgress: () => Promise<void>
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

  recordAto: async (legId, atoMin) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legActuals: [...flight.legActuals.filter((a) => a.legId !== legId), { legId, atoMin }],
    }))
  },

  clearAto: async (legId) => {
    await get().patchCurrentFlight((flight) => ({
      ...flight,
      legActuals: flight.legActuals.filter((a) => a.legId !== legId),
    }))
  },

  /**
   * `LegActual.atoMin` ist "Minuten seit dem Anker" (ATD, bzw. ETD, solange
   * noch keine ATD gesetzt ist — siehe types.ts::LegActual). Dieser Anker
   * ist aber nicht fix: Tippt der Pilot "Überflug", bevor er die ATD
   * einträgt (z.B. direkt nach dem Start, ATD folgt erst kurz danach),
   * steht zu diesem Zeitpunkt noch die ETD als Anker — das erfasste
   * atoMin bildet exakt den damals real beobachteten Uhrzeitpunkt ab
   * (Anker + atoMin = diese Uhrzeit). Wird die ATD danach gesetzt oder
   * nachträglich korrigiert, verschiebt sich der Anker, und ohne
   * Gegenmaßnahme würde dieselbe Zahl atoMin plötzlich eine ANDERE,
   * falsche Uhrzeit ergeben — ein bereits geschehener, fester Moment darf
   * sich aber nie rückwirkend verschieben, nur weil später eine genauere
   * ATD eingetragen wird.
   *
   * Deshalb verschiebt setAtd alle bereits vorhandenen legActuals um genau
   * das Delta zwischen altem und neuem Anker (oldAnchor − newAnchor), bevor
   * die neue ATD übernommen wird — die reale Uhrzeit jedes bereits
   * erfassten ATO bleibt dadurch unverändert, exakt wie bei einer noch
   * nicht erfassten (rein geplanten) Zeile, die sich bewusst WEITER mit
   * dem Anker mitverschiebt (siehe useFlightTableViewModel.ts).
   */
  setAtd: async (atdUtcMin) => {
    await get().patchCurrentFlight((flight) => {
      const oldAnchor = flight.atdUtcMin ?? flight.etdUtcMin
      const newAnchor = atdUtcMin ?? flight.etdUtcMin
      const delta = oldAnchor - newAnchor
      return {
        ...flight,
        atdUtcMin,
        legActuals: delta === 0 ? flight.legActuals : flight.legActuals.map((a) => ({ ...a, atoMin: a.atoMin + delta })),
      }
    })
  },

  resetProgress: async () => {
    await get().patchCurrentFlight((flight) => ({ ...flight, legActuals: [], atdUtcMin: undefined }))
  },
}))
