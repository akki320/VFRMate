import { useFlightStore } from '../../store/flightStore'
import { COLUMN_HINTS, type ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { ACTIVE_LIGHT_STYLE, inputClass, NumberCell, ReadOnly, TextCell } from './cells'
import { formatHoursMinutes } from '../../domain/format'

interface LegTableRowProps {
  row: FlightTableRow
  visibleColumns: ColumnId[]
  remarksCollapsed: boolean
}

/**
 * Die "Streckendaten-Zeile" eines Legs — Sicherh.-Höhe bis Zeit Rest plus
 * Bemerkungen. Sitzt im gerenderten Markup zwischen zwei
 * Kontrollpunkt-Zeilen (siehe CheckpointRow.tsx): der Kontrollpunkt VOR
 * dieser Zeile und der, den dieses Leg ansteuert, direkt DANACH — so wie im
 * Papierformular, wo die Streckendaten optisch zwischen den beiden
 * Kontrollpunktfeldern liegen, auf die sie sich beziehen. Kontrollpunktname
 * und die Verschieben-/Löschen-Knöpfe eines Legs gehören seit Phase 17 zur
 * CheckpointRow, ETO und ATO seit Phase 18 ebenfalls (auf ausdrücklichen
 * Wunsch: sie gehören zum Kontrollpunkt, den sie beschreiben, nicht zur
 * Strecke davor) — die Spalten Kontrollpunkt, ETO, ATO und die gespiegelte
 * Kontrollpunkt-Spalte bleiben hier deshalb bewusst leer (Kontrollpunkt
 * bis auf einen kleinen Verbindungspfeil), damit die Spaltenbreiten
 * trotzdem mit den Kontrollpunkt-Zeilen übereinstimmen.
 *
 * Nicht mehr sticky (das war früher diese Zeile, weil sie den
 * "Überflug"-Taster trug — der sitzt jetzt auf der Kontrollpunkt-Zeile,
 * siehe dort). Bleibt aber, solange sie zum aktiven Leg gehört, leicht
 * hervorgehoben (ACTIVE_LIGHT_STYLE) für denselben "von … nach …"-Kontext
 * wie die angrenzenden Kontrollpunkt-Zeilen.
 */
export function LegTableRow({ row, visibleColumns, remarksCollapsed }: LegTableRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
  const { leg, resolved, derived } = row

  const rowStyle = row.isActive ? ACTIVE_LIGHT_STYLE : { backgroundColor: 'transparent' }

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

      {/* ATO: jetzt auf der Kontrollpunkt-Zeile (siehe CheckpointRow.tsx) —
          leere Zelle hier nur, damit die Spaltenbreite erhalten bleibt. */}
      <td className="px-1 py-1 align-middle text-right sm:px-1.5 sm:py-1.5" />

      {/* Gespiegelte Kontrollpunkt-Spalte: nur auf der Kontrollpunkt-Zeile
          sinnvoll, hier ebenfalls leer. */}
      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5" />

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
            title={COLUMN_HINTS.var}
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
        // ETO ist seit Phase 18 auf der Kontrollpunkt-Zeile (siehe
        // CheckpointRow.tsx) — die Spalte existiert hier weiter (gleiche
        // Spaltenbreite über alle Zeilen), bleibt aber leer.
        return null
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
