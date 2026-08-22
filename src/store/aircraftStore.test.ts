import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useAircraftStore } from './aircraftStore'
import { _deleteDatabaseForTests, listAircraft } from './db'
import type { Aircraft } from '../domain/types'

const initialState = useAircraftStore.getState()

beforeEach(() => {
  useAircraftStore.setState(initialState, true)
})

afterEach(async () => {
  await _deleteDatabaseForTests()
})

function makeAircraftInput(overrides: Partial<Omit<Aircraft, 'id'>> = {}): Omit<Aircraft, 'id'> {
  return {
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

describe('useAircraftStore', () => {
  it('adds an aircraft, updates local state and persists it', async () => {
    const created = await useAircraftStore.getState().add(makeAircraftInput())

    expect(useAircraftStore.getState().aircraft).toEqual([created])
    expect(await listAircraft()).toEqual([created])
  })

  it('loadAll hydrates state from IndexedDB', async () => {
    const created = await useAircraftStore.getState().add(makeAircraftInput())
    // Simulate a fresh app start: reset in-memory state, then reload.
    useAircraftStore.setState(initialState, true)
    expect(useAircraftStore.getState().aircraft).toEqual([])

    await useAircraftStore.getState().loadAll()
    expect(useAircraftStore.getState().aircraft).toEqual([created])
    expect(useAircraftStore.getState().isLoaded).toBe(true)
  })

  it('update() merges a patch and persists it', async () => {
    const created = await useAircraftStore.getState().add(makeAircraftInput({ registration: 'D-EAAA' }))
    await useAircraftStore.getState().update(created.id, { registration: 'D-EBBB' })

    expect(useAircraftStore.getState().aircraft[0].registration).toBe('D-EBBB')
    expect((await listAircraft())[0].registration).toBe('D-EBBB')
  })

  it('duplicate() clones with a new id and marks the registration as a copy', async () => {
    const original = await useAircraftStore.getState().add(makeAircraftInput({ registration: 'D-EAAA' }))
    const copy = await useAircraftStore.getState().duplicate(original.id)

    expect(copy).toBeDefined()
    expect(copy!.id).not.toBe(original.id)
    expect(copy!.registration).toBe('D-EAAA (Kopie)')
    expect(useAircraftStore.getState().aircraft).toHaveLength(2)
  })

  it('remove() deletes from state and IndexedDB', async () => {
    const created = await useAircraftStore.getState().add(makeAircraftInput())
    await useAircraftStore.getState().remove(created.id)

    expect(useAircraftStore.getState().aircraft).toEqual([])
    expect(await listAircraft()).toEqual([])
  })
})
