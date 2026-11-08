/**
 * Navigationsrechnung: Winddreieck, Kurskette, Zeiten/ETO-Kette und
 * Re-Estimate nach ATO. Reine Funktionen, kein React, keine I/O.
 */
import type {
  ComputedLeg,
  Flight,
  Leg,
  ReEstimatedLeg,
  ResolvedLegValues,
  UtcMinutes,
  Wind,
} from './types'
import { normalizeCourseDeg, roundCourseDeg, roundDistanceNm, roundMinutes } from './rounding'

const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

/**
 * Winddreieck: WCA und GS aus TC, TAS, Windrichtung und -stärke.
 *
 * WCA = asin( WS · sin(WD − TC) / TAS ), in Grad, auf ganze Grad gerundet.
 * Positives WCA bedeutet: der Steuerkurs (TH) liegt rechts vom Kurs (TC) —
 * TH = TC + WCA. Ein Wind, der von rechts des Kurses kommt (WD − TC ∈
 * (0°, 180°)), drückt das Flugzeug nach links vom Kurs ab; um den Kurs zu
 * halten, muss folglich nach rechts vorgehalten werden → WCA > 0.
 *
 * GS wird anschließend exakt aus der Vektorzerlegung berechnet:
 * GS = TAS · cos(WCA) − WS · cos(WD − TC).
 *
 * Bei sehr starkem Seitenwind relativ zur TAS (|WS·sin(WD−TC)| > TAS) ist
 * kein Winddreieck lösbar (der Kurs kann nicht gehalten werden) — in dem
 * Fall wird WCA auf ±90° begrenzt und ein NaN als GS-Warnsignal vermieden,
 * indem GS trotzdem aus der Formel berechnet wird (kann dann negativ oder
 * unplausibel klein werden; die UI zeigt das als Warnung).
 */
export function windTriangle(
  tc: number,
  tasKt: number,
  wind: Wind,
): { wca: number; gs: number } {
  const a = (wind.directionDeg - tc) * DEG2RAD
  const ratio = tasKt === 0 ? 0 : (wind.speedKt * Math.sin(a)) / tasKt
  const clampedRatio = Math.max(-1, Math.min(1, ratio))
  const wcaRad = Math.asin(clampedRatio)
  const wca = roundCourseDeg(wcaRad * RAD2DEG)

  const gs = tasKt * Math.cos(wcaRad) - wind.speedKt * Math.cos(a)

  return { wca, gs: Math.round(gs) }
}

/**
 * Kurskette: TC → TH = TC + WCA → MH = TH + VAR → MC = TC + VAR. Alle
 * Ergebnisse auf 0–359° normalisiert.
 *
 * Vorzeichenkonvention VAR (Phase 20, auf Nutzerwunsch geändert —
 * vorher genau umgekehrt): **negativ = östliche Missweisung, positiv =
 * westliche Missweisung**, sodass VAR direkt zum rechtweisenden Kurs
 * addiert werden kann ("Ost ist am wenigsten" steckt dadurch schon im
 * Vorzeichen, kein gesondertes Subtrahieren nötig). Das entspricht der
 * Konvention gängiger EFBs wie SkyDemon, nicht der in manchen
 * PPL-Lehrbüchern verbreiteten Konvention mit positivem VAR für Ost
 * (dort muss man dann aber auch explizit subtrahieren statt addieren —
 * dasselbe Ergebnis, nur anders verpackt). Wer einen Wert direkt aus
 * SkyDemon überträgt, kann ihn jetzt unverändert übernehmen, ohne das
 * Vorzeichen gedanklich umzudrehen.
 */
export function courseChain(
  tc: number,
  wca: number,
  variationDeg: number,
): { th: number; mh: number; mc: number } {
  const th = normalizeCourseDeg(tc + wca)
  const mh = normalizeCourseDeg(th + variationDeg)
  const mc = normalizeCourseDeg(tc + variationDeg)
  return { th, mh, mc }
}

/** Flugzeit eines Abschnitts in Minuten, auf ganze Minuten gerundet. */
export function legTime(distanceNm: number, gsKt: number): number {
  if (gsKt <= 0) return 0
  return roundMinutes((distanceNm / gsKt) * 60)
}

/**
 * Löst TAS/Wind/VAR eines Legs gegen die globalen Flugstandardwerte auf:
 * ein `undefined`-Feld am Leg übernimmt den globalen Wert, ein gesetztes
 * Feld überschreibt ihn. Liefert zusätzlich je Feld, ob es lokal
 * überschrieben wurde — für die "welche Legs weichen ab"-Anzeige in
 * Bildschirm 2.
 */
export function resolveLeg(flight: Flight, leg: Leg): ResolvedLegValues {
  return {
    tasKt: leg.tasKt ?? flight.globalDefaults.tasKt,
    wind: leg.wind ?? flight.globalDefaults.wind,
    variationDeg: leg.variationDeg ?? flight.globalDefaults.variationDeg,
    tasKtIsOverridden: leg.tasKt !== undefined,
    windIsOverridden: leg.wind !== undefined,
    variationDegIsOverridden: leg.variationDeg !== undefined,
  }
}

/**
 * Berechnet für ein einzelnes Leg alle abgeleiteten Größen, die keine
 * Kenntnis von vorherigen/folgenden Legs benötigen (WCA, MC, MH, TH,
 * GS, Abschnittszeit). Kumulative Werte (cumulativeTimeMin,
 * remainingTimeMin, remainingDistanceNm, ETO) liefert computeFlightLegs().
 */
export function computeLegKinematics(
  leg: Leg,
  resolved: ResolvedLegValues,
): {
  wca: number
  mc: number
  mh: number
  th: number
  gs: number
  legTimeMin: number
} {
  const { wca, gs } = windTriangle(leg.tc, resolved.tasKt, resolved.wind)
  const { th, mh, mc } = courseChain(leg.tc, wca, resolved.variationDeg)
  return {
    wca,
    mc,
    mh,
    th,
    gs,
    legTimeMin: legTime(leg.distanceNm, gs),
  }
}

/**
 * Berechnet die vollständige, verkettete Legliste eines Fluges: kumulierte
 * Flugzeit, Restzeit/-distanz bis zum Ziel und die ETO-Kette
 * (ETO(n) = ETD + Summe der Abschnittszeiten bis n).
 */
export function computeFlightLegs(flight: Flight): ComputedLeg[] {
  const totalDistanceNm = flight.legs.reduce((sum, l) => sum + l.distanceNm, 0)

  // Pass 1: per-leg kinematics + running totals.
  let cumulativeTimeMin = 0
  let cumulativeDistanceNm = 0
  const rows = flight.legs.map((leg) => {
    const kinematics = computeLegKinematics(leg, resolveLeg(flight, leg))
    cumulativeTimeMin += kinematics.legTimeMin
    cumulativeDistanceNm += leg.distanceNm
    return {
      leg,
      kinematics,
      cumulativeTimeMin,
      remainingDistanceNm: roundDistanceNm(totalDistanceNm - cumulativeDistanceNm),
    }
  })
  const totalTimeMin = cumulativeTimeMin

  // Pass 2: remaining time depends on the total, known only after pass 1.
  return rows.map(({ leg, kinematics, cumulativeTimeMin, remainingDistanceNm }) => ({
    legId: leg.id,
    wca: kinematics.wca,
    mc: kinematics.mc,
    mh: kinematics.mh,
    th: kinematics.th,
    gs: kinematics.gs,
    legTimeMin: kinematics.legTimeMin,
    cumulativeTimeMin,
    remainingTimeMin: totalTimeMin - cumulativeTimeMin,
    remainingDistanceNm,
    etoUtcMin: flight.etdUtcMin + cumulativeTimeMin,
  }))
}

/**
 * Re-Estimate nach ATO: Sobald für ein Leg eine tatsächliche Überflugzeit
 * (ATO) vorliegt, wird die tatsächliche Groundspeed dieses Abschnitts aus
 * Distanz / (ATO − vorheriges ATO bzw. ATD) berechnet. Diese GS bestimmt
 * die neue ETO dieses Legs (= die ATO selbst) und damit ein Delta gegenüber
 * der ursprünglichen Planung. Dieses Delta wird auf alle nachfolgenden,
 * noch nicht überflogenen Legs fortgeschrieben, bis ein neueres ATO das
 * Delta erneut aktualisiert.
 *
 * Die ursprünglich geplanten Werte (ComputedLeg.etoUtcMin) bleiben davon
 * unberührt — reEstimateLegs liefert ausschließlich die revidierte Sicht
 * dazu.
 */
export function reEstimateLegs(flight: Flight, computedLegs: ComputedLeg[]): ReEstimatedLeg[] {
  const legActualsById = new Map(flight.legActuals.map((a) => [a.legId, a.atoMin]))

  let lastKnownTimeUtcMin: UtcMinutes = flight.atdUtcMin ?? flight.etdUtcMin
  let carriedDeltaMin = 0

  return computedLegs.map((computed, index) => {
    const leg = flight.legs[index]
    const ato = legActualsById.get(leg.id)

    if (ato !== undefined) {
      const elapsedMin = ato - lastKnownTimeUtcMin
      const actualGsKt = elapsedMin > 0 ? Math.round((leg.distanceNm / elapsedMin) * 60) : undefined
      carriedDeltaMin = roundMinutes(ato - computed.etoUtcMin)
      lastKnownTimeUtcMin = ato
      return {
        legId: leg.id,
        revisedEtoUtcMin: ato,
        deltaMin: carriedDeltaMin,
        actualGsKt,
      }
    }

    return {
      legId: leg.id,
      revisedEtoUtcMin: computed.etoUtcMin + carriedDeltaMin,
      deltaMin: carriedDeltaMin,
    }
  })
}
