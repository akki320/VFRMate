import type { Flight, WeatherInfo } from '../../domain/types'
import { useFlightStore } from '../../store/flightStore'
import { formatUtcMinutes, parseUtcMinutes } from '../../domain/format'
import { NumberField, TextField } from '../components/FormField'

type WeatherSide = 'departure' | 'destination' | 'alternate'

const SIDE_LABELS: Record<WeatherSide, string> = {
  departure: 'Start',
  destination: 'Ziel',
  alternate: 'Ausweich',
}

/** Wettermeldung/-beratung je Start-, Ziel- und Ausweichflugplatz. */
export function WeatherPanel({ flight }: { flight: Flight }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)

  const update = (side: WeatherSide, patch: Partial<WeatherInfo>) => {
    void patchCurrentFlight((f) => ({
      ...f,
      weather: { ...f.weather, [side]: { ...f.weather?.[side], ...patch } },
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      {(['departure', 'destination', 'alternate'] as const).map((side) => {
        const w = flight.weather?.[side]
        return (
          <fieldset key={side} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <legend className="col-span-2 mb-1 text-sm font-medium sm:col-span-4" style={{ color: 'var(--text-primary)' }}>
              {SIDE_LABELS[side]}
            </legend>
            <NumberField
              id={`wx-${side}-qnh`}
              label="QNH"
              suffix="hPa"
              value={w?.qnhHpa}
              onChange={(v) => update(side, { qnhHpa: v })}
            />
            <NumberField
              id={`wx-${side}-temp`}
              label="Temp"
              suffix="°C"
              value={w?.temperatureC}
              onChange={(v) => update(side, { temperatureC: v })}
            />
            <NumberField
              id={`wx-${side}-dewpoint`}
              label="Taupunkt"
              suffix="°C"
              value={w?.dewPointC}
              onChange={(v) => update(side, { dewPointC: v })}
            />
            <NumberField
              id={`wx-${side}-wd`}
              label="Wind"
              suffix="°"
              value={w?.windDirectionDeg}
              onChange={(v) => update(side, { windDirectionDeg: v })}
            />
            <NumberField
              id={`wx-${side}-ws`}
              label="Windstärke"
              suffix="kt"
              value={w?.windSpeedKt}
              onChange={(v) => update(side, { windSpeedKt: v })}
            />
            <NumberField
              id={`wx-${side}-vis`}
              label="Sicht"
              suffix="m"
              value={w?.visibilityM}
              onChange={(v) => update(side, { visibilityM: v })}
            />
            <TextField id={`wx-${side}-clouds`} label="Wolken" value={w?.clouds} onChange={(v) => update(side, { clouds: v })} />
            <TextField id={`wx-${side}-gafor`} label="GAFOR" value={w?.gafor} onChange={(v) => update(side, { gafor: v })} />
            <TextField
              id={`wx-${side}-valid-from`}
              label="Gültig ab (HH:MM)"
              value={w?.validFrom !== undefined ? formatUtcMinutes(w.validFrom) : ''}
              onChange={(v) => {
                const parsed = parseUtcMinutes(v)
                update(side, { validFrom: Number.isNaN(parsed) ? undefined : parsed })
              }}
            />
            <TextField
              id={`wx-${side}-valid-until`}
              label="Gültig bis (HH:MM)"
              value={w?.validUntil !== undefined ? formatUtcMinutes(w.validUntil) : ''}
              onChange={(v) => {
                const parsed = parseUtcMinutes(v)
                update(side, { validUntil: Number.isNaN(parsed) ? undefined : parsed })
              }}
            />
          </fieldset>
        )
      })}
    </div>
  )
}
