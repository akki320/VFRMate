import type { Aircraft, Flight, FuelPlan } from '../../domain/types'
import { checkFuelPlan } from '../../domain/fuel'
import { useFlightStore } from '../../store/flightStore'
import { NumberField } from '../components/FormField'

const EMPTY_FUEL_PLAN: FuelPlan = {
  startAndTaxiL: 0,
  climbL: 0,
  cruiseL: 0,
  approachContingencyL: 0,
  alternateL: 0,
  reserveL: 0,
  extraL: 0,
  onboardL: 0,
}

/** Kraftstoffplan: Mindestbedarf, sichere Flugzeit, Warnung bei knappem Vorrat. */
export function FuelPanel({ flight, aircraft }: { flight: Flight; aircraft: Aircraft | undefined }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)
  const plan = flight.fuelPlan ?? EMPTY_FUEL_PLAN

  const update = (patch: Partial<FuelPlan>) => {
    void patchCurrentFlight((f) => ({ ...f, fuelPlan: { ...(f.fuelPlan ?? EMPTY_FUEL_PLAN), ...patch } }))
  }

  const result = aircraft ? checkFuelPlan(plan, aircraft.fuelConsumption.cruiseLh) : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField
          id="fuel-taxi"
          label="Anlassen/Rollen"
          suffix="l"
          value={plan.startAndTaxiL}
          onChange={(v) => update({ startAndTaxiL: v ?? 0 })}
        />
        <NumberField id="fuel-climb" label="Steigflug" suffix="l" value={plan.climbL} onChange={(v) => update({ climbL: v ?? 0 })} />
        <NumberField
          id="fuel-cruise"
          label="Reiseflug"
          suffix="l"
          value={plan.cruiseL}
          onChange={(v) => update({ cruiseL: v ?? 0 })}
        />
        <NumberField
          id="fuel-contingency"
          label="An-/Abflugzuschlag"
          suffix="l"
          value={plan.approachContingencyL}
          onChange={(v) => update({ approachContingencyL: v ?? 0 })}
        />
        <NumberField
          id="fuel-alternate"
          label="Ausweichflugplatz"
          suffix="l"
          value={plan.alternateL}
          onChange={(v) => update({ alternateL: v ?? 0 })}
        />
        <NumberField
          id="fuel-reserve"
          label="Reserve"
          suffix="l"
          value={plan.reserveL}
          onChange={(v) => update({ reserveL: v ?? 0 })}
        />
        <NumberField id="fuel-extra" label="Extra" suffix="l" value={plan.extraL} onChange={(v) => update({ extraL: v ?? 0 })} />
        <NumberField
          id="fuel-onboard"
          label="Vorrat an Bord"
          suffix="l"
          value={plan.onboardL}
          onChange={(v) => update({ onboardL: v ?? 0 })}
        />
      </div>

      {result && (
        <div
          className="mono-num flex flex-wrap gap-x-6 gap-y-1 rounded border px-3 py-2 text-sm"
          style={{
            borderColor: result.insufficientFuel ? 'var(--signal-warning-border)' : 'var(--border)',
            backgroundColor: result.insufficientFuel ? 'var(--signal-warning-bg)' : 'var(--bg-elevated)',
            color: result.insufficientFuel ? 'var(--signal-warning-text)' : 'var(--text-primary)',
          }}
        >
          <span>Mindestbedarf: {result.minimumRequiredL} l</span>
          <span>Vorrat: {result.onboardL} l</span>
          <span>Sichere Flugzeit: {result.safeEnduranceMin} min</span>
          {result.insufficientFuel && <span>⚠ Vorrat unter Mindestbedarf</span>}
        </div>
      )}
      {!aircraft && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Kein Flugzeugmuster zugeordnet — Mindestbedarf/sichere Flugzeit können nicht berechnet werden.
        </p>
      )}
    </div>
  )
}
