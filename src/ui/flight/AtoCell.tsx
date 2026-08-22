import { useRef, useState } from 'react'
import { formatUtcMinutes, parseUtcMinutes } from '../../domain/format'
import { currentUtcMinutes } from '../hooks/useUtcClock'
import { useFlightStore } from '../../store/flightStore'

const LONG_PRESS_MS = 550

interface AtoCellProps {
  legId: string
  ato: number | undefined
  isActive: boolean
}

/**
 * ATO-Erfassung: ein Tap auf "Überflug" trägt die aktuelle UTC-Zeit ein
 * und schaltet zur nächsten Zeile weiter (die folgenden ETOs werden dabei
 * automatisch neu geschätzt, siehe useFlightTableViewModel). Ein bereits
 * erfasstes ATO lässt sich per Long-Press manuell korrigieren — ein
 * einfacher Tap tut dort bewusst nichts, damit man es nicht aus Versehen
 * verstellt.
 */
export function AtoCell({ legId, ato, isActive }: AtoCellProps) {
  const recordAto = useFlightStore((s) => s.recordAto)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const timerRef = useRef<number | undefined>(undefined)

  const startLongPress = () => {
    timerRef.current = window.setTimeout(() => {
      setDraft(ato !== undefined ? formatUtcMinutes(ato) : '')
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
    const parsed = parseUtcMinutes(draft)
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
        placeholder="HH:MM"
        aria-label="ATO korrigieren (HH:MM)"
        className="mono-num w-20 rounded border px-2 py-1 text-base"
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
        aria-label={`ATO ${formatUtcMinutes(ato)}, gedrückt halten zum Korrigieren`}
      >
        {formatUtcMinutes(ato)}
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
