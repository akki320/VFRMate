import { useMemo } from 'react'
import { useFlightStore } from '../../store/flightStore'
import { computeFlightLegs, reEstimateLegs, resolveLeg } from '../../domain/navigation'
import type { ComputedLeg, Flight, Leg, ReEstimatedLeg, ResolvedLegValues } from '../../domain/types'

export interface FlightTableRow {
  leg: Leg
  computed: ComputedLeg
  reEstimated: ReEstimatedLeg
  resolved: ResolvedLegValues
  ato: number | undefined
  isActive: boolean
  /** Distanz vom Start bis einschließlich dieses Legs, in NM. */
  cumulativeDistanceNm: number
}

export interface FlightTableViewModel {
  flight: Flight
  rows: FlightTableRow[]
  activeIndex: number
  /** Restzeit/Restdistanz ab jetzt (inkl. re-geschätzter Verschiebung),
   * bis zum Zielflugplatz. 0, wenn der Flug beendet ist. */
  remainingTimeMinEstimated: number
  remainingDistanceNm: number
  /** Geschätzte Ankunftszeit am Ziel (letztes Leg, re-geschätzt). */
  estimatedArrivalUtcMin: number | undefined
  arrivesAfterSunset: boolean
}

/**
 * Verknüpft den aktuell geöffneten Flug mit der Domain-Berechnung
 * (computeFlightLegs/reEstimateLegs) und leitet daraus die Anzeigewerte
 * für die Tabelle ab. Reine Ableitung, nichts davon wird gespeichert.
 */
export function useFlightTableViewModel(): FlightTableViewModel | undefined {
  const flight = useFlightStore((state) => state.currentFlight)

  return useMemo(() => {
    if (!flight) return undefined

    const computedLegs = computeFlightLegs(flight)
    const reEstimated = reEstimateLegs(flight, computedLegs)
    const atoByLegId = new Map(flight.legActuals.map((a) => [a.legId, a.atoUtcMin]))

    const activeIndex = flight.legs.findIndex((leg) => !atoByLegId.has(leg.id))

    let cumulativeDistanceNm = 0
    const rows: FlightTableRow[] = flight.legs.map((leg, index) => {
      cumulativeDistanceNm += leg.distanceNm
      return {
        leg,
        computed: computedLegs[index],
        reEstimated: reEstimated[index],
        resolved: resolveLeg(flight, leg),
        ato: atoByLegId.get(leg.id),
        isActive: index === activeIndex,
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
      estimatedArrivalUtcMin,
      arrivesAfterSunset,
    }
  }, [flight])
}
