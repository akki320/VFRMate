import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { useFlightStore } from '../../store/flightStore'
import { COLUMN_IDS, COLUMN_LABELS, COMPUTED_COLUMNS, type ColumnId } from './columns'
import type { FlightTableRow } from './useFlightTableViewModel'
import { LegTableRow } from './LegTableRow'
import { CheckpointRow } from './CheckpointRow'
import { useRemarksCollapsed } from './useRemarksCollapsed'

/** Nur der Startwert vor der ersten Messung (siehe useLayoutEffect unten) —
 * die Kopfzeile hat inzwischen keine feste Höhe mehr (siehe Kommentar an
 * der Kopfzeilen-<tr>), daher reicht ein grober Schätzwert. */
const HEADER_HEIGHT_FALLBACK_PX = 40

interface LegTableProps {
  rows: FlightTableRow[]
  visibleColumns: Set<ColumnId>
  /** Minuten seit ATD (bzw. ETD ohne ATD) — Anker für den "Überflug"-Tap. */
  anchorUtcMinutes: number
  /** Name des Startflugplatzes — eigene, nicht editierbare Kontrollpunkt-
   * Zeile vor dem ersten Leg (siehe CheckpointRow.tsx). */
  departureAerodrome: string
}

/**
 * Die Kerntabelle: wie im Papierformular liegen die Streckendaten eines
 * Legs (Sicherh.-Höhe bis ATO) optisch ZWISCHEN den beiden
 * Kontrollpunkten, auf die sie sich beziehen — nicht in derselben Zeile
 * wie einer von beiden. Umgesetzt durch zwei abwechselnde Zeilentypen:
 * CheckpointRow (nur Name, plus bei einem echten Leg die Verschieben-/
 * Löschen-Knöpfe) und LegTableRow (Streckendaten inkl. ATO). Reihenfolge:
 * Startflugplatz, Streckendaten Leg 1, Kontrollpunkt Leg 1, Streckendaten
 * Leg 2, Kontrollpunkt Leg 2, … — der Kontrollpunkt VOR einer
 * Streckendaten-Zeile ist also der Startflugplatz oder das vorige Legs
 * Kontrollpunkt, der DANACH ist dieses Legs eigener Kontrollpunkt, exakt
 * wie im Formular. ATO sitzt bewusst weiter bei den Streckendaten (nicht
 * beim Kontrollpunkt) — der "Überflug"-Tap gehört fachlich zur Zeile, die
 * ohnehin die restliche Streckenrechnung dieses Legs zeigt.
 *
 * Kontrollpunkt und ATO sind immer sichtbar, alle anderen Spalten lassen
 * sich beliebig ein-/ausblenden (siehe ColumnVisibilityMenu). Ganz rechts,
 * noch hinter ATO, steht Bemerkungen als eigene, immer sichtbare Spalte
 * mit eigenem Schnell-Ein-/Ausklapp-Schalter in der Kopfzeile (schmal
 * per Default, siehe useRemarksCollapsed.ts) statt der allgemeinen
 * Spaltenauswahl. Kopfzeile und die aktive Streckendaten-Zeile (nächster
 * anzufliegender Punkt) bleiben beim Scrollen oben fixiert; die beiden
 * angrenzenden Kontrollpunkt-Zeilen (davor/danach) werden zusätzlich leicht
 * hervorgehoben, damit klar bleibt, von wo nach wo sich die fixierte Zeile
 * bezieht — sie sind aber selbst nicht fixiert, um die Sticky-Logik nicht
 * unnötig zu verkomplizieren.
 *
 * Schrift und Innenabstand von Kopf- und Datenzellen sind responsiv
 * (kleiner unterhalb des "sm"-Breakpoints) statt fest — da praktisch jede
 * Spaltenbreite in dieser Tabelle als `ch`-Wert gesetzt ist (siehe
 * cells.tsx), schrumpfen dadurch auf schmalen Bildschirmen alle
 * Spalten gemeinsam mit, statt jede Zelle einzeln pro Bildschirmgröße zu
 * pflegen. Das allein reicht aber nicht, wenn die Spaltenbreite von der
 * (nicht umbrechenden) Spaltenüberschrift vorgegeben wird: eine lange
 * Überschrift wie "GEPLANTE FLUGHÖHE" erzwingt dann eine Mindestbreite,
 * die weit über das hinausgeht, was der eigentliche Zellinhalt braucht.
 * Die Spaltenüberschriften dürfen deshalb umbrechen (kein
 * `whitespace-nowrap` mehr) — die automatische Tabellenspaltenberechnung
 * des Browsers bevorzugt Umbruch gegenüber Überlaufen, solange die
 * Tabelle eine feste Breite hat (hier `w-full`), und schrumpft die Spalte
 * dadurch auf die Breite des eigentlichen Zellinhalts. `overflow-x-auto`
 * bleibt als Rückfallebene für Bildschirme, auf denen selbst die
 * geschrumpfte Tabelle noch nicht ganz hineinpasst.
 *
 * Weil die Kopfzeile dadurch zwei- statt einzeilig werden kann, hat sie
 * keine feste Höhe mehr — die tatsächliche Höhe wird gemessen (Ref +
 * ResizeObserver) und als Sticky-Offset an die aktive Zeile
 * weitergereicht. Ein hartkodierter Höhenwert wäre sonst bei
 * umgebrochener Kopfzeile zu klein, und die aktive Zeile würde beim
 * Scrollen teilweise unter der (jetzt höheren) Kopfzeile verschwinden.
 */
export function LegTable({ rows, visibleColumns, anchorUtcMinutes, departureAerodrome }: LegTableProps) {
  const reorderLegs = useFlightStore((s) => s.reorderLegs)
  const orderedVisible = COLUMN_IDS.filter((id) => visibleColumns.has(id))
  const remarks = useRemarksCollapsed()

  const headerRowRef = useRef<HTMLTableRowElement>(null)
  const [headerHeight, setHeaderHeight] = useState(HEADER_HEIGHT_FALLBACK_PX)

  useLayoutEffect(() => {
    const el = headerRowRef.current
    if (!el) return
    const measure = () => setHeaderHeight(el.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
            ref={headerRowRef}
            className="border-b text-left text-[0.65rem] uppercase sm:text-xs"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--bg)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-secondary)',
            }}
          >
            <th className="px-0.5 py-1.5 font-medium sm:px-1 sm:py-2" />
            <th className="px-1 py-1.5 font-medium sm:px-1.5 sm:py-2">Kontrollpunkt</th>
            {orderedVisible.map((id) => (
              <th key={id} className="px-1 py-1.5 text-right font-medium sm:px-1.5 sm:py-2">
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
          <CheckpointRow
            waypoint={departureAerodrome}
            spanColumns={orderedVisible.length + 2}
            highlighted={rows[0]?.isActive ?? false}
            index={-1}
            total={rows.length}
            onMoveUp={() => {}}
            onMoveDown={() => {}}
          />
          {rows.map((row, index) => (
            <Fragment key={row.leg.id}>
              <LegTableRow
                row={row}
                visibleColumns={orderedVisible}
                headerOffsetPx={headerHeight}
                anchorUtcMinutes={anchorUtcMinutes}
                remarksCollapsed={remarks.collapsed}
              />
              <CheckpointRow
                legId={row.leg.id}
                waypoint={row.leg.waypoint}
                spanColumns={orderedVisible.length + 2}
                highlighted={row.isActive}
                index={index}
                total={rows.length}
                onMoveUp={() => move(index, index - 1)}
                onMoveDown={() => move(index, index + 1)}
              />
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
