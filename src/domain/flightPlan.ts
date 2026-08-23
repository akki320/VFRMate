/**
 * Die vereinfachte Streckenrechnung: fast alle Leg-Werte sind direkte
 * Piloteneingaben (siehe Leg in types.ts) — automatisch berechnet wird
 * nur, was sich zwingend aus ihnen ergibt:
 *   - MC = TC − VAR
 *   - Gesamtstrecke = Summe aller Distanz-Abschnitt-Werte
 *   - Gesamtzeit = Summe aller Zeit-Abschnitt-Werte
 *   - Zeit Rest = Gesamtzeit − Zeit bis einschließlich diesem Leg
 *   - ETO = fortlaufende Summe der Zeit-Abschnitt-Werte ("Minuten seit
 *     ATD/ETD"), fortgeschrieben um das Re-Estimate-Delta nach ATO
 *
 * ETO/ATO sind bewusst keine Uhrzeiten (UTC-Minuten seit Mitternacht),
 * sondern verstrichene Minuten seit Abflug — dadurch ist kein Abgleich
 * mit der Wanduhr nötig, beide Werte leben in derselben Einheit und sind
 * direkt vergleichbar. Das (weiterhin vorhandene, aber hier nicht mehr
 * verwendete) Winddreieck in navigation.ts bleibt für eine mögliche
 * spätere Wiederverwendung erhalten.
 */
import type { Flight, LegActual } from './types'
import { normalizeCourseDeg, roundDistanceNm, roundMinutes } from './rounding'
import { resolveLeg } from './navigation'

export interface LegDerived {
  legId: string
  /** MC = TC − VAR, 0–359°. */
  mc: number
  /** Distanz vom Start bis einschließlich dieses Legs, in NM. */
  cumulativeDistanceNm: number
  /** Geplante ETO dieses Legs: Summe der Zeit-Abschnitt-Werte bis
   * einschließlich diesem Leg, in Minuten seit ATD/ETD. */
  cumulativeTimeMin: number
  /** Zeit Rest: Gesamtzeit − cumulativeTimeMin, in Minuten. */
  remainingTimeMin: number
}

/** MC = TC − VAR, auf 0–359° normalisiert. Die einzige noch automatisch
 * berechnete Kursgröße. */
export function computeMc(tc: number, variationDeg: number): number {
  return normalizeCourseDeg(tc - variationDeg)
}

/** Gesamtstrecke: Summe aller Distanz-Abschnitt-Werte, auf eine
 * Nachkommastelle gerundet. */
export function totalDistanceNm(flight: Flight): number {
  return roundDistanceNm(flight.legs.reduce((sum, leg) => sum + leg.distanceNm, 0))
}

/** Gesamtzeit: Summe aller Zeit-Abschnitt-Werte, in Minuten. Legs ohne
 * eingetragene Zeit zählen als 0. */
export function totalTimeMin(flight: Flight): number {
  return roundMinutes(flight.legs.reduce((sum, leg) => sum + (leg.timeMin ?? 0), 0))
}

/** MC je Leg, laufende Distanz-/Zeitsumme und Zeit Rest. */
export function computeLegDerived(flight: Flight): LegDerived[] {
  const total = totalTimeMin(flight)

  let cumulativeDistanceNm = 0
  let cumulativeTimeMin = 0
  return flight.legs.map((leg) => {
    cumulativeDistanceNm += leg.distanceNm
    cumulativeTimeMin += leg.timeMin ?? 0
    return {
      legId: leg.id,
      mc: computeMc(leg.tc, resolveLeg(flight, leg).variationDeg),
      cumulativeDistanceNm: roundDistanceNm(cumulativeDistanceNm),
      cumulativeTimeMin: roundMinutes(cumulativeTimeMin),
      remainingTimeMin: roundMinutes(total - cumulativeTimeMin),
    }
  })
}

export interface LegEto {
  legId: string
  /** Geplante ETO in Minuten seit ATD/ETD (= cumulativeTimeMin). */
  plannedEtoMin: number
  /** Revidierte ETO: plannedEtoMin plus das von einem ATO fortgeschriebene
   * Delta. Entspricht dem ATO selbst, sobald für dieses Leg eines erfasst
   * ist. */
  revisedEtoMin: number
  deltaMin: number
}

/**
 * Re-Estimate nach ATO: Sobald für ein Leg ein ATO erfasst ist
 * (`LegActual.atoMin`, Minuten seit ATD/ETD), wird das Delta zur
 * geplanten ETO auf alle nachfolgenden, noch nicht überflogenen Legs
 * fortgeschrieben — bis ein neueres ATO das Delta erneut aktualisiert.
 * Kein UTC-Abgleich nötig: ETO und ATO sind beide einfache Minutenwerte.
 */
export function reEstimateEto(flight: Flight, derived: LegDerived[]): LegEto[] {
  const atoByLegId = new Map<string, number>(flight.legActuals.map((a: LegActual) => [a.legId, a.atoMin]))
  let carriedDeltaMin = 0

  return derived.map((leg, index) => {
    const legId = flight.legs[index].id
    const ato = atoByLegId.get(legId)

    if (ato !== undefined) {
      carriedDeltaMin = roundMinutes(ato - leg.cumulativeTimeMin)
      return { legId, plannedEtoMin: leg.cumulativeTimeMin, revisedEtoMin: ato, deltaMin: carriedDeltaMin }
    }

    return {
      legId,
      plannedEtoMin: leg.cumulativeTimeMin,
      revisedEtoMin: leg.cumulativeTimeMin + carriedDeltaMin,
      deltaMin: carriedDeltaMin,
    }
  })
}
