/**
 * Central place for the app's rounding conventions, so every domain module
 * rounds the same way:
 *   - Kurse (TC/TH/MH/MC/WCA): ganze Grad
 *   - Zeiten: ganze Minuten
 *   - Distanzen: eine Nachkommastelle
 *   - Massen: ganze Kilogramm
 */

export function roundCourseDeg(value: number): number {
  // `|| 0` folds a rounded -0 (e.g. from asin(-0)) back to a clean 0.
  return Math.round(value) || 0
}

export function roundMinutes(value: number): number {
  return Math.round(value)
}

export function roundDistanceNm(value: number): number {
  return Math.round(value * 10) / 10
}

export function roundMassKg(value: number): number {
  return Math.round(value)
}

/** Normalizes a course/heading to the 0–359 range (whole degrees). */
export function normalizeCourseDeg(deg: number): number {
  const wrapped = deg % 360
  return wrapped < 0 ? wrapped + 360 : wrapped
}
