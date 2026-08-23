/**
 * Erzeugt einen Beispielflug mit ein paar Legs, damit sich die Tabelle
 * sofort ausprobieren lässt.
 */
import type { Flight } from '../../domain/types'
import { useFlightStore } from '../../store/flightStore'

function demoFlightInput(): Omit<Flight, 'id' | 'legs' | 'legActuals'> {
  return {
    name: 'Beispielflug EDXA–EDXB',
    date: new Date().toISOString().slice(0, 10),
    departureAerodrome: 'EDXA',
    destinationAerodrome: 'EDXB',
    alternateAerodrome: 'EDXC',
    aircraftType: 'Cessna 172S',
    aircraftRegistration: 'D-EFXY',
    etdUtcMin: 9 * 60,
    transitionAltitudeFt: 5000,
    transitionLevel: 'FL065',
    sunsetUtcMin: 19 * 60 + 30,
    globalDefaults: { tasKt: 100, wind: { directionDeg: 250, speedKt: 12 }, variationDeg: 2 },
  }
}

/** Legt einen Demo-Flug an und öffnet ihn direkt. */
export async function createDemoFlight(): Promise<void> {
  await useFlightStore.getState().createNew(demoFlightInput())

  // wca/mh/gs/timeMin/distanceRemainNm sind Piloteneingaben (kein
  // Winddreieck-Automatismus mehr) — hier mit plausiblen, von Hand
  // "vorgerechneten" Werten befüllt, damit der Beispielflug direkt
  // vollständig aussieht.
  const legs: Array<Omit<Flight['legs'][number], 'id'>> = [
    {
      waypoint: 'Kirchturm Musterdorf',
      safetyAltitudeFt: 2500,
      plannedAltitude: '2500 ft',
      tc: 45,
      wca: -3,
      mh: 40,
      distanceNm: 12,
      distanceRemainNm: 49,
      gs: 111,
      timeMin: 6,
    },
    {
      waypoint: 'Stausee Nord',
      safetyAltitudeFt: 2500,
      plannedAltitude: '2500 ft',
      tc: 80,
      wca: 1,
      mh: 79,
      distanceNm: 18,
      distanceRemainNm: 31,
      gs: 112,
      timeMin: 10,
    },
    {
      waypoint: 'Autobahnkreuz',
      safetyAltitudeFt: 3000,
      plannedAltitude: '3000 ft',
      tc: 100,
      wca: 4,
      mh: 102,
      distanceNm: 22,
      distanceRemainNm: 9,
      gs: 117,
      timeMin: 11,
      wind: { directionDeg: 260, speedKt: 18 },
    },
    {
      waypoint: 'EDXB',
      safetyAltitudeFt: 2000,
      plannedAltitude: '2000 ft',
      tc: 130,
      wca: 6,
      mh: 134,
      distanceNm: 9,
      distanceRemainNm: 0,
      gs: 105,
      timeMin: 5,
    },
  ]

  for (const leg of legs) {
    await useFlightStore.getState().addLeg(leg)
  }
}
