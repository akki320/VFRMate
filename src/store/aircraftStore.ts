/**
 * Flugzeugmuster-Verwaltung: unabhängig vom einzelnen Flug gespeichert,
 * anlegen/duplizieren/bearbeiten/löschen. Jede Mutation schreibt sofort
 * nach IndexedDB (Autosave) — kein separater "Speichern"-Schritt.
 */
import { create } from 'zustand'
import type { Aircraft } from '../domain/types'
import * as db from './db'
import { generateId } from './id'

interface AircraftStoreState {
  aircraft: Aircraft[]
  isLoaded: boolean

  loadAll: () => Promise<void>
  add: (input: Omit<Aircraft, 'id'>) => Promise<Aircraft>
  update: (id: string, patch: Partial<Omit<Aircraft, 'id'>>) => Promise<void>
  remove: (id: string) => Promise<void>
  duplicate: (id: string) => Promise<Aircraft | undefined>
}

export const useAircraftStore = create<AircraftStoreState>((set, get) => ({
  aircraft: [],
  isLoaded: false,

  loadAll: async () => {
    const aircraft = await db.listAircraft()
    set({ aircraft, isLoaded: true })
  },

  add: async (input) => {
    const aircraft: Aircraft = { ...input, id: generateId() }
    await db.putAircraft(aircraft)
    set((state) => ({ aircraft: [...state.aircraft, aircraft] }))
    return aircraft
  },

  update: async (id, patch) => {
    const existing = get().aircraft.find((a) => a.id === id)
    if (!existing) return
    const updated: Aircraft = { ...existing, ...patch, id }
    await db.putAircraft(updated)
    set((state) => ({ aircraft: state.aircraft.map((a) => (a.id === id ? updated : a)) }))
  },

  remove: async (id) => {
    await db.deleteAircraft(id)
    set((state) => ({ aircraft: state.aircraft.filter((a) => a.id !== id) }))
  },

  duplicate: async (id) => {
    const source = get().aircraft.find((a) => a.id === id)
    if (!source) return undefined
    const copy: Aircraft = { ...source, id: generateId(), registration: `${source.registration} (Kopie)` }
    await db.putAircraft(copy)
    set((state) => ({ aircraft: [...state.aircraft, copy] }))
    return copy
  },
}))
