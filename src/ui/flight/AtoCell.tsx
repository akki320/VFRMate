import { useRef, useState } from 'react'
import { currentUtcMinutes } from '../hooks/useUtcClock'
import { clockMinuteOnly, formatUtcMinutes } from '../../domain/format'
import { useFlightStore } from '../../store/flightStore'

const LONG_PRESS_MS = 550

interface AtoCellProps {
  legId: string
  ato: number | undefined
  isActive: boolean
  /** ATD (bzw. ETD, falls noch keine ATD gesetzt ist) in UTC-Minuten seit
   * Mitternacht — der einzige Punkt, an dem die reale Uhrzeit ins Spiel
   * kommt: beim Tippen auf "Überflug" wird daraus die seit Abflug
   * verstrichene Minutenzahl abgeleitet. Alles danach (ETO, ATO, Delta)
   * rechnet nur noch mit dieser Minutenzahl, kein UTC-Abgleich mehr. */
  anchorUtcMinutes: number
}

/**
 * ATO-Erfassung: ein Tap auf "Überflug" trägt die seit Abflug
 * verstrichenen Minuten ein und schaltet zur nächsten Zeile weiter (die
 * ETOs aller folgenden Legs werden dabei automatisch neu geschätzt,
 * siehe domain/flightPlan.ts::reEstimateEto). Ein bereits erfasstes ATO
 * lässt sich per Long-Press manuell korrigieren — einfach als Minutenzahl,
 * ohne Bezug zu einer Uhrzeit. Ein einfacher Tap tut dort bewusst nichts,
 * damit man es nicht aus Versehen verstellt. Angezeigt wird (wie bei ETO,
 * siehe LegTableRow.tsx) nur die Minute der sich aus Anker + verstrichener
 * Zeit ergebenden Uhrzeit — die volle Uhrzeit steht als Tooltip daneben.
 */
export function AtoCell({ legId, ato, isActive, anchorUtcMinutes }: AtoCellProps) {
  const recordAto = useFlightStore((s) => s.recordAto)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const timerRef = useRef<number | undefined>(undefined)

  const startLongPress = () => {
    timerRef.current = window.setTimeout(() => {
      setDraft(ato !== undefined ? String(ato) : '')
      setEditing(true)
    }, LONG_PRESS_MS)
  }
  const cancelLongPress = () => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }

  const commitEdit = () => {
    const parsed = Number(draft.trim())
    if (draft.trim() !== '' && Number.isFinite(parsed) && parsed >= 0) void recordAto(legId, Math.round(parsed))
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit()
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={commitEdit}
        placeholder="min"
        aria-label="ATO korrigieren (Minuten seit Abflug)"
        className="mono-num w-14 rounded border px-2 py-1 text-base"
        style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />
    )
  }

  if (ato !== undefined) {
    return (
      <button
        type="button"
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        className="mono-num rounded px-2 text-base"
        style={{ color: 'var(--text-primary)', minHeight: 44 }}
        title={`ATO ${formatUtcMinutes(anchorUtcMinutes + ato)}`}
        aria-label={`ATO ${ato} min, gedrückt halten zum Korrigieren`}
      >
        {clockMinuteOnly(anchorUtcMinutes, ato)}
      </button>
    )
  }

  if (isActive) {
    return (
      <button
        type="button"
        onClick={() => {
          // Bewusst kein % 1440-Abgleich mehr (siehe Kommentar oben an der
          // Komponente): das war Modulo-Arithmetik für UTC-Uhrzeiten und
          // erzeugt hier Unsinn, sobald "jetzt" noch vor dem Anker liegt
          // (z. B. ATD noch nicht gesetzt und ETD liegt in der Zukunft) —
          // dann kippt eine kleine negative Differenz auf ~1440 um.
          // Reine Minutendifferenz, nach unten auf 0 begrenzt.
          const elapsed = Math.max(0, currentUtcMinutes() - anchorUtcMinutes)
          void recordAto(legId, elapsed)
        }}
        className="transition-state mono-num w-full rounded-lg px-1 text-sm font-semibold sm:text-base"
        style={{ minHeight: 56, minWidth: 56, backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
      >
        Überflug
      </button>
    )
  }

  return (
    <span className="mono-num" style={{ color: 'var(--text-muted)' }}>
      –
    </span>
  )
}
