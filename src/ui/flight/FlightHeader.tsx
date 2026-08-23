import type { Flight } from '../../domain/types'
import { formatUtcMinutes } from '../../domain/format'
import { useFlightStore } from '../../store/flightStore'
import { TextField, TimeField } from '../components/FormField'

interface FlightHeaderProps {
  flight: Flight
  totalDistanceNm: number
  totalTimeMin: number
  anchorUtcMinutes: number
  estimatedArrivalUtcMin: number | undefined
}

/** Kopfzeile des Flugdurchführungsplans: Datum, Flugplätze, Muster, Zeiten
 * — genau die Felder aus dem Kopf des Papierformulars, in einer flachen
 * Zeile statt eines mehrteiligen Formulars. Gesamtstrecke (P14) und
 * Gesamtzeit (P18) sind Summenwerte, keine Tabellenspalten (siehe
 * domain/flightPlan.ts). */
export function FlightHeader({ flight, totalDistanceNm, totalTimeMin, anchorUtcMinutes, estimatedArrivalUtcMin }: FlightHeaderProps) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)
  const lastAtoMin = [...flight.legActuals].sort((a, b) => a.atoMin - b.atoMin).at(-1)?.atoMin
  const ataUtcMin = lastAtoMin !== undefined ? (((anchorUtcMinutes + lastAtoMin) % 1440) + 1440) % 1440 : undefined

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 py-2 sm:grid-cols-4 lg:grid-cols-6">
      <TextField id="h-name" label="Bezeichnung" value={flight.name} onChange={(v) => void patchCurrentFlight({ name: v })} />
      <label htmlFor="h-date" className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>Datum</span>
        <input
          id="h-date"
          type="date"
          value={flight.date}
          onChange={(e) => void patchCurrentFlight({ date: e.target.value })}
          className="mono-num rounded border px-2 py-1.5 text-sm"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        />
      </label>
      <TextField
        id="h-dep"
        label="von"
        value={flight.departureAerodrome}
        onChange={(v) => void patchCurrentFlight({ departureAerodrome: v.toUpperCase() })}
      />
      <TextField
        id="h-dst"
        label="nach"
        value={flight.destinationAerodrome}
        onChange={(v) => void patchCurrentFlight({ destinationAerodrome: v.toUpperCase() })}
      />
      <TextField
        id="h-alt"
        label="Ausweich"
        value={flight.alternateAerodrome}
        onChange={(v) => void patchCurrentFlight({ alternateAerodrome: v.toUpperCase() || undefined })}
      />
      <TextField
        id="h-type"
        label="LFZ-Muster"
        value={flight.aircraftType}
        onChange={(v) => void patchCurrentFlight({ aircraftType: v })}
      />
      <TextField
        id="h-reg"
        label="LFZ-Kennz."
        value={flight.aircraftRegistration}
        onChange={(v) => void patchCurrentFlight({ aircraftRegistration: v.toUpperCase() })}
      />
      <TimeField id="h-etd" label="ETD" value={flight.etdUtcMin} onChange={(v) => void patchCurrentFlight({ etdUtcMin: v ?? 0 })} />
      <TimeField id="h-atd" label="ATD" value={flight.atdUtcMin} onChange={(v) => void patchCurrentFlight({ atdUtcMin: v })} />
      <TimeField id="h-ss" label="SS" value={flight.sunsetUtcMin} onChange={(v) => void patchCurrentFlight({ sunsetUtcMin: v })} />

      <ReadOnlyField label="ETA (UTC)" value={estimatedArrivalUtcMin !== undefined ? formatUtcMinutes(estimatedArrivalUtcMin) : '–'} />
      <ReadOnlyField label="ATA (UTC)" value={ataUtcMin !== undefined ? formatUtcMinutes(ataUtcMin) : '–'} />
      <ReadOnlyField label="Gesamtstrecke (P14)" value={`${totalDistanceNm.toFixed(1)} NM`} />
      <ReadOnlyField label="Gesamtzeit (P18)" value={`${totalTimeMin} min`} />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      <span className="mono-num rounded border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}
