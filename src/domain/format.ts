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

/**
 * Formats only the minute-within-the-hour of a UTC-Minuten-Wert, z.B. 21
 * für 08:21 — die übliche Kurzschreibweise für ETO/ATO auf dem
 * Papierformular, wenn die Stunde aus dem Zusammenhang klar ist.
 */
export function formatMinutesOnly(minutes: UtcMinutes): string {
  const wrapped = ((minutes % 60) + 60) % 60
  return String(wrapped).padStart(2, '0')
}

/**
 * Löst eine per Hand eingegebene Minutenkurzschreibweise ("21") gegen
 * einen Ankerzeitpunkt (z.B. die geplante ETO) zur vollen UTC-Zeit auf —
 * es wird die Stunde (Anker, Anker−1 oder Anker+1) gewählt, die dem
 * Anker am nächsten liegt. Akzeptiert daneben weiterhin "HH:MM" für die
 * volle Eingabe. Gibt NaN für ungültige Eingaben zurück.
 */
export function parseMinutesOrTime(raw: string, anchorUtcMinutes: UtcMinutes): UtcMinutes {
  const trimmed = raw.trim()
  const bareMinutes = /^\d{1,2}$/.exec(trimmed)
  if (bareMinutes) {
    const minutePart = Number(trimmed)
    if (minutePart > 59) return NaN
    return resolveMinutesEntry(minutePart, anchorUtcMinutes)
  }
  return parseUtcMinutes(trimmed)
}

/** Wählt zum gegebenen Minutenanteil die Stunde (Anker, Anker−1, Anker+1),
 * die dem Ankerzeitpunkt am nächsten liegt — löst damit den üblichen
 * Stunden-Überlauf beim Eintragen einer reinen Minutenzahl auf. */
function resolveMinutesEntry(minutePart: number, anchorUtcMinutes: UtcMinutes): UtcMinutes {
  const anchorHour = Math.floor((((anchorUtcMinutes % 1440) + 1440) % 1440) / 60)
  const candidates = [-1, 0, 1].map((offset) => {
    const hour = ((anchorHour + offset) % 24 + 24) % 24
    return hour * 60 + minutePart
  })
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate - anchorUtcMinutes) < Math.abs(best - anchorUtcMinutes) ? candidate : best,
  )
}
