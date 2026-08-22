import { formatDeltaMinutes, formatUtcMinutes } from '../../domain/format'
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
  onMoveUp: () => void
  onMoveDown: () => void
}

export function LegTableRow({ row, visibleColumns, index, total, headerOffsetPx, onMoveUp, onMoveDown }: LegTableRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
  const removeLeg = useFlightStore((s) => s.removeLeg)
  const { leg, computed, reEstimated, resolved } = row

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
        <AtoCell legId={leg.id} ato={row.ato} isActive={row.isActive} />
      </td>
    </tr>
  )

  function renderCell(id: ColumnId): React.ReactNode {
    switch (id) {
      case 'safetyAlt':
        return (
          <input
            type="number"
            aria-label="Sicherheitshöhe"
            value={leg.safetyAltitudeFt ?? ''}
            onChange={(e) => void updateLeg(leg.id, { safetyAltitudeFt: e.target.value === '' ? undefined : Number(e.target.value) })}
            className={inputClass}
            style={{ ...inputStyle, minWidth: '6ch' }}
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
        return (
          <input
            type="number"
            aria-label="TAS"
            value={resolved.tasKt}
            onChange={(e) => void updateLeg(leg.id, { tasKt: Number(e.target.value) })}
            className={inputClass}
            style={{ ...inputStyle, minWidth: '5ch' }}
          />
        )
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
        return (
          <input
            type="number"
            aria-label="TC"
            value={leg.tc}
            onChange={(e) => void updateLeg(leg.id, { tc: Number(e.target.value) })}
            className={inputClass}
            style={{ ...inputStyle, minWidth: '5ch' }}
          />
        )
      case 'wca':
        return <ReadOnly>{`${computed.wca >= 0 ? '+' : ''}${computed.wca}°`}</ReadOnly>
      case 'var':
        return (
          <input
            type="number"
            aria-label="Missweisung"
            value={resolved.variationDeg}
            onChange={(e) => void updateLeg(leg.id, { variationDeg: Number(e.target.value) })}
            className={inputClass}
            style={{ ...inputStyle, minWidth: '4ch' }}
          />
        )
      case 'mh':
        return <ReadOnly>{courseLabel(computed.mh)}</ReadOnly>
      case 'mc':
        return <ReadOnly>{courseLabel(computed.mc)}</ReadOnly>
      case 'distLeg':
        return (
          <input
            type="number"
            step={0.1}
            aria-label="Distanz Abschnitt"
            value={leg.distanceNm}
            onChange={(e) => void updateLeg(leg.id, { distanceNm: Number(e.target.value) })}
            className={inputClass}
            style={{ ...inputStyle, minWidth: '5ch' }}
          />
        )
      case 'distAccum':
        return <ReadOnly>{row.cumulativeDistanceNm.toFixed(1)}</ReadOnly>
      case 'distRemain':
        return <ReadOnly>{computed.remainingDistanceNm.toFixed(1)}</ReadOnly>
      case 'gs':
        return <ReadOnly>{computed.gs}</ReadOnly>
      case 'timeLeg':
        return <ReadOnly>{computed.legTimeMin}</ReadOnly>
      case 'timeAccum':
        return <ReadOnly>{computed.cumulativeTimeMin}</ReadOnly>
      case 'timeRemain':
        return <ReadOnly>{computed.remainingTimeMin}</ReadOnly>
      case 'eto':
        return (
          <ReadOnly>
            {formatUtcMinutes(computed.etoUtcMin)}
            {reEstimated.deltaMin !== 0 && (
              <span
                className="ml-1 text-xs"
                style={{ color: reEstimated.deltaMin > 0 ? 'var(--signal-delta-late)' : 'var(--signal-delta-early)' }}
              >
                {formatDeltaMinutes(reEstimated.deltaMin)}
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
