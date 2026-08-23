import { useMemo } from 'react'
import { useFlightStore } from '../../store/flightStore'
import { computeLegDerived, reEstimateEto, totalDistanceNm, totalTimeMin } from '../../domain/flightPlan'
import type { LegDerived, LegEto } from '../../domain/flightPlan'
import { resolveLeg } from '../../domain/navigation'
import type { Flight, Leg, ResolvedLegValues } from '../../domain/types'

export interface FlightTableRow {
  leg: Leg
  /** TAS/Wind/VAR aufgelöst gegen die globalen Flugstandardwerte — die
   * einzigen Felder, die noch einen Fallback kennen (siehe
   * navigation.ts::resolveLeg); alles andere ist eine reine Leg-Eingabe. */
  resolved: ResolvedLegValues
  derived: LegDerived
  eto: LegEto
  ato: number | undefined
  isActive: boolean
}

export interface FlightTableViewModel {
  flight: Flight
  rows: FlightTableRow[]
  activeIndex: number
  totalDistanceNm: number
  totalTimeMin: number
  /** Minuten seit ATD (bzw. ETD ohne ATD) — Anker für den "Überflug"-Tap. */
  anchorUtcMinutes: number
  /** Restzeit ab jetzt bis zum Ziel (inkl. Re-Estimate-Delta), in Minuten. */
  remainingTimeMinEstimated: number
  /** Geschätzte Ankunft, in Minuten seit ATD/ETD (letztes Leg, re-geschätzt). */
  estimatedArrivalMin: number | undefined
  /** Dieselbe geschätzte Ankunft als reale UTC-Uhrzeit (anchorUtcMinutes +
   * estimatedArrivalMin) — für die ETA-Anzeige im Kopf und den
   * Sonnenuntergang-Warnhinweis, die beide echte Uhrzeiten brauchen. */
  estimatedArrivalUtcMin: number | undefined
  arrivesAfterSunset: boolean
}

/**
 * Verknüpft den aktuell geöffneten Flug mit der vereinfachten
 * Streckenrechnung (domain/flightPlan.ts) und leitet daraus die
 * Anzeigewerte für die Tabelle ab. Reine Ableitung, nichts davon wird
 * gespeichert.
 */
export function useFlightTableViewModel(): FlightTableViewModel | undefined {
  const flight = useFlightStore((state) => state.currentFlight)

  return useMemo(() => {
    if (!flight) return undefined

    const derived = computeLegDerived(flight)
    const etos = reEstimateEto(flight, derived)
    const atoByLegId = new Map(flight.legActuals.map((a) => [a.legId, a.atoMin]))

    const activeIndex = flight.legs.findIndex((leg) => !atoByLegId.has(leg.id))

    const rows: FlightTableRow[] = flight.legs.map((leg, index) => ({
      leg,
      resolved: resolveLeg(flight, leg),
      derived: derived[index],
      eto: etos[index],
      ato: atoByLegId.get(leg.id),
      isActive: index === activeIndex,
    }))

    const total = totalTimeMin(flight)
    let remainingTimeMinEstimated = 0
    if (activeIndex !== -1) {
      const activeLegTimeMin = flight.legs[activeIndex].timeMin ?? 0
      remainingTimeMinEstimated = activeLegTimeMin + derived[activeIndex].remainingTimeMin + etos[activeIndex].deltaMin
    }

    const anchorUtcMinutes = flight.atdUtcMin ?? flight.etdUtcMin
    const lastIndex = flight.legs.length - 1
    const estimatedArrivalMin = lastIndex >= 0 ? etos[lastIndex].revisedEtoMin : undefined
    const estimatedArrivalUtcMin =
      estimatedArrivalMin !== undefined ? ((anchorUtcMinutes + estimatedArrivalMin) % 1440 + 1440) % 1440 : undefined

    const arrivesAfterSunset =
      flight.sunsetUtcMin !== undefined &&
      estimatedArrivalUtcMin !== undefined &&
      estimatedArrivalUtcMin > flight.sunsetUtcMin

    return {
      flight,
      rows,
      activeIndex,
      totalDistanceNm: totalDistanceNm(flight),
      totalTimeMin: total,
      anchorUtcMinutes,
      remainingTimeMinEstimated,
      estimatedArrivalMin,
      estimatedArrivalUtcMin,
      arrivesAfterSunset,
    }
  }, [flight])
}
