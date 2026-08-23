import { useState } from 'react'
import { formatDeltaMinutes, formatHoursMinutes } from '../../domain/format'
import { useFlightStore } from '../../store/flightStore'
import type { ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { AtoCell } from './AtoCell'

const inputClass = 'mono-num w-full min-w-0 rounded border px-1.5 py-1 text-sm'
const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }

/** Wandelt einen Entwurfstext in eine Zahl um — akzeptiert sowohl "1.6"
 * als auch "1,6" (deutsches Dezimalkomma). Gibt `undefined` für Text
 * zurück, der (noch) keine vollständige Zahl ist ("", "-", "1,"), damit
 * der Aufrufer solche Zwischenzustände nicht als "Feld geleert" wertet. */
function parseDraft(text: string): number | undefined {
  const normalized = text.trim().replace(',', '.')
  if (normalized === '' || normalized === '-') return undefined
  const n = Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

interface NumberCellProps {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  widthCh?: number
}

/**
 * Zahleneingabe für die Tabellenzellen. Bewusst `type="text"` mit
 * `inputMode="decimal"` statt `type="number"`: native Zahlenfelder zeigen
 * auf vielen Mobilgeräten eine reine Ziffern-Tastatur ohne Minus- oder
 * Komma-Taste und lehnen ein getipptes "," als Dezimaltrennzeichen rundweg
 * ab — genau das Problem bei VAR (Vorzeichen) und Entfernungen ("1,6 NM").
 *
 * Hält während der Eingabe einen eigenen Entwurfstext, der erst bei
 * vollständiger Zahl (oder beim Verlassen des Felds) über `onChange` nach
 * außen committet wird. Ohne das würde z. B. bei TAS/VAR (die auf einen
 * globalen Standardwert zurückfallen, siehe navigation.ts::resolveLeg) das
 * Leeren des Felds sofort ein `undefined` committen und die Zelle auf den
 * Standardwert zurückspringen lassen, noch bevor die neue Zahl fertig
 * getippt ist — z. B. ließ sich TAS so nie unter den globalen Standard von
 * 100 kt eingeben.
 */
function NumberCell({ label, value, onChange, widthCh = 5 }: NumberCellProps) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  const [focused, setFocused] = useState(false)
  // Entwurf während des Renderns statt in einem Effect an den externen
  // Wert angleichen (React-Pattern "adjusting state during rendering") —
  // vermeidet einen zusätzlichen Render und den oxlint-Hinweis auf
  // setState-in-effect. Nur synchronisieren, solange das Feld nicht
  // fokussiert ist, sonst würde eine externe Änderung mitten in der
  // Eingabe den Entwurfstext überschreiben.
  const [lastSeenValue, setLastSeenValue] = useState(value)
  if (value !== lastSeenValue && !focused) {
    setLastSeenValue(value)
    setDraft(value === undefined ? '' : String(value))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        const parsed = parseDraft(text)
        if (parsed !== undefined) onChange(parsed)
      }}
      onBlur={() => {
        setFocused(false)
        const parsed = parseDraft(draft)
        onChange(parsed)
        setDraft(parsed === undefined ? '' : String(parsed))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={inputClass}
      style={{ ...inputStyle, minWidth: `${widthCh}ch` }}
    />
  )
}

interface LegTableRowProps {
  row: FlightTableRow
  visibleColumns: ColumnId[]
  index: number
  total: number
  headerOffsetPx: number
  anchorUtcMinutes: number
  onMoveUp: () => void
  onMoveDown: () => void
}

export function LegTableRow({
  row,
  visibleColumns,
  index,
  total,
  headerOffsetPx,
  anchorUtcMinutes,
  onMoveUp,
  onMoveDown,
}: LegTableRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
  const removeLeg = useFlightStore((s) => s.removeLeg)
  const { leg, resolved, derived, eto } = row

  const rowStyle: React.CSSProperties = row.isActive
    ? {
        position: 'sticky',
        top: headerOffsetPx,
        zIndex: 5,
        backgroundColor: 'var(--signal-active-bg)',
        boxShadow: 'inset 4px 0 0 var(--signal-active-border)',
      }
    : { backgroundColor: 'transparent' }

  return (
    <tr className="transition-state border-b" style={{ ...rowStyle, borderColor: 'var(--border)' }}>
      <td className="px-1 py-1.5 align-middle">
        <div className="flex items-center gap-0.5">
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              aria-label="Nach oben verschieben"
              className="rounded border px-1 text-xs leading-none disabled:opacity-30"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              aria-label="Nach unten verschieben"
              className="rounded border px-1 text-xs leading-none disabled:opacity-30"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              ▼
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Leg "${leg.waypoint}" wirklich löschen?`)) void removeLeg(leg.id)
            }}
            aria-label={`Leg ${leg.waypoint} löschen`}
            className="rounded border px-1.5 py-1 text-xs"
            style={{ borderColor: 'var(--signal-warning-border)', color: 'var(--signal-warning-text)' }}
          >
            ✕
          </button>
        </div>
      </td>

      <td className="px-1.5 py-1.5 align-middle">
        <input
          aria-label="Kontrollpunkt"
          value={leg.waypoint}
          onChange={(e) => void updateLeg(leg.id, { waypoint: e.target.value })}
          placeholder="Kontrollpunkt"
          className={`${inputClass} font-semibold`}
          style={{ ...inputStyle, minWidth: '9ch' }}
        />
      </td>

      {visibleColumns.map((id) => (
        <td key={id} className="px-1.5 py-1.5 align-middle text-right">
          {renderCell(id)}
        </td>
      ))}

      <td className="px-1.5 py-1.5 align-middle text-right">
        <AtoCell legId={leg.id} ato={row.ato} isActive={row.isActive} anchorUtcMinutes={anchorUtcMinutes} />
      </td>
    </tr>
  )

  function renderCell(id: ColumnId): React.ReactNode {
    switch (id) {
      case 'safetyAlt':
        return (
          <NumberCell
            label="Sicherheitshöhe"
            value={leg.safetyAltitudeFt}
            onChange={(v) => void updateLeg(leg.id, { safetyAltitudeFt: v })}
          />
        )
      case 'plannedAlt':
        return (
          <input
            type="text"
            aria-label="Geplante Flughöhe"
            value={leg.plannedAltitude}
            onChange={(e) => void updateLeg(leg.id, { plannedAltitude: e.target.value })}
            className={inputClass}
            style={{ ...inputStyle, minWidth: '7ch' }}
          />
        )
      case 'tas':
        return <NumberCell label="TAS" value={resolved.tasKt} onChange={(v) => void updateLeg(leg.id, { tasKt: v })} />
      case 'wind':
        return (
          <div className="flex items-center justify-end gap-1">
            <NumberCell
              label="Windrichtung"
              value={resolved.wind.directionDeg}
              onChange={(v) => void updateLeg(leg.id, { wind: { ...resolved.wind, directionDeg: v ?? 0 } })}
              widthCh={4.5}
            />
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <NumberCell
              label="Windstärke"
              value={resolved.wind.speedKt}
              onChange={(v) => void updateLeg(leg.id, { wind: { ...resolved.wind, speedKt: v ?? 0 } })}
              widthCh={4}
            />
          </div>
        )
      case 'tc':
        return <NumberCell label="TC" value={leg.tc} onChange={(v) => void updateLeg(leg.id, { tc: v ?? 0 })} />
      case 'wca':
        return <NumberCell label="WCA" value={leg.wca} onChange={(v) => void updateLeg(leg.id, { wca: v })} />
      case 'var':
        return (
          <NumberCell
            label="Missweisung"
            value={resolved.variationDeg}
            onChange={(v) => void updateLeg(leg.id, { variationDeg: v })}
          />
        )
      case 'mh':
        return <NumberCell label="MH" value={leg.mh} onChange={(v) => void updateLeg(leg.id, { mh: v })} />
      case 'mc':
        return <ReadOnly>{courseLabel(derived.mc)}</ReadOnly>
      case 'distLeg':
        return (
          <NumberCell
            label="Distanz Abschnitt"
            value={leg.distanceNm}
            onChange={(v) => void updateLeg(leg.id, { distanceNm: v ?? 0 })}
          />
        )
      case 'distRemain':
        return (
          <NumberCell
            label="Distanz Rest"
            value={leg.distanceRemainNm}
            onChange={(v) => void updateLeg(leg.id, { distanceRemainNm: v })}
          />
        )
      case 'gs':
        return <NumberCell label="GS" value={leg.gs} onChange={(v) => void updateLeg(leg.id, { gs: v })} />
      case 'timeLeg':
        return <NumberCell label="Zeit Abschnitt" value={leg.timeMin} onChange={(v) => void updateLeg(leg.id, { timeMin: v })} />
      case 'timeRemain':
        return <ReadOnly>{formatHoursMinutes(derived.remainingTimeMin)}</ReadOnly>
      case 'eto':
        return (
          <ReadOnly>
            {eto.revisedEtoMin}
            {eto.deltaMin !== 0 && (
              <span
                className="ml-1 text-xs"
                style={{ color: eto.deltaMin > 0 ? 'var(--signal-delta-late)' : 'var(--signal-delta-early)' }}
              >
                {formatDeltaMinutes(eto.deltaMin)}
              </span>
            )}
          </ReadOnly>
        )
      case 'remarks':
        return (
          <input
            type="text"
            aria-label="Bemerkungen"
            value={leg.remarks ?? ''}
            onChange={(e) => void updateLeg(leg.id, { remarks: e.target.value })}
            className={`${inputClass} font-sans`}
            style={{ ...inputStyle, minWidth: '10ch' }}
          />
        )
    }
  }
}

function courseLabel(deg: number): string {
  return `${String(deg).padStart(3, '0')}°`
}

function ReadOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="mono-num whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
      {children}
    </span>
  )
}
