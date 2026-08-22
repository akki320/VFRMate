import { useFlightStore } from '../../store/flightStore'
import { COLUMN_IDS, COLUMN_LABELS, type ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { LegTableRow } from './LegTableRow'

const HEADER_HEIGHT_PX = 40

interface LegTableProps {
  rows: FlightTableRow[]
  visibleColumns: Set<ColumnId>
}

/**
 * Die Kerntabelle: eine Zeile pro Kontrollpunkt, wie im Papierformular —
 * Kontrollpunkt und ATO sind immer sichtbar, alle anderen Spalten lassen
 * sich beliebig ein-/ausblenden (siehe ColumnVisibilityMenu). Kopfzeile
 * und die aktive Zeile (nächster anzufliegender Punkt) bleiben beim
 * Scrollen oben fixiert.
 */
export function LegTable({ rows, visibleColumns }: LegTableProps) {
  const reorderLegs = useFlightStore((s) => s.reorderLegs)
  const orderedVisible = COLUMN_IDS.filter((id) => visibleColumns.has(id))

  const move = (from: number, to: number) => {
    if (to < 0 || to >= rows.length || from === to) return
    const ids = rows.map((r) => r.leg.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    void reorderLegs(ids)
  }

  if (rows.length === 0) {
    return (
      <p className="px-1 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        Noch keine Kontrollpunkte angelegt — mit "+ Leg hinzufügen" starten.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr
            className="border-b text-left text-xs uppercase"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              height: HEADER_HEIGHT_PX,
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            <th className="px-1 py-2 font-medium" />
            <th className="px-1.5 py-2 font-medium">Kontrollpunkt</th>
            {orderedVisible.map((id) => (
              <th key={id} className="px-1.5 py-2 text-right font-medium whitespace-nowrap">
                {COLUMN_LABELS[id]}
              </th>
            ))}
            <th className="px-1.5 py-2 text-right font-medium">ATO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <LegTableRow
              key={row.leg.id}
              row={row}
              visibleColumns={orderedVisible}
              index={index}
              total={rows.length}
              headerOffsetPx={HEADER_HEIGHT_PX}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
