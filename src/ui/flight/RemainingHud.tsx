import { useUtcClock, formatUtcClock } from '../hooks/useUtcClock'

interface RemainingHudProps {
  remainingTimeMin: number
  /** Entf. Rest der aktiven Zeile — eine Piloteneingabe, kein berechneter
   * Wert (siehe Leg.distanceRemainNm); "–" solange nicht ausgefüllt. */
  remainingDistanceNm: number | undefined
  flightComplete: boolean
}

/**
 * Restzeit, Restdistanz und die laufende UTC-Uhr — dauerhaft am
 * Bildschirmrand sichtbar, unabhängig vom Scrollstand der Tabelle.
 */
export function RemainingHud({ remainingTimeMin, remainingDistanceNm, flightComplete }: RemainingHudProps) {
  const now = useUtcClock()

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 flex items-stretch justify-around border-t"
      style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-elevated-2)' }}
    >
      <HudStat label="UTC" value={formatUtcClock(now)} />
      <HudStat
        label="Rest"
        value={flightComplete ? '–' : String(Math.max(0, remainingTimeMin))}
        unit={flightComplete ? undefined : 'min'}
      />
      <HudStat
        label="Rest"
        value={!flightComplete && remainingDistanceNm !== undefined ? remainingDistanceNm.toFixed(1) : '–'}
        unit={!flightComplete && remainingDistanceNm !== undefined ? 'NM' : undefined}
      />
    </div>
  )
}

function HudStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
      <span className="text-[0.65rem] tracking-wide uppercase" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {unit ? ` (${unit})` : ''}
      </span>
      <span className="mono-num text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
