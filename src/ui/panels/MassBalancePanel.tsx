import type { Aircraft, Flight, MassBalance } from '../../domain/types'
import { computeMassBalance } from '../../domain/massBalance'
import { useFlightStore } from '../../store/flightStore'
import { NumberField } from '../components/FormField'

const EMPTY_LOAD: MassBalance = {
  emptyMassKg: 0,
  usableFuelL: 0,
  unusableFuelL: 0,
  oilKg: 0,
  seatRow1Kg: 0,
  seatRow2Kg: 0,
  seatRow3Kg: 0,
  baggageFrontKg: 0,
  baggageMidKg: 0,
  baggageRearKg: 0,
}

/** Masse & Schwerpunkt: Momentbildung, Schwerpunktlage, Prüfung gegen das
 * CG-Envelope des Musters. */
export function MassBalancePanel({ flight, aircraft }: { flight: Flight; aircraft: Aircraft | undefined }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)
  const load = flight.massBalanceLoad ?? EMPTY_LOAD

  const update = (patch: Partial<MassBalance>) => {
    void patchCurrentFlight((f) => ({ ...f, massBalanceLoad: { ...(f.massBalanceLoad ?? EMPTY_LOAD), ...patch } }))
  }

  const result = aircraft ? computeMassBalance(aircraft, load) : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberField
          id="mb-fuel-usable"
          label="Kraftstoff ausfliegbar"
          suffix="l"
          value={load.usableFuelL}
          onChange={(v) => update({ usableFuelL: v ?? 0 })}
        />
        <NumberField
          id="mb-fuel-unusable"
          label="Kraftstoff n. ausfliegbar"
          suffix="l"
          value={load.unusableFuelL}
          onChange={(v) => update({ unusableFuelL: v ?? 0 })}
        />
        <NumberField id="mb-oil" label="Schmierstoff" suffix="kg" value={load.oilKg} onChange={(v) => update({ oilKg: v ?? 0 })} />
        <NumberField
          id="mb-seat1"
          label="Sitzreihe 1"
          suffix="kg"
          value={load.seatRow1Kg}
          onChange={(v) => update({ seatRow1Kg: v ?? 0 })}
        />
        <NumberField
          id="mb-seat2"
          label="Sitzreihe 2"
          suffix="kg"
          value={load.seatRow2Kg}
          onChange={(v) => update({ seatRow2Kg: v ?? 0 })}
        />
        <NumberField
          id="mb-seat3"
          label="Sitzreihe 3"
          suffix="kg"
          value={load.seatRow3Kg}
          onChange={(v) => update({ seatRow3Kg: v ?? 0 })}
        />
        <NumberField
          id="mb-bag-front"
          label="Gepäck vorn"
          suffix="kg"
          value={load.baggageFrontKg}
          onChange={(v) => update({ baggageFrontKg: v ?? 0 })}
        />
        <NumberField
          id="mb-bag-mid"
          label="Gepäck mitte"
          suffix="kg"
          value={load.baggageMidKg}
          onChange={(v) => update({ baggageMidKg: v ?? 0 })}
        />
        <NumberField
          id="mb-bag-rear"
          label="Gepäck hinten"
          suffix="kg"
          value={load.baggageRearKg}
          onChange={(v) => update({ baggageRearKg: v ?? 0 })}
        />
      </div>

      {result && (
        <div
          className="mono-num flex flex-wrap gap-x-6 gap-y-1 rounded border px-3 py-2 text-sm"
          style={{
            borderColor: result.withinEnvelope ? 'var(--border)' : 'var(--signal-warning-border)',
            backgroundColor: result.withinEnvelope ? 'var(--bg-elevated)' : 'var(--signal-warning-bg)',
            color: result.withinEnvelope ? 'var(--text-primary)' : 'var(--signal-warning-text)',
          }}
        >
          <span>Gesamtmasse: {result.totalMassKg} kg</span>
          <span>Schwerpunkt: {result.cgM.toFixed(3)} m</span>
          {!result.withinEnvelope && <span>⚠ Außerhalb der Schwerpunktgrenzen</span>}
        </div>
      )}
      {!aircraft && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Kein Flugzeugmuster zugeordnet — Schwerpunktprüfung nicht möglich.
        </p>
      )}
    </div>
  )
}
