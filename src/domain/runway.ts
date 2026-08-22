/**
 * Start-/Landestreckenberechnung: Grundstrecke (aus der POH-Tabelle
 * interpoliert) plus konfigurierbare Zuschläge, verglichen mit der
 * verfügbaren Bahnlänge.
 */
import type { RunwayCalc, RunwayCorrectionFactors, RunwayTableRow } from './types'

export interface RunwayConditions {
  pressureAltitudeFt: number
  temperatureC: number
  /** Windkomponente längs der Bahn in kt: positiv = Gegenwind, negativ = Rückenwind. */
  headwindComponentKt: number
  /** Bahnneigung in %, positiv = ansteigend (in Startrichtung). */
  slopePercent: number
  isGrass: boolean
  isWetOrContaminated: boolean
  availableRunwayLengthM: number
}

/** ISA-Temperatur in °C für eine gegebene Druckhöhe (1.98°C je 1000 ft Abnahme). */
function isaTemperatureC(pressureAltitudeFt: number): number {
  return 15 - (pressureAltitudeFt / 1000) * 1.98
}

/** Bilineare Interpolation der POH-Tabelle über Druckhöhe und Temperatur.
 * Außerhalb des Tabellenbereichs wird auf den nächstgelegenen Rand
 * geklemmt (keine Extrapolation). */
function interpolateTable(
  table: RunwayTableRow[],
  pressureAltitudeFt: number,
  temperatureC: number,
): { groundRunM: number; distanceOver15mM: number } {
  if (table.length === 0) return { groundRunM: 0, distanceOver15mM: 0 }
  if (table.length === 1) return { groundRunM: table[0].groundRunM, distanceOver15mM: table[0].distanceOver15mM }

  const altitudes = [...new Set(table.map((r) => r.pressureAltitudeFt))].sort((a, b) => a - b)
  const clampedAlt = Math.min(Math.max(pressureAltitudeFt, altitudes[0]), altitudes[altitudes.length - 1])
  const [altLo, altHi] = bracket(altitudes, clampedAlt)

  const rowAt = (alt: number) => {
    const rowsAtAlt = table.filter((r) => r.pressureAltitudeFt === alt).sort((a, b) => a.temperatureC - b.temperatureC)
    const temps = rowsAtAlt.map((r) => r.temperatureC)
    const clampedTemp = Math.min(Math.max(temperatureC, temps[0]), temps[temps.length - 1])
    const [tLo, tHi] = bracket(temps, clampedTemp)
    const rowLo = rowsAtAlt.find((r) => r.temperatureC === tLo)!
    const rowHi = rowsAtAlt.find((r) => r.temperatureC === tHi)!
    const frac = tHi === tLo ? 0 : (clampedTemp - tLo) / (tHi - tLo)
    return {
      groundRunM: lerp(rowLo.groundRunM, rowHi.groundRunM, frac),
      distanceOver15mM: lerp(rowLo.distanceOver15mM, rowHi.distanceOver15mM, frac),
    }
  }

  const atLo = rowAt(altLo)
  const atHi = rowAt(altHi)
  const altFrac = altHi === altLo ? 0 : (clampedAlt - altLo) / (altHi - altLo)

  return {
    groundRunM: lerp(atLo.groundRunM, atHi.groundRunM, altFrac),
    distanceOver15mM: lerp(atLo.distanceOver15mM, atHi.distanceOver15mM, altFrac),
  }
}

function bracket(sorted: number[], value: number): [number, number] {
  let lo = sorted[0]
  let hi = sorted[sorted.length - 1]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (value >= sorted[i] && value <= sorted[i + 1]) {
      lo = sorted[i]
      hi = sorted[i + 1]
      break
    }
  }
  return [lo, hi]
}

function lerp(a: number, b: number, frac: number): number {
  return a + (b - a) * frac
}

/**
 * Grundstrecke plus Zuschläge für Höhe, Temperatur, Wind, Neigung, Gras und
 * Oberflächenzustand. Die Faktoren aus RunwayCorrectionFactors werden
 * additiv auf den Gesamtfaktor kombiniert (z.B. Höhe +10%, Gegenwind −6% ⇒
 * Gesamtfaktor 1 + 0.10 − 0.06), dann multiplikativ auf die Grundstrecke
 * angewendet — das entspricht dem in deutschen Flughandbüchern üblichen
 * "Prozent-Zuschlag pro Einflussgröße".
 */
export function computeRunwayCalc(
  table: RunwayTableRow[],
  factors: RunwayCorrectionFactors,
  conditions: RunwayConditions,
): RunwayCalc {
  const base = interpolateTable(table, conditions.pressureAltitudeFt, conditions.temperatureC)

  const isaDeviation = conditions.temperatureC - isaTemperatureC(conditions.pressureAltitudeFt)

  const altitudeFactor = (conditions.pressureAltitudeFt / 1000) * factors.perThousandFtAltitude
  const temperatureFactor = Math.max(0, isaDeviation) * factors.perDegreeAboveIsa
  const windFactor =
    conditions.headwindComponentKt >= 0
      ? conditions.headwindComponentKt * factors.perKnotHeadwind
      : -conditions.headwindComponentKt * factors.perKnotTailwind
  const slopeFactor =
    conditions.slopePercent >= 0
      ? conditions.slopePercent * factors.perPercentSlopeUphill
      : -conditions.slopePercent * factors.perPercentSlopeDownhill
  const grassFactor = conditions.isGrass ? factors.grassSurface : 0
  const surfaceFactor = conditions.isWetOrContaminated ? factors.wetOrContaminatedSurface : 0

  const totalFactor = 1 + altitudeFactor + temperatureFactor + windFactor + slopeFactor + grassFactor + surfaceFactor
  const clampedTotalFactor = Math.max(0, totalFactor)

  const correctedGroundRunM = Math.round(base.groundRunM * clampedTotalFactor)
  const correctedDistanceOver15mM = Math.round(base.distanceOver15mM * clampedTotalFactor)

  return {
    baseGroundRunM: Math.round(base.groundRunM),
    baseDistanceOver15mM: Math.round(base.distanceOver15mM),
    appliedFactors: {
      altitude: altitudeFactor,
      temperature: temperatureFactor,
      wind: windFactor,
      slope: slopeFactor,
      grass: grassFactor,
      surfaceCondition: surfaceFactor,
    },
    correctedGroundRunM,
    correctedDistanceOver15mM,
    availableRunwayLengthM: conditions.availableRunwayLengthM,
    withinAvailableLength: correctedDistanceOver15mM <= conditions.availableRunwayLengthM,
  }
}
