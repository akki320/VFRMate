import { useEffect, useState } from 'react'

/** Laufende UTC-Uhr, sekundengenau. Nur fürs Display gedacht — alle
 * Berechnungen selbst arbeiten mit UTC-Minuten (siehe src/domain). */
export function useUtcClock(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return now
}

/** Formatiert eine Date als "HH:MM:SS" in UTC. */
export function formatUtcClock(date: Date): string {
  const h = String(date.getUTCHours()).padStart(2, '0')
  const m = String(date.getUTCMinutes()).padStart(2, '0')
  const s = String(date.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** Aktuelle UTC-Zeit als Minuten seit Mitternacht — für das ATO-Erfassen
 * per Tap ("aktuelle UTC-Zeit einträgt"). */
export function currentUtcMinutes(date: Date = new Date()): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes()
}
