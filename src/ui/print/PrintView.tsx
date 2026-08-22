import type { Aircraft, Flight } from '../../domain/types'
import { computeFlightLegs, reEstimateLegs, resolveLeg } from '../../domain/navigation'
import { formatDeltaMinutes, formatUtcMinutes } from '../../domain/format'
import { checkFuelPlan } from '../../domain/fuel'
import { computeMassBalance } from '../../domain/massBalance'
import { computeRunwayCalc } from '../../domain/runway'

/**
 * Druckansicht: eine A4-Seite im Layout des Papierformulars, als Backup
 * für den Flug (siehe .print-only in index.css — auf dem Bildschirm
 * unsichtbar, erscheint nur im Druck). Bewusst eigenständig und in
 * expliziten Schwarz-auf-Weiß-Farben gehalten, unabhängig vom
 * Nacht-/Tagmodus der Bildschirmansicht.
 */
export function PrintView({ flight, aircraft }: { flight: Flight | undefined; aircraft: Aircraft | undefined }) {
  if (!flight) return null

  const computedLegs = computeFlightLegs(flight)
  const reEstimated = reEstimateLegs(flight, computedLegs)
  const fuelCheck = aircraft && flight.fuelPlan ? checkFuelPlan(flight.fuelPlan, aircraft.fuelConsumption.cruiseLh) : undefined
  const massBalance = aircraft && flight.massBalanceLoad ? computeMassBalance(aircraft, flight.massBalanceLoad) : undefined

  const takeoffCalc =
    aircraft && aircraft.takeoffTable.length > 0 && flight.runwayConditions?.departure
      ? computeRunwayCalc(aircraft.takeoffTable, aircraft.runwayCorrectionFactors, flight.runwayConditions.departure)
      : undefined
  const landingCalc =
    aircraft && aircraft.landingTable.length > 0 && flight.runwayConditions?.destination
      ? computeRunwayCalc(aircraft.landingTable, aircraft.runwayCorrectionFactors, flight.runwayConditions.destination)
      : undefined

  return (
    <div className="print-only" style={{ color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '9px' }}>
      <h1 style={{ fontSize: '14px', marginBottom: '2mm' }}>
        Flugdurchführungsplan — {flight.name || `${flight.departureAerodrome} – ${flight.destinationAerodrome}`}
      </h1>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3mm' }}>
        <tbody>
          <PrintMetaRow
            cells={[
              ['Datum', flight.date],
              ['Start', flight.departureAerodrome],
              ['Ziel', flight.destinationAerodrome],
              ['Ausweich', flight.alternateAerodrome ?? '–'],
            ]}
          />
          <PrintMetaRow
            cells={[
              ['Muster', aircraft ? `${aircraft.type} (${aircraft.registration})` : '–'],
              ['ETD', formatUtcMinutes(flight.etdUtcMin)],
              ['ATD', flight.atdUtcMin !== undefined ? formatUtcMinutes(flight.atdUtcMin) : '–'],
              ['SS', flight.sunsetUtcMin !== undefined ? formatUtcMinutes(flight.sunsetUtcMin) : '–'],
            ]}
          />
          <PrintMetaRow
            cells={[
              ['Übergangshöhe', `${flight.transitionAltitudeFt} ft`],
              ['Transition Level', flight.transitionLevel || '–'],
              ['TAS (global)', `${flight.globalDefaults.tasKt} kt`],
              [
                'Wind (global)',
                `${String(flight.globalDefaults.wind.directionDeg).padStart(3, '0')}° / ${flight.globalDefaults.wind.speedKt} kt`,
              ],
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
              'TC',
              'MH',
              'Wind',
              'VAR',
              'TAS',
              'GS',
              'Distanz',
              'Zeit',
              'ETO',
              'ATO',
              'Flughöhe',
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
            const computed = computedLegs[index]
            const re = reEstimated[index]
            const resolved = resolveLeg(flight, leg)
            const ato = flight.legActuals.find((a) => a.legId === leg.id)?.atoUtcMin
            return (
              <tr key={leg.id}>
                <td style={printTdStyle}>{leg.waypoint}</td>
                <td style={printTdStyle}>{leg.safetyAltitudeFt ?? '–'}</td>
                <td style={printTdStyle}>{String(leg.tc).padStart(3, '0')}°</td>
                <td style={printTdStyle}>{String(computed.mh).padStart(3, '0')}°</td>
                <td style={printTdStyle}>
                  {String(resolved.wind.directionDeg).padStart(3, '0')}°/{resolved.wind.speedKt}
                </td>
                <td style={printTdStyle}>{resolved.variationDeg}°</td>
                <td style={printTdStyle}>{resolved.tasKt}</td>
                <td style={printTdStyle}>{computed.gs}</td>
                <td style={printTdStyle}>{leg.distanceNm}</td>
                <td style={printTdStyle}>{computed.legTimeMin}</td>
                <td style={printTdStyle}>
                  {formatUtcMinutes(computed.etoUtcMin)}
                  {re.deltaMin !== 0 ? ` (${formatDeltaMinutes(re.deltaMin)})` : ''}
                </td>
                <td style={printTdStyle}>{ato !== undefined ? formatUtcMinutes(ato) : ''}</td>
                <td style={printTdStyle}>{leg.plannedAltitude}</td>
                <td style={printTdStyle}>{leg.remarks ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '4mm', marginBottom: '3mm' }}>
        <PrintSection title="Kraftstoff" style={{ flex: 1 }}>
          {flight.fuelPlan ? (
            <PrintKeyValues
              items={[
                ['Anlassen/Rollen', `${flight.fuelPlan.startAndTaxiL} l`],
                ['Steigflug', `${flight.fuelPlan.climbL} l`],
                ['Reiseflug', `${flight.fuelPlan.cruiseL} l`],
                ['An-/Abflugzuschlag', `${flight.fuelPlan.approachContingencyL} l`],
                ['Ausweichflugplatz', `${flight.fuelPlan.alternateL} l`],
                ['Reserve', `${flight.fuelPlan.reserveL} l`],
                ['Extra', `${flight.fuelPlan.extraL} l`],
                ['Vorrat an Bord', `${flight.fuelPlan.onboardL} l`],
                ...(fuelCheck
                  ? ([
                      ['Mindestbedarf', `${fuelCheck.minimumRequiredL} l`],
                      ['Sichere Flugzeit', `${fuelCheck.safeEnduranceMin} min`],
                    ] as const)
                  : []),
              ]}
            />
          ) : (
            <em>keine Angaben</em>
          )}
        </PrintSection>

        <PrintSection title="Masse & Schwerpunkt" style={{ flex: 1 }}>
          {massBalance ? (
            <PrintKeyValues
              items={[
                ['Gesamtmasse', `${massBalance.totalMassKg} kg`],
                ['Schwerpunkt', `${massBalance.cgM.toFixed(3)} m`],
                ['Innerhalb Grenzen', massBalance.withinEnvelope ? 'ja' : 'NEIN'],
              ]}
            />
          ) : (
            <em>keine Angaben</em>
          )}
        </PrintSection>

        <PrintSection title="Start-/Landestrecke" style={{ flex: 1 }}>
          <PrintKeyValues
            items={[
              ['Start, korrigiert', takeoffCalc ? `${takeoffCalc.correctedDistanceOver15mM} m` : '–'],
              ['Landung, korrigiert', landingCalc ? `${landingCalc.correctedDistanceOver15mM} m` : '–'],
            ]}
          />
        </PrintSection>
      </div>

      <PrintSection title="Frequenzen">
        <PrintKeyValues
          items={[
            [
              `${flight.departureAerodrome} TWR/Ground/INFO/ATIS`,
              [
                flight.frequencies?.departure.twr,
                flight.frequencies?.departure.ground,
                flight.frequencies?.departure.info,
                flight.frequencies?.departure.atis,
              ]
                .filter(Boolean)
                .join(' / ') || '–',
            ],
            [
              `${flight.destinationAerodrome} TWR/Ground/INFO/ATIS`,
              [
                flight.frequencies?.destination.twr,
                flight.frequencies?.destination.ground,
                flight.frequencies?.destination.info,
                flight.frequencies?.destination.atis,
              ]
                .filter(Boolean)
                .join(' / ') || '–',
            ],
          ]}
        />
      </PrintSection>

      <p style={{ marginTop: '4mm', fontSize: '7px' }}>
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
  fontSize: '8px',
}
const printTdStyle: React.CSSProperties = {
  border: '1px solid #000',
  padding: '1mm',
  fontSize: '8px',
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

function PrintSection({
  title,
  children,
  style,
}: {
  title: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <h2 style={{ fontSize: '10px', borderBottom: '1px solid #000', marginBottom: '1mm' }}>{title}</h2>
      {children}
    </div>
  )
}

function PrintKeyValues({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {items.map(([label, value]) => (
          <tr key={label}>
            <td style={{ padding: '0.3mm 2mm 0.3mm 0', whiteSpace: 'nowrap' }}>{label}</td>
            <td style={{ padding: '0.3mm 0' }}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
