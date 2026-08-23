import { useFlightStore } from '../../store/flightStore'
import { COLUMN_IDS, COLUMN_LABELS, COMPUTED_COLUMNS, type ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { LegTableRow } from './LegTableRow'
import { useRemarksCollapsed } from './useRemarksCollapsed'

const HEADER_HEIGHT_PX = 40

interface LegTableProps {
  rows: FlightTableRow[]
  visibleColumns: Set<ColumnId>
  /** Minuten seit ATD (bzw. ETD ohne ATD) — Anker für den "Überflug"-Tap. */
  anchorUtcMinutes: number
}

/**
 * Die Kerntabelle: eine Zeile pro Kontrollpunkt, wie im Papierformular —
 * Kontrollpunkt und ATO sind immer sichtbar, alle anderen Spalten lassen
 * sich beliebig ein-/ausblenden (siehe ColumnVisibilityMenu). Ganz rechts,
 * noch hinter ATO, steht Bemerkungen als eigene, immer sichtbare Spalte
 * mit eigenem Schnell-Ein-/Ausklapp-Schalter in der Kopfzeile (schmal
 * per Default, siehe useRemarksCollapsed.ts) statt der allgemeinen
 * Spaltenauswahl. Kopfzeile und die aktive Zeile (nächster anzufliegender
 * Punkt) bleiben beim Scrollen oben fixiert.
 *
 * Schrift und Innenabstand von Kopf- und Datenzellen sind responsiv
 * (kleiner unterhalb des "sm"-Breakpoints) statt fest — da praktisch jede
 * Spaltenbreite in dieser Tabelle als `ch`-Wert gesetzt ist (siehe
 * LegTableRow.tsx), schrumpfen dadurch auf schmalen Bildschirmen alle
 * Spalten gemeinsam mit, statt jede Zelle einzeln pro Bildschirmgröße zu
 * pflegen. `overflow-x-auto` bleibt als Rückfallebene für Bildschirme, auf
 * denen selbst die geschrumpfte Tabelle noch nicht ganz hineinpasst.
 */
export function LegTable({ rows, visibleColumns, anchorUtcMinutes }: LegTableProps) {
  const reorderLegs = useFlightStore((s) => s.reorderLegs)
  const orderedVisible = COLUMN_IDS.filter((id) => visibleColumns.has(id))
  const remarks = useRemarksCollapsed()

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
            className="border-b text-left text-[0.65rem] uppercase sm:text-xs"
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
            <th className="px-0.5 py-1.5 font-medium sm:px-1 sm:py-2" />
            <th className="px-1 py-1.5 font-medium sm:px-1.5 sm:py-2">Kontrollpunkt</th>
            {orderedVisible.map((id) => (
              <th key={id} className="px-1 py-1.5 text-right font-medium whitespace-nowrap sm:px-1.5 sm:py-2">
                {COLUMN_LABELS[id]}
                {COMPUTED_COLUMNS.has(id) && (
                  <span className="ml-1 normal-case" style={{ color: 'var(--text-muted)' }} title="automatisch berechnet">
                    ⚙
                  </span>
                )}
              </th>
            ))}
            <th className="px-1 py-1.5 text-right font-medium sm:px-1.5 sm:py-2">ATO</th>
            <th className="px-1 py-1.5 font-medium whitespace-nowrap sm:px-1.5 sm:py-2">
              <button
                type="button"
                onClick={remarks.toggle}
                aria-label={remarks.collapsed ? 'Bemerkungen ausklappen' : 'Bemerkungen einklappen'}
                title={remarks.collapsed ? 'Bemerkungen ausklappen' : 'Bemerkungen einklappen'}
                className="mr-1 rounded border px-1 text-xs leading-none normal-case"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                {remarks.collapsed ? '◀' : '▶'}
              </button>
              {!remarks.collapsed && 'Bemerkungen'}
            </th>
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
              anchorUtcMinutes={anchorUtcMinutes}
              remarksCollapsed={remarks.collapsed}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
