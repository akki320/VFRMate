import { useRef, useState } from 'react'
import { formatMinutesOnly, formatUtcMinutes, parseMinutesOrTime } from '../../domain/format'
import { currentUtcMinutes } from '../hooks/useUtcClock'
import { useFlightStore } from '../../store/flightStore'

const LONG_PRESS_MS = 550

interface AtoCellProps {
  legId: string
  ato: number | undefined
  isActive: boolean
  /** Geplante ETO dieses Legs — Anker, um eine per Hand eingegebene reine
   * Minutenzahl ("21") auf die richtige Stunde aufzulösen. */
  anchorUtcMinutes: number
}

/**
 * ATO-Erfassung: ein Tap auf "Überflug" trägt die aktuelle UTC-Zeit ein
 * und schaltet zur nächsten Zeile weiter (die folgenden ETOs werden dabei
 * automatisch neu geschätzt, siehe useFlightTableViewModel). Ein bereits
 * erfasstes ATO lässt sich per Long-Press manuell korrigieren — ein
 * einfacher Tap tut dort bewusst nichts, damit man es nicht aus Versehen
 * verstellt.
 *
 * Angezeigt und eingegeben wird nur die Minute (z.B. "21" für 08:21) —
 * die übliche Kurzschreibweise, wenn die Stunde aus dem Zusammenhang klar
 * ist. Eine volle "HH:MM"-Eingabe funktioniert bei Bedarf weiterhin.
 */
export function AtoCell({ legId, ato, isActive, anchorUtcMinutes }: AtoCellProps) {
  const recordAto = useFlightStore((s) => s.recordAto)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const timerRef = useRef<number | undefined>(undefined)

  const startLongPress = () => {
    timerRef.current = window.setTimeout(() => {
      setDraft(ato !== undefined ? formatMinutesOnly(ato) : '')
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
    const parsed = parseMinutesOrTime(draft, ato ?? anchorUtcMinutes)
    if (!Number.isNaN(parsed)) void recordAto(legId, parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitEdit()
          if (e.key === 'Escape') setEditing(false)
        }}
        onBlur={commitEdit}
        placeholder="MM"
        aria-label="ATO korrigieren (Minute, z.B. 21, oder HH:MM)"
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
        title={formatUtcMinutes(ato)}
        aria-label={`ATO ${formatUtcMinutes(ato)}, gedrückt halten zum Korrigieren`}
      >
        {formatMinutesOnly(ato)}
      </button>
    )
  }

  if (isActive) {
    return (
      <button
        type="button"
        onClick={() => void recordAto(legId, currentUtcMinutes())}
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
