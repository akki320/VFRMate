import { formatDeltaMinutes, formatHoursMinutes } from '../../domain/format'
import { useFlightStore } from '../../store/flightStore'
import type { ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { AtoCell } from './AtoCell'

const inputClass = 'mono-num w-full min-w-0 rounded border px-1.5 py-1 text-sm'
const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }

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

  function numberCell(label: string, value: number | undefined, onChange: (v: number | undefined) => void, step?: number) {
    return (
      <input
        type="number"
        step={step}
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={inputClass}
        style={{ ...inputStyle, minWidth: '5ch' }}
      />
    )
  }

  function renderCell(id: ColumnId): React.ReactNode {
    switch (id) {
      case 'safetyAlt':
        return numberCell('Sicherheitshöhe', leg.safetyAltitudeFt, (v) => void updateLeg(leg.id, { safetyAltitudeFt: v }))
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
        return numberCell('TAS', resolved.tasKt, (v) => void updateLeg(leg.id, { tasKt: v }))
      case 'wind':
        return (
          <div className="flex items-center justify-end gap-1">
            <input
              type="number"
              aria-label="Windrichtung"
              value={resolved.wind.directionDeg}
              onChange={(e) =>
                void updateLeg(leg.id, { wind: { ...resolved.wind, directionDeg: Number(e.target.value) } })
              }
              className={inputClass}
              style={{ ...inputStyle, width: '4.5ch' }}
            />
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <input
              type="number"
              aria-label="Windstärke"
              value={resolved.wind.speedKt}
              onChange={(e) => void updateLeg(leg.id, { wind: { ...resolved.wind, speedKt: Number(e.target.value) } })}
              className={inputClass}
              style={{ ...inputStyle, width: '4ch' }}
            />
          </div>
        )
      case 'tc':
        return numberCell('TC', leg.tc, (v) => void updateLeg(leg.id, { tc: v ?? 0 }))
      case 'wca':
        return numberCell('WCA', leg.wca, (v) => void updateLeg(leg.id, { wca: v }))
      case 'var':
        return numberCell('Missweisung', resolved.variationDeg, (v) => void updateLeg(leg.id, { variationDeg: v }))
      case 'mh':
        return numberCell('MH', leg.mh, (v) => void updateLeg(leg.id, { mh: v }))
      case 'mc':
        return <ReadOnly>{courseLabel(derived.mc)}</ReadOnly>
      case 'distLeg':
        return numberCell('Distanz Abschnitt', leg.distanceNm, (v) => void updateLeg(leg.id, { distanceNm: v ?? 0 }), 0.1)
      case 'distRemain':
        return numberCell('Distanz Rest', leg.distanceRemainNm, (v) => void updateLeg(leg.id, { distanceRemainNm: v }), 0.1)
      case 'gs':
        return numberCell('GS', leg.gs, (v) => void updateLeg(leg.id, { gs: v }))
      case 'timeLeg':
        return numberCell('Zeit Abschnitt', leg.timeMin, (v) => void updateLeg(leg.id, { timeMin: v }))
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
