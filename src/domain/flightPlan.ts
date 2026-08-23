/**
 * Die vereinfachte Streckenrechnung: die meisten Leg-Werte sind direkte
 * Piloteneingaben (siehe Leg in types.ts) — automatisch berechnet wird
 * genau, was der Nutzer als Ausnahme benannt hat:
 *   - WCA aus TC, TAS und Wind (Winddreieck, siehe navigation.ts)
 *   - MC = TC − VAR
 *   - MH = TC + WCA − VAR (TH = TC + WCA, MH = TH − VAR)
 *   - Gesamtstrecke = Summe aller Distanz-Abschnitt-Werte
 *   - Entf. Rest = Gesamtstrecke − Distanz bis einschließlich diesem Leg
 *   - Gesamtzeit = Summe aller Zeit-Abschnitt-Werte
 *   - Zeit Rest = Gesamtzeit − Zeit bis einschließlich diesem Leg
 *   - ETO = fortlaufende Summe der Zeit-Abschnitt-Werte ("Minuten seit
 *     ATD/ETD"), fortgeschrieben um das Re-Estimate-Delta nach ATO
 * GS bleibt (wieder) eine reine Piloteneingabe.
 *
 * ETO/ATO rechnen intern weiterhin in verstrichenen Minuten seit Abflug
 * statt in UTC-Uhrzeiten — kein Abgleich mit der Wanduhr nötig, beide
 * Werte leben in derselben Einheit und sind direkt vergleichbar. Auf dem
 * Bildschirm zeigt die Tabelle davon aber nur die Minute der sich daraus
 * ergebenden Uhrzeit an (siehe format.ts::clockMinuteOnly), nicht die
 * verstrichene Minutenzahl selbst — die Stunde ist dem Piloten aus dem
 * Kontext klar.
 */
import type { Flight, LegActual } from './types'
import { normalizeCourseDeg, roundDistanceNm, roundMinutes } from './rounding'
import { resolveLeg, windTriangle } from './navigation'

export interface LegDerived {
  legId: string
  /** WCA aus TC, TAS und Wind (Winddreieck). */
  wca: number
  /** MC = TC − VAR, 0–359°. */
  mc: number
  /** MH = TC + WCA − VAR, 0–359°. */
  mh: number
  /** Distanz vom Start bis einschließlich dieses Legs, in NM. */
  cumulativeDistanceNm: number
  /** Entf. Rest: Gesamtstrecke − cumulativeDistanceNm, in NM. */
  remainingDistanceNm: number
  /** Geplante ETO dieses Legs: Summe der Zeit-Abschnitt-Werte bis
   * einschließlich diesem Leg, in Minuten seit ATD/ETD. */
  cumulativeTimeMin: number
  /** Zeit Rest: Gesamtzeit − cumulativeTimeMin, in Minuten. */
  remainingTimeMin: number
}

/** MC = TC − VAR, auf 0–359° normalisiert. */
export function computeMc(tc: number, variationDeg: number): number {
  return normalizeCourseDeg(tc - variationDeg)
}

/** MH = TC + WCA − VAR, auf 0–359° normalisiert (TH = TC + WCA, MH = TH − VAR). */
export function computeMh(tc: number, wca: number, variationDeg: number): number {
  return normalizeCourseDeg(tc + wca - variationDeg)
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

/** WCA, MC, MH, Entf. Rest und Zeit Rest je Leg sowie die laufende
 * Distanz-/Zeitsumme. */
export function computeLegDerived(flight: Flight): LegDerived[] {
  const totalTime = totalTimeMin(flight)
  const totalDistance = totalDistanceNm(flight)

  let cumulativeDistanceNm = 0
  let cumulativeTimeMin = 0
  return flight.legs.map((leg) => {
    const resolved = resolveLeg(flight, leg)
    const { wca } = windTriangle(leg.tc, resolved.tasKt, resolved.wind)
    cumulativeDistanceNm += leg.distanceNm
    cumulativeTimeMin += leg.timeMin ?? 0
    return {
      legId: leg.id,
      wca,
      mc: computeMc(leg.tc, resolved.variationDeg),
      mh: computeMh(leg.tc, wca, resolved.variationDeg),
      cumulativeDistanceNm: roundDistanceNm(cumulativeDistanceNm),
      remainingDistanceNm: roundDistanceNm(totalDistance - cumulativeDistanceNm),
      cumulativeTimeMin: roundMinutes(cumulativeTimeMin),
      remainingTimeMin: roundMinutes(totalTime - cumulativeTimeMin),
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
