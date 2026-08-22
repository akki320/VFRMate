import type { Flight } from '../../domain/types'
import { useFlightStore } from '../../store/flightStore'
import { NumberField } from '../components/FormField'

/** Globale Standardwerte für TAS/Wind/VAR, einmal gesetzt und pro Leg
 * überschreibbar (siehe LegList — dort wird sichtbar, welche Legs
 * abweichen). */
export function GlobalDefaultsForm({ flight }: { flight: Flight }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)
  const defaults = flight.globalDefaults

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <NumberField
        id="global-tas"
        label="TAS"
        suffix="kt"
        value={defaults.tasKt}
        onChange={(v) => void patchCurrentFlight({ globalDefaults: { ...defaults, tasKt: v ?? 0 } })}
      />
      <NumberField
        id="global-wd"
        label="Wind, Richtung"
        suffix="°"
        value={defaults.wind.directionDeg}
        onChange={(v) =>
          void patchCurrentFlight({ globalDefaults: { ...defaults, wind: { ...defaults.wind, directionDeg: v ?? 0 } } })
        }
      />
      <NumberField
        id="global-ws"
        label="Wind, Stärke"
        suffix="kt"
        value={defaults.wind.speedKt}
        onChange={(v) =>
          void patchCurrentFlight({ globalDefaults: { ...defaults, wind: { ...defaults.wind, speedKt: v ?? 0 } } })
        }
      />
      <NumberField
        id="global-var"
        label="Missweisung (VAR)"
        suffix="°, Ost = +"
        value={defaults.variationDeg}
        onChange={(v) => void patchCurrentFlight({ globalDefaults: { ...defaults, variationDeg: v ?? 0 } })}
      />
    </div>
  )
}
