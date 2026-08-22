import type { Flight } from '../../domain/types'
import { useAircraftStore } from '../../store/aircraftStore'
import { useFlightStore } from '../../store/flightStore'
import { NumberField, TextField, TimeField } from '../components/FormField'

/** Rahmendaten des Fluges: Bezeichnung, Flugplätze, Zeiten, Muster. */
export function FlightMetaForm({ flight }: { flight: Flight }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)
  const aircraftList = useAircraftStore((s) => s.aircraft)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField id="meta-name" label="Bezeichnung" value={flight.name} onChange={(v) => void patchCurrentFlight({ name: v })} />
        <label htmlFor="meta-date" className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Datum</span>
          <input
            id="meta-date"
            type="date"
            value={flight.date}
            onChange={(e) => void patchCurrentFlight({ date: e.target.value })}
            className="mono-num rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextField
          id="meta-dep"
          label="Startflugplatz"
          value={flight.departureAerodrome}
          onChange={(v) => void patchCurrentFlight({ departureAerodrome: v.toUpperCase() })}
        />
        <TextField
          id="meta-dst"
          label="Zielflugplatz"
          value={flight.destinationAerodrome}
          onChange={(v) => void patchCurrentFlight({ destinationAerodrome: v.toUpperCase() })}
        />
        <TextField
          id="meta-alt"
          label="Ausweichflugplatz"
          value={flight.alternateAerodrome}
          onChange={(v) => void patchCurrentFlight({ alternateAerodrome: v.toUpperCase() || undefined })}
        />
        <label htmlFor="meta-aircraft" className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span>Flugzeugmuster</span>
          <select
            id="meta-aircraft"
            value={flight.aircraftId}
            onChange={(e) => void patchCurrentFlight({ aircraftId: e.target.value })}
            className="mono-num rounded border px-2 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="">– wählen –</option>
            {aircraftList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.type} ({a.registration})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TimeField id="meta-etd" label="ETD" value={flight.etdUtcMin} onChange={(v) => void patchCurrentFlight({ etdUtcMin: v ?? 0 })} />
        <TimeField
          id="meta-atd"
          label="ATD"
          value={flight.atdUtcMin}
          onChange={(v) => void patchCurrentFlight({ atdUtcMin: v })}
        />
        <TimeField
          id="meta-sunset"
          label="Sonnenuntergang (SS)"
          value={flight.sunsetUtcMin}
          onChange={(v) => void patchCurrentFlight({ sunsetUtcMin: v })}
        />
        <NumberField
          id="meta-ta"
          label="Übergangshöhe"
          suffix="ft"
          value={flight.transitionAltitudeFt}
          onChange={(v) => void patchCurrentFlight({ transitionAltitudeFt: v ?? 0 })}
        />
        <TextField
          id="meta-tl"
          label="Transition Level"
          value={flight.transitionLevel}
          onChange={(v) => void patchCurrentFlight({ transitionLevel: v })}
        />
      </div>

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Koordinaten Startflugplatz (optional, für Großkreisrechnung des ersten Legs)
        </legend>
        <NumberField
          id="meta-dep-lat"
          label="Breite"
          suffix="°"
          step={0.0001}
          value={flight.departureCoordinates?.lat}
          onChange={(v) =>
            void patchCurrentFlight({
              departureCoordinates:
                v === undefined ? undefined : { lat: v, lon: flight.departureCoordinates?.lon ?? 0 },
            })
          }
        />
        <NumberField
          id="meta-dep-lon"
          label="Länge"
          suffix="°"
          step={0.0001}
          value={flight.departureCoordinates?.lon}
          onChange={(v) =>
            void patchCurrentFlight({
              departureCoordinates:
                v === undefined ? undefined : { lat: flight.departureCoordinates?.lat ?? 0, lon: v },
            })
          }
        />
      </fieldset>
    </div>
  )
}
