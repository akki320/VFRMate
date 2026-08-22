import { useMemo } from 'react'
import { useAircraftStore } from '../../store/aircraftStore'
import { useFlightStore } from '../../store/flightStore'
import { computeFlightLegs, reEstimateLegs } from '../../domain/navigation'
import { checkFuelPlan } from '../../domain/fuel'
import type { ComputedLeg, Flight, Leg, ReEstimatedLeg } from '../../domain/types'

export interface FlightExecutionRow {
  leg: Leg
  computed: ComputedLeg
  reEstimated: ReEstimatedLeg
  ato: number | undefined
  isActive: boolean
  isPast: boolean
  /** Distanz vom Start bis einschließlich dieses Legs, in NM. */
  cumulativeDistanceNm: number
}

export interface FlightExecutionViewModel {
  flight: Flight
  rows: FlightExecutionRow[]
  activeIndex: number
  /** Restzeit/Restdistanz ab jetzt (inkl. re-geschätzter Verschiebung),
   * bis zum Zielflugplatz. 0, wenn der Flug beendet ist. */
  remainingTimeMinEstimated: number
  remainingDistanceNm: number
  safeEnduranceMin: number | undefined
  fuelInsufficient: boolean | undefined
  /** Geschätzte Ankunftszeit am Ziel (letztes Leg, re-geschätzt). */
  estimatedArrivalUtcMin: number | undefined
  exceedsSafeEndurance: boolean
  arrivesAfterSunset: boolean
}

/**
 * Verknüpft den aktuell geöffneten Flug mit der Domain-Berechnung
 * (computeFlightLegs/reEstimateLegs/checkFuelPlan) und leitet daraus die
 * konkreten Anzeige- und Warnwerte für Bildschirm 1 ab. Reine Ableitung,
 * nichts davon wird gespeichert.
 */
export function useFlightExecutionViewModel(): FlightExecutionViewModel | undefined {
  const flight = useFlightStore((state) => state.currentFlight)
  const aircraft = useAircraftStore((state) =>
    flight ? state.aircraft.find((a) => a.id === flight.aircraftId) : undefined,
  )

  return useMemo(() => {
    if (!flight) return undefined

    const computedLegs = computeFlightLegs(flight)
    const reEstimated = reEstimateLegs(flight, computedLegs)
    const atoByLegId = new Map(flight.legActuals.map((a) => [a.legId, a.atoUtcMin]))

    const activeIndex = flight.legs.findIndex((leg) => !atoByLegId.has(leg.id))

    let cumulativeDistanceNm = 0
    const rows: FlightExecutionRow[] = flight.legs.map((leg, index) => {
      cumulativeDistanceNm += leg.distanceNm
      return {
        leg,
        computed: computedLegs[index],
        reEstimated: reEstimated[index],
        ato: atoByLegId.get(leg.id),
        isActive: index === activeIndex,
        isPast: activeIndex !== -1 ? index < activeIndex : true,
        cumulativeDistanceNm,
      }
    })

    let remainingTimeMinEstimated = 0
    let remainingDistanceNm = 0
    if (activeIndex !== -1) {
      const computed = computedLegs[activeIndex]
      const delta = reEstimated[activeIndex].deltaMin
      remainingTimeMinEstimated = computed.legTimeMin + computed.remainingTimeMin + delta
      remainingDistanceNm = flight.legs[activeIndex].distanceNm + computed.remainingDistanceNm
    }

    const lastIndex = flight.legs.length - 1
    const estimatedArrivalUtcMin = lastIndex >= 0 ? reEstimated[lastIndex].revisedEtoUtcMin : undefined

    const fuelCheck =
      aircraft && flight.fuelPlan
        ? checkFuelPlan(flight.fuelPlan, aircraft.fuelConsumption.cruiseLh)
        : undefined

    const exceedsSafeEndurance =
      fuelCheck !== undefined && activeIndex !== -1 && remainingTimeMinEstimated > fuelCheck.safeEnduranceMin

    const arrivesAfterSunset =
      flight.sunsetUtcMin !== undefined &&
      estimatedArrivalUtcMin !== undefined &&
      estimatedArrivalUtcMin > flight.sunsetUtcMin

    return {
      flight,
      rows,
      activeIndex,
      remainingTimeMinEstimated,
      remainingDistanceNm,
      safeEnduranceMin: fuelCheck?.safeEnduranceMin,
      fuelInsufficient: fuelCheck?.insufficientFuel,
      estimatedArrivalUtcMin,
      exceedsSafeEndurance,
      arrivesAfterSunset,
    }
  }, [flight, aircraft])
}
