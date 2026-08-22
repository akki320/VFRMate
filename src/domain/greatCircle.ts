/**
 * Großkreisrechnung: rechtweisender Kurs (Anfangspeilung) und Distanz
 * zwischen zwei Koordinaten, für Bildschirm 2 ("optional Koordinaten, dann
 * TC und Distanz per Großkreisrechnung ableiten"). Reine Kugelgeometrie
 * (Haversine + Anfangspeilung), kein WGS84-Ellipsoid — für die
 * Streckenplanung eines Sichtflugs ausreichend genau.
 */
import { normalizeCourseDeg, roundCourseDeg, roundDistanceNm } from './rounding'

/** Mittlerer Erdradius in NM (1 NM = 1 Bogenminute auf dem Großkreis). */
const EARTH_RADIUS_NM = 3440.065
const DEG2RAD = Math.PI / 180
const RAD2DEG = 180 / Math.PI

export interface Coordinates {
  /** Breite in Dezimalgrad, positiv = Nord. */
  lat: number
  /** Länge in Dezimalgrad, positiv = Ost. */
  lon: number
}

/**
 * Rechtweisender Kurs (TC, als Anfangspeilung des Großkreisbogens) und
 * Distanz von `from` nach `to`. TC auf ganze Grad, Distanz auf eine
 * Nachkommastelle gerundet (siehe rounding.ts).
 */
export function greatCircleBearingAndDistance(
  from: Coordinates,
  to: Coordinates,
): { tc: number; distanceNm: number } {
  const lat1 = from.lat * DEG2RAD
  const lat2 = to.lat * DEG2RAD
  const dLat = (to.lat - from.lat) * DEG2RAD
  const dLon = (to.lon - from.lon) * DEG2RAD

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  const centralAngle = 2 * Math.asin(Math.min(1, Math.sqrt(a)))
  const distanceNm = EARTH_RADIUS_NM * centralAngle

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  const tc = normalizeCourseDeg(Math.atan2(y, x) * RAD2DEG)

  return { tc: roundCourseDeg(tc), distanceNm: roundDistanceNm(distanceNm) }
}
