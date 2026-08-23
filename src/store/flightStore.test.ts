import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useFlightStore } from './flightStore'
import { _deleteDatabaseForTests, getFlight } from './db'
import type { Flight } from '../domain/types'

const initialState = useFlightStore.getState()

beforeEach(() => {
  useFlightStore.setState(initialState, true)
})

afterEach(async () => {
  await _deleteDatabaseForTests()
})

function makeFlightInput(
  overrides: Partial<Omit<Flight, 'id' | 'legs' | 'legActuals'>> = {},
): Omit<Flight, 'id' | 'legs' | 'legActuals'> {
  return {
    name: 'Testflug',
    date: '2026-08-22',
    departureAerodrome: 'EDXA',
    destinationAerodrome: 'EDXB',
    etdUtcMin: 480,
    transitionAltitudeFt: 5000,
    transitionLevel: 'FL065',
    aircraftId: 'ac-1',
    globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 },
    ...overrides,
  }
}

describe('useFlightStore', () => {
  it('importFlight adds a flight with a fresh id, preserving legs/legActuals, without opening it', async () => {
    const imported = await useFlightStore.getState().importFlight({
      ...makeFlightInput(),
      legs: [{ id: 'leg-1', waypoint: 'EDXY', plannedAltitude: '2500 ft', tc: 90, distanceNm: 30 }],
      legActuals: [{ legId: 'leg-1', atoMin: 500 }],
    })

    expect(imported.id).toBeTruthy()
    expect(imported.legs).toHaveLength(1)
    expect(imported.legActuals).toEqual([{ legId: 'leg-1', atoMin: 500 }])
    expect(useFlightStore.getState().flights).toEqual([imported])
    expect(useFlightStore.getState().currentFlight).toBeUndefined()
    expect(await getFlight(imported.id)).toEqual(imported)
  })

  it('creates a flight, opens it as currentFlight and persists it', async () => {
    const created = await useFlightStore.getState().createNew(makeFlightInput())

    expect(useFlightStore.getState().currentFlight).toEqual(created)
    expect(useFlightStore.getState().flights).toEqual([created])
    expect(await getFlight(created.id)).toEqual(created)
  })

  it('loadAll hydrates the flight list from IndexedDB after a simulated restart', async () => {
    const created = await useFlightStore.getState().createNew(makeFlightInput())
    useFlightStore.setState(initialState, true)
    expect(useFlightStore.getState().flights).toEqual([])

    await useFlightStore.getState().loadAll()
    expect(useFlightStore.getState().flights).toEqual([created])

    useFlightStore.getState().open(created.id)
    expect(useFlightStore.getState().currentFlight).toEqual(created)
  })

  it('addLeg appends a leg to the current flight and persists it', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({
      waypoint: 'EDXY',
      plannedAltitude: '2500 ft',
      tc: 90,
      distanceNm: 30,
    })

    const current = useFlightStore.getState().currentFlight!
    expect(current.legs).toHaveLength(1)
    expect(current.legs[0].waypoint).toBe('EDXY')

    const persisted = await getFlight(current.id)
    expect(persisted?.legs).toHaveLength(1)
  })

  it('updateLeg patches a single leg by id', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const legId = useFlightStore.getState().currentFlight!.legs[0].id

    await useFlightStore.getState().updateLeg(legId, { distanceNm: 15 })
    expect(useFlightStore.getState().currentFlight!.legs[0].distanceNm).toBe(15)
  })

  it('removeLeg drops the leg and any of its ATO entries', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const legId = useFlightStore.getState().currentFlight!.legs[0].id
    await useFlightStore.getState().recordAto(legId, 500)

    await useFlightStore.getState().removeLeg(legId)
    expect(useFlightStore.getState().currentFlight!.legs).toEqual([])
    expect(useFlightStore.getState().currentFlight!.legActuals).toEqual([])
  })

  it('reorderLegs reorders legs by the given id sequence', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    await useFlightStore.getState().addLeg({ waypoint: 'B', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const [first, second] = useFlightStore.getState().currentFlight!.legs

    await useFlightStore.getState().reorderLegs([second.id, first.id])
    expect(useFlightStore.getState().currentFlight!.legs.map((l) => l.waypoint)).toEqual(['B', 'A'])
  })

  it('recordAto is immediately persisted (crash/reload must not lose it)', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const legId = useFlightStore.getState().currentFlight!.legs[0].id

    await useFlightStore.getState().recordAto(legId, 495)

    const persisted = await getFlight(useFlightStore.getState().currentFlight!.id)
    expect(persisted?.legActuals).toEqual([{ legId, atoMin: 495 }])
  })

  it('recordAto overwrites a previous ATO for the same leg instead of duplicating it', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const legId = useFlightStore.getState().currentFlight!.legs[0].id

    await useFlightStore.getState().recordAto(legId, 495)
    await useFlightStore.getState().recordAto(legId, 497) // long-press correction

    expect(useFlightStore.getState().currentFlight!.legActuals).toEqual([{ legId, atoMin: 497 }])
  })

  it('clearAto removes the ATO entry again', async () => {
    await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const legId = useFlightStore.getState().currentFlight!.legs[0].id
    await useFlightStore.getState().recordAto(legId, 495)

    await useFlightStore.getState().clearAto(legId)
    expect(useFlightStore.getState().currentFlight!.legActuals).toEqual([])
  })

  it('resetProgress clears all ATOs and the ATD, keeping legs/planning intact', async () => {
    await useFlightStore.getState().createNew(makeFlightInput({ atdUtcMin: 481 }))
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    await useFlightStore.getState().addLeg({ waypoint: 'B', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const [legA, legB] = useFlightStore.getState().currentFlight!.legs
    await useFlightStore.getState().recordAto(legA.id, 495)
    await useFlightStore.getState().recordAto(legB.id, 520)

    await useFlightStore.getState().resetProgress()

    const flight = useFlightStore.getState().currentFlight!
    expect(flight.legActuals).toEqual([])
    expect(flight.atdUtcMin).toBeUndefined()
    expect(flight.legs.map((l) => l.waypoint)).toEqual(['A', 'B'])
  })

  it('duplicateAsTemplate clones legs with fresh ids and clears ATD/legActuals', async () => {
    await useFlightStore.getState().createNew(makeFlightInput({ atdUtcMin: 481 }))
    await useFlightStore.getState().addLeg({ waypoint: 'A', plannedAltitude: '2000 ft', tc: 0, distanceNm: 10 })
    const original = useFlightStore.getState().currentFlight!
    await useFlightStore.getState().recordAto(original.legs[0].id, 495)
    const originalWithAto = useFlightStore.getState().currentFlight!

    const copy = await useFlightStore.getState().duplicateAsTemplate(originalWithAto.id)

    expect(copy).toBeDefined()
    expect(copy!.id).not.toBe(originalWithAto.id)
    expect(copy!.name).toBe('Testflug (Kopie)')
    expect(copy!.atdUtcMin).toBeUndefined()
    expect(copy!.legActuals).toEqual([])
    expect(copy!.legs[0].id).not.toBe(originalWithAto.legs[0].id)
    expect(copy!.legs[0].waypoint).toBe('A')
  })

  it('remove deletes the flight and clears currentFlight if it was open', async () => {
    const created = await useFlightStore.getState().createNew(makeFlightInput())
    await useFlightStore.getState().remove(created.id)

    expect(useFlightStore.getState().flights).toEqual([])
    expect(useFlightStore.getState().currentFlight).toBeUndefined()
    expect(await getFlight(created.id)).toBeUndefined()
  })
})
