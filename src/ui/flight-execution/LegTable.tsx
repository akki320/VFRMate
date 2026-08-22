import type { Flight } from '../../domain/types'
import type { FlightExecutionRow } from './useFlightExecutionViewModel'
import { LegRow } from './LegRow'

const HEADER_HEIGHT_PX = 52

interface LegTableProps {
  flight: Flight
  rows: FlightExecutionRow[]
}

/**
 * Die Kerntabelle: eine Zeile pro Kontrollpunkt, nur die im Flug wirklich
 * gebrauchten Spalten sichtbar. Kopfzeile und die aktive Zeile bleiben
 * beim Scrollen oben fixiert (position: sticky).
 */
export function LegTable({ flight, rows }: LegTableProps) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        Noch keine Kontrollpunkte angelegt. Lege sie in der Planung an.
      </p>
    )
  }

  return (
    <div>
      {/* Kein overflow-x-auto hier: ein overflow!=visible auf einer
          Achse zwingt die Browser-Engine, auch die andere Achse als
          "auto" zu behandeln — das macht diesen Wrapper zum
          Scrollcontainer und bricht position: sticky auf der aktiven
          Zeile/Kopfzeile weiter unten (sie stickt dann relativ zu
          diesem Wrapper statt zur Seite, und der Wrapper selbst
          scrollt ja nie). Bei table-fixed + Prozent-Spalten wird ab
          360px ohnehin nicht horizontal gescrollt. */}
      <table className="w-full table-fixed border-collapse text-xs sm:text-sm">
        <colgroup>
          <col className="w-[26%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
          <col className="w-[14%]" />
          <col className="w-[24%]" />
        </colgroup>
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
            <th className="px-1.5 py-2 font-medium sm:px-2">Kontrollpunkt</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">Sich.-Höhe</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">MH</th>
            <th className="px-1.5 py-2 text-right leading-tight font-medium sm:px-2">
              Zeit
              <br />
              (Abschn./Rest)
            </th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">ETO</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">ATO</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LegRow key={row.leg.id} flight={flight} row={row} headerOffsetPx={HEADER_HEIGHT_PX} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
