import { clockMinuteOnly, formatDeltaMinutes, formatHoursMinutes, formatUtcMinutes } from '../../domain/format'
import { useFlightStore } from '../../store/flightStore'
import type { ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { AtoCell } from './AtoCell'
import { inputClass, NumberCell, TextCell } from './cells'

interface LegTableRowProps {
  row: FlightTableRow
  visibleColumns: ColumnId[]
  headerOffsetPx: number
  anchorUtcMinutes: number
  remarksCollapsed: boolean
}

/**
 * Die "Streckendaten-Zeile" eines Legs — Sicherh.-Höhe bis ATO plus
 * Bemerkungen. Sitzt im gerenderten Markup zwischen zwei
 * Kontrollpunkt-Zeilen (siehe CheckpointRow.tsx): der Kontrollpunkt VOR
 * dieser Zeile und der, den dieses Leg ansteuert, direkt DANACH — so wie im
 * Papierformular, wo die Streckendaten optisch zwischen den beiden
 * Kontrollpunktfeldern liegen, auf die sie sich beziehen. Kontrollpunktname
 * und die Verschieben-/Löschen-Knöpfe eines Legs gehören seit dieser
 * Aufteilung zur CheckpointRow, nicht mehr hierher — die ersten beiden
 * Spalten bleiben hier deshalb bewusst leer (bis auf einen kleinen
 * Verbindungspfeil), damit die Spaltenbreiten trotzdem mit den
 * Kontrollpunkt-Zeilen übereinstimmen.
 */
export function LegTableRow({ row, visibleColumns, headerOffsetPx, anchorUtcMinutes, remarksCollapsed }: LegTableRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
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
      <td className="px-0.5 py-1 align-middle sm:px-1 sm:py-1.5" />

      <td className="px-1 py-1 text-center align-middle sm:px-1.5 sm:py-1.5" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
        ↓
      </td>

      {visibleColumns.map((id) => (
        <td key={id} className="px-1 py-1 align-middle text-right sm:px-1.5 sm:py-1.5">
          {renderCell(id)}
        </td>
      ))}

      <td className="px-1 py-1 align-middle text-right sm:px-1.5 sm:py-1.5">
        <AtoCell legId={leg.id} ato={row.ato} isActive={row.isActive} anchorUtcMinutes={anchorUtcMinutes} />
      </td>

      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5">
        <TextCell
          label="Bemerkungen"
          value={leg.remarks ?? ''}
          onChange={(v) => void updateLeg(leg.id, { remarks: v })}
          className={`${inputClass} font-sans`}
          widthCh={remarksCollapsed ? 4 : 18}
        />
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
          <TextCell
            label="Geplante Flughöhe"
            value={leg.plannedAltitude}
            onChange={(v) => void updateLeg(leg.id, { plannedAltitude: v })}
            widthCh={7}
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
        return <ReadOnly>{signedDegLabel(derived.wca)}</ReadOnly>
      case 'var':
        return (
          <NumberCell
            label="Missweisung"
            value={resolved.variationDeg}
            onChange={(v) => void updateLeg(leg.id, { variationDeg: v })}
          />
        )
      case 'mh':
        return <ReadOnly>{courseLabel(derived.mh)}</ReadOnly>
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
        return <ReadOnly>{derived.remainingDistanceNm}</ReadOnly>
      case 'gs':
        return <NumberCell label="GS" value={leg.gs} onChange={(v) => void updateLeg(leg.id, { gs: v })} />
      case 'timeLeg':
        return <NumberCell label="Zeit Abschnitt" value={leg.timeMin} onChange={(v) => void updateLeg(leg.id, { timeMin: v })} />
      case 'timeRemain':
        return <ReadOnly>{formatHoursMinutes(derived.remainingTimeMin)}</ReadOnly>
      case 'eto':
        return (
          <ReadOnly title={`ETO ${formatUtcMinutes(anchorUtcMinutes + eto.revisedEtoMin)}`}>
            {clockMinuteOnly(anchorUtcMinutes, eto.revisedEtoMin)}
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
    }
  }
}

function courseLabel(deg: number): string {
  return `${String(deg).padStart(3, '0')}°`
}

/** WCA-Anzeige: vorzeichenbehaftetes Grad (z. B. "+3°"/"-3°"/"0°"), im
 * Gegensatz zu Kursangaben (courseLabel) kein 0–359°-Wert. */
function signedDegLabel(deg: number): string {
  return `${deg > 0 ? '+' : ''}${deg}°`
}

function ReadOnly({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="mono-num text-xs whitespace-nowrap sm:text-sm" style={{ color: 'var(--text-primary)' }} title={title}>
      {children}
    </span>
  )
}
