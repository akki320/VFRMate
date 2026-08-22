import type { Flight } from '../../domain/types'
import { useFlightStore } from '../../store/flightStore'
import { TextField } from '../components/FormField'

/** TWR/Ground/INFO/ATIS je Start- und Zielflugplatz. */
export function FrequenciesPanel({ flight }: { flight: Flight }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)

  const update = (side: 'departure' | 'destination', field: 'twr' | 'ground' | 'info' | 'atis', value: string) => {
    void patchCurrentFlight((f) => {
      const current = f.frequencies ?? { departure: {}, destination: {} }
      return {
        ...f,
        frequencies: { ...current, [side]: { ...current[side], [field]: value } },
      }
    })
  }

  const departure = flight.frequencies?.departure
  const destination = flight.frequencies?.destination

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Startflugplatz ({flight.departureAerodrome || '–'})
        </legend>
        <TextField id="freq-dep-twr" label="TWR" value={departure?.twr} onChange={(v) => update('departure', 'twr', v)} />
        <TextField
          id="freq-dep-ground"
          label="Ground"
          value={departure?.ground}
          onChange={(v) => update('departure', 'ground', v)}
        />
        <TextField id="freq-dep-info" label="INFO" value={departure?.info} onChange={(v) => update('departure', 'info', v)} />
        <TextField id="freq-dep-atis" label="ATIS" value={departure?.atis} onChange={(v) => update('departure', 'atis', v)} />
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Zielflugplatz ({flight.destinationAerodrome || '–'})
        </legend>
        <TextField
          id="freq-dst-twr"
          label="TWR"
          value={destination?.twr}
          onChange={(v) => update('destination', 'twr', v)}
        />
        <TextField
          id="freq-dst-ground"
          label="Ground"
          value={destination?.ground}
          onChange={(v) => update('destination', 'ground', v)}
        />
        <TextField
          id="freq-dst-info"
          label="INFO"
          value={destination?.info}
          onChange={(v) => update('destination', 'info', v)}
        />
        <TextField
          id="freq-dst-atis"
          label="ATIS"
          value={destination?.atis}
          onChange={(v) => update('destination', 'atis', v)}
        />
      </fieldset>
    </div>
  )
}
