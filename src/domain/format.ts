import type { UtcMinutes } from './types'

/** Formats UTC-Minuten seit Mitternacht as "HH:MM". Wraps values outside
 * 0–1439 (e.g. a cumulative ETO past midnight) back into that range. */
export function formatUtcMinutes(minutes: UtcMinutes): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Parses an "HH:MM" string into UTC-Minuten seit Mitternacht. Returns
 * NaN for malformed input. */
export function parseUtcMinutes(hhmm: string): UtcMinutes {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return NaN
  const h = Number(match[1])
  const m = Number(match[2])
  if (h > 23 || m > 59) return NaN
  return h * 60 + m
}

/** Formats a signed minute delta as e.g. "+3" or "−2" (with a real minus
 * sign, not a hyphen, for legibility on the flight-following table). */
export function formatDeltaMinutes(delta: number): string {
  if (delta === 0) return '±0'
  return delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`
}
