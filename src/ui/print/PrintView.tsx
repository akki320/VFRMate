import type { Flight } from '../../domain/types'
import { computeLegDerived, reEstimateEto, totalDistanceNm, totalTimeMin } from '../../domain/flightPlan'
import { resolveLeg } from '../../domain/navigation'
import { formatDeltaMinutes, formatHoursMinutes, formatUtcMinutes } from '../../domain/format'

/**
 * Druckansicht: eine A4-Seite im Layout des Papierformulars, als Backup
 * für den Flug (siehe .print-only in index.css — auf dem Bildschirm
 * unsichtbar, erscheint nur im Druck). Zeigt immer alle Spalten,
 * unabhängig von der Bildschirm-Spaltenauswahl — auf Papier soll nichts
 * fehlen. Bewusst eigenständig und in expliziten Schwarz-auf-Weiß-Farben
 * gehalten, unabhängig vom Nacht-/Tagmodus der Bildschirmansicht.
 */
export function PrintView({ flight }: { flight: Flight | undefined }) {
  if (!flight) return null

  const derived = computeLegDerived(flight)
  const etos = reEstimateEto(flight, derived)
  const anchorUtcMin = flight.atdUtcMin ?? flight.etdUtcMin

  return (
    <div className="print-only" style={{ color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9px' }}>
      <h1 style={{ fontSize: '14px', marginBottom: '2mm' }}>
        Flugdurchführungsplan VFR — {flight.name || `${flight.departureAerodrome} – ${flight.destinationAerodrome}`}
      </h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
        <tbody>
          <PrintMetaRow
            cells={[
              ['Datum', flight.date],
              ['von', flight.departureAerodrome],
              ['nach', flight.destinationAerodrome],
              ['Ausweich', flight.alternateAerodrome ?? '–'],
            ]}
          />
          <PrintMetaRow
            cells={[
              ['LFZ-Muster', flight.aircraftType ?? '–'],
              ['LFZ-Kennz.', flight.aircraftRegistration ?? '–'],
              ['ETD', formatUtcMinutes(flight.etdUtcMin)],
              ['ATD', flight.atdUtcMin !== undefined ? formatUtcMinutes(flight.atdUtcMin) : '–'],
            ]}
          />
          <PrintMetaRow
            cells={[
              ['Überg.FL', `${flight.transitionAltitudeFt} ft`],
              ['TL', flight.transitionLevel || '–'],
              ['SS', flight.sunsetUtcMin !== undefined ? formatUtcMinutes(flight.sunsetUtcMin) : '–'],
              [
                'Wind/TAS/VAR (global)',
                `${String(flight.globalDefaults.wind.directionDeg).padStart(3, '0')}°/${flight.globalDefaults.wind.speedKt}kt, ${flight.globalDefaults.tasKt}kt, ${flight.globalDefaults.variationDeg}°`,
              ],
            ]}
          />
          <PrintMetaRow
            cells={[
              ['Gesamtstrecke (P14)', `${totalDistanceNm(flight).toFixed(1)} NM`],
              ['Gesamtzeit (P18)', `${totalTimeMin(flight)} min`],
            ]}
          />
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
        <thead>
          <tr>
            {[
              'Kontrollpunkt',
              'Sich.-Höhe',
              'Flughöhe',
              'TAS',
              'Wind',
              'TC',
              'WCA',
              'VAR',
              'MH',
              'MC ⚙',
              'Entf.Abschn.',
              'Entf.Rest',
              'GS',
              'Zeit Abschn.',
              'Zeit Rest ⚙',
              'ETO ⚙',
              'ATO',
              'Bemerkungen',
            ].map((h) => (
              <th key={h} style={printThStyle}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flight.legs.map((leg, index) => {
            const legDerived = derived[index]
            const eto = etos[index]
            const resolved = resolveLeg(flight, leg)
            const ato = flight.legActuals.find((a) => a.legId === leg.id)?.atoMin
            return (
              <tr key={leg.id}>
                <td style={printTdStyle}>{leg.waypoint}</td>
                <td style={printTdStyle}>{leg.safetyAltitudeFt ?? '–'}</td>
                <td style={printTdStyle}>{leg.plannedAltitude}</td>
                <td style={printTdStyle}>{resolved.tasKt}</td>
                <td style={printTdStyle}>
                  {String(resolved.wind.directionDeg).padStart(3, '0')}/{resolved.wind.speedKt}
                </td>
                <td style={printTdStyle}>{String(leg.tc).padStart(3, '0')}°</td>
                <td style={printTdStyle}>{leg.wca ?? '–'}°</td>
                <td style={printTdStyle}>{resolved.variationDeg}°</td>
                <td style={printTdStyle}>{leg.mh !== undefined ? `${String(leg.mh).padStart(3, '0')}°` : '–'}</td>
                <td style={printTdStyle}>{String(legDerived.mc).padStart(3, '0')}°</td>
                <td style={printTdStyle}>{leg.distanceNm}</td>
                <td style={printTdStyle}>{leg.distanceRemainNm ?? '–'}</td>
                <td style={printTdStyle}>{leg.gs ?? '–'}</td>
                <td style={printTdStyle}>{leg.timeMin ?? '–'}</td>
                <td style={printTdStyle}>{formatHoursMinutes(legDerived.remainingTimeMin)}</td>
                <td style={printTdStyle}>
                  {eto.revisedEtoMin}
                  {eto.deltaMin !== 0 ? ` (${formatDeltaMinutes(eto.deltaMin)})` : ''}
                </td>
                <td style={printTdStyle}>{ato ?? ''}</td>
                <td style={printTdStyle}>{leg.remarks ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p style={{ marginTop: '1mm', fontSize: '7px' }}>
        ETO/ATO/Zeit Rest: Minuten seit ATD{flight.atdUtcMin === undefined ? ' (bzw. ETD, solange keine ATD gesetzt ist)' : ''}
        {' '}— Anker hier: {formatUtcMinutes(anchorUtcMin)} UTC. ⚙ = automatisch berechnet, alle anderen Spalten
        Piloteneingabe.
      </p>
      <p style={{ marginTop: '2mm', fontSize: '7px' }}>
        Die App ist ein Hilfsmittel für die Planung und ersetzt weder die vorgeschriebene
        Flugvorbereitung noch amtliche Unterlagen. Alle Werte sind vom Piloten zu prüfen.
      </p>
    </div>
  )
}

const printThStyle: React.CSSProperties = {
  border: '1px solid #000',
  padding: '1mm',
  textAlign: 'left',
  fontSize: '7px',
}
const printTdStyle: React.CSSProperties = {
  border: '1px solid #000',
  padding: '1mm',
  fontSize: '7px',
}

function PrintMetaRow({ cells }: { cells: [string, string][] }) {
  return (
    <tr>
      {cells.map(([label, value]) => (
        <td key={label} style={{ padding: '0.5mm 2mm 0.5mm 0' }}>
          <strong>{label}:</strong> {value}
        </td>
      ))}
    </tr>
  )
}
