/**
 * Erzeugt ein Beispiel-Flugzeugmuster + einen Beispielflug mit ein paar
 * Legs, damit sich Bildschirm 1 (Flugdurchführung) schon jetzt end-to-end
 * ausprobieren lässt — als Platzhalter, bis Bildschirm 2 (Planung) echte
 * Flüge anlegen kann.
 */
import type { Aircraft, Flight } from '../../domain/types'
import { useAircraftStore } from '../../store/aircraftStore'
import { useFlightStore } from '../../store/flightStore'

const DEMO_AIRCRAFT: Omit<Aircraft, 'id'> = {
  type: 'Cessna 172S',
  registration: 'D-EFXY',
  defaultTasKt: 110,
  fuelConsumption: { cruiseLh: 32, climbLh: 38, taxiL: 3 },
  emptyMassKg: 767,
  arms: {
    seatRow1: 0.94,
    seatRow2: 1.85,
    seatRow3: 2.5,
    baggageFront: 0.41,
    baggageMid: 2.24,
    baggageRear: 2.85,
    fuel: 1.07,
  },
  fuelDensityKgPerL: 0.72,
  fuelCapacityL: 200,
  cgEnvelope: [
    { mass: 900, moment: 900 * 0.9 },
    { mass: 900, moment: 900 * 1.2 },
    { mass: 1157, moment: 1157 * 1.2 },
    { mass: 1157, moment: 1157 * 0.98 },
  ],
  takeoffTable: [
    { pressureAltitudeFt: 0, temperatureC: 0, groundRunM: 213, distanceOver15mM: 384 },
    { pressureAltitudeFt: 0, temperatureC: 30, groundRunM: 268, distanceOver15mM: 466 },
    { pressureAltitudeFt: 4000, temperatureC: 0, groundRunM: 305, distanceOver15mM: 526 },
    { pressureAltitudeFt: 4000, temperatureC: 30, groundRunM: 396, distanceOver15mM: 663 },
  ],
  landingTable: [
    { pressureAltitudeFt: 0, temperatureC: 0, groundRunM: 168, distanceOver15mM: 396 },
    { pressureAltitudeFt: 0, temperatureC: 30, groundRunM: 183, distanceOver15mM: 421 },
    { pressureAltitudeFt: 4000, temperatureC: 0, groundRunM: 200, distanceOver15mM: 457 },
    { pressureAltitudeFt: 4000, temperatureC: 30, groundRunM: 219, distanceOver15mM: 488 },
  ],
  runwayCorrectionFactors: {
    perThousandFtAltitude: 0,
    perDegreeAboveIsa: 0,
    perKnotHeadwind: -0.005,
    perKnotTailwind: 0.01,
    perPercentSlopeUphill: 0.05,
    perPercentSlopeDownhill: -0.03,
    grassSurface: 0.15,
    wetOrContaminatedSurface: 0.1,
  },
}

function demoFlightInput(): Omit<Flight, 'id' | 'legs' | 'legActuals'> & { aircraftId: string } {
  return {
    name: 'Beispielflug EDXA–EDXB',
    date: new Date().toISOString().slice(0, 10),
    departureAerodrome: 'EDXA',
    destinationAerodrome: 'EDXB',
    alternateAerodrome: 'EDXC',
    etdUtcMin: 9 * 60,
    transitionAltitudeFt: 5000,
    transitionLevel: 'FL065',
    sunsetUtcMin: 19 * 60 + 30,
    aircraftId: '', // wird nach dem Anlegen des Musters gesetzt
    globalDefaults: { tasKt: 100, wind: { directionDeg: 250, speedKt: 12 }, variationDeg: 2 },
  }
}

/** Legt Demo-Aircraft + Demo-Flug an und öffnet ihn direkt. */
export async function createDemoFlight(): Promise<void> {
  const aircraft = await useAircraftStore.getState().add(DEMO_AIRCRAFT)
  const flight = await useFlightStore.getState().createNew({ ...demoFlightInput(), aircraftId: aircraft.id })

  const legs: Array<Omit<Flight['legs'][number], 'id'>> = [
    { waypoint: 'Kirchturm Musterdorf', safetyAltitudeFt: 2500, plannedAltitude: '2500 ft', tc: 45, distanceNm: 12 },
    { waypoint: 'Stausee Nord', safetyAltitudeFt: 2500, plannedAltitude: '2500 ft', tc: 80, distanceNm: 18 },
    { waypoint: 'Autobahnkreuz', safetyAltitudeFt: 3000, plannedAltitude: '3000 ft', tc: 100, distanceNm: 22, wind: { directionDeg: 260, speedKt: 18 } },
    { waypoint: 'EDXB', safetyAltitudeFt: 2000, plannedAltitude: '2000 ft', tc: 130, distanceNm: 9 },
  ]

  for (const leg of legs) {
    await useFlightStore.getState().addLeg(leg)
  }

  void flight
}
