import type { Aircraft, Flight } from '../../../domain/types'
import { computeRunwayCalc, type RunwayConditions } from '../../../domain/runway'
import { useFlightStore } from '../../../store/flightStore'
import { CheckboxField, NumberField } from '../../components/FormField'

type RunwaySide = 'departure' | 'destination'

const EMPTY_CONDITIONS: RunwayConditions = {
  pressureAltitudeFt: 0,
  temperatureC: 15,
  headwindComponentKt: 0,
  slopePercent: 0,
  isGrass: false,
  isWetOrContaminated: false,
  availableRunwayLengthM: 0,
}

const SIDE_LABELS: Record<RunwaySide, string> = { departure: 'Start', destination: 'Landung' }

/** Start-/Landestrecke: Grundstrecke aus der POH-Tabelle plus Zuschläge,
 * verglichen mit der verfügbaren Bahnlänge. */
export function RunwayPanel({ flight, aircraft }: { flight: Flight; aircraft: Aircraft | undefined }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)

  const update = (side: RunwaySide, patch: Partial<RunwayConditions>) => {
    void patchCurrentFlight((f) => ({
      ...f,
      runwayConditions: {
        ...f.runwayConditions,
        [side]: { ...(f.runwayConditions?.[side] ?? EMPTY_CONDITIONS), ...patch },
      },
    }))
  }

  return (
    <div className="flex flex-col gap-6">
      {(['departure', 'destination'] as const).map((side) => {
        const conditions = flight.runwayConditions?.[side] ?? EMPTY_CONDITIONS
        const table = side === 'departure' ? aircraft?.takeoffTable : aircraft?.landingTable
        const result =
          aircraft && table && table.length > 0
            ? computeRunwayCalc(table, aircraft.runwayCorrectionFactors, conditions)
            : undefined

        return (
          <fieldset key={side} className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {SIDE_LABELS[side]} (
              {side === 'departure' ? flight.departureAerodrome || '–' : flight.destinationAerodrome || '–'})
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumberField
                id={`rwy-${side}-alt`}
                label="Druckhöhe"
                suffix="ft"
                value={conditions.pressureAltitudeFt}
                onChange={(v) => update(side, { pressureAltitudeFt: v ?? 0 })}
              />
              <NumberField
                id={`rwy-${side}-temp`}
                label="Temperatur"
                suffix="°C"
                value={conditions.temperatureC}
                onChange={(v) => update(side, { temperatureC: v ?? 0 })}
              />
              <NumberField
                id={`rwy-${side}-headwind`}
                label="Gegenwindkomp."
                suffix="kt, − = Rückenwind"
                value={conditions.headwindComponentKt}
                onChange={(v) => update(side, { headwindComponentKt: v ?? 0 })}
              />
              <NumberField
                id={`rwy-${side}-slope`}
                label="Neigung"
                suffix="%, − = Gefälle"
                value={conditions.slopePercent}
                onChange={(v) => update(side, { slopePercent: v ?? 0 })}
              />
              <NumberField
                id={`rwy-${side}-length`}
                label="Verfügbare Bahnlänge"
                suffix="m"
                value={conditions.availableRunwayLengthM}
                onChange={(v) => update(side, { availableRunwayLengthM: v ?? 0 })}
              />
              <CheckboxField
                id={`rwy-${side}-grass`}
                label="Graspiste"
                checked={conditions.isGrass}
                onChange={(v) => update(side, { isGrass: v })}
              />
              <CheckboxField
                id={`rwy-${side}-wet`}
                label="Nass/kontaminiert"
                checked={conditions.isWetOrContaminated}
                onChange={(v) => update(side, { isWetOrContaminated: v })}
              />
            </div>

            {result && (
              <div
                className="mono-num flex flex-wrap gap-x-6 gap-y-1 rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: result.withinAvailableLength ? 'var(--border)' : 'var(--signal-warning-border)',
                  backgroundColor: result.withinAvailableLength ? 'var(--bg-elevated)' : 'var(--signal-warning-bg)',
                  color: result.withinAvailableLength ? 'var(--text-primary)' : 'var(--signal-warning-text)',
                }}
              >
                <span>Grundstrecke: {result.baseGroundRunM} m</span>
                <span>Korrigiert: {result.correctedGroundRunM} m</span>
                <span>Über 15 m Hindernis: {result.correctedDistanceOver15mM} m</span>
                {!result.withinAvailableLength && <span>⚠ Reicht nicht für die verfügbare Bahnlänge</span>}
              </div>
            )}
            {(!aircraft || !table || table.length === 0) && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Keine {SIDE_LABELS[side].toLowerCase()}streckentabelle für dieses Muster hinterlegt.
              </p>
            )}
          </fieldset>
        )
      })}
    </div>
  )
}
