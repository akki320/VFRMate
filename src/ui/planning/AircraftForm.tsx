import { useState } from 'react'
import type { Aircraft } from '../../domain/types'
import { NumberField, TextField } from '../components/FormField'
import { CgEnvelopeEditor } from './CgEnvelopeEditor'
import { RunwayTableEditor } from './RunwayTableEditor'

const BLANK_AIRCRAFT: Omit<Aircraft, 'id'> = {
  type: '',
  registration: '',
  defaultTasKt: 100,
  fuelConsumption: { cruiseLh: 0, climbLh: 0, taxiL: 0 },
  emptyMassKg: 0,
  arms: {
    seatRow1: 0,
    seatRow2: 0,
    seatRow3: 0,
    baggageFront: 0,
    baggageMid: 0,
    baggageRear: 0,
    fuel: 0,
  },
  fuelDensityKgPerL: 0.72,
  fuelCapacityL: 0,
  cgEnvelope: [],
  takeoffTable: [],
  landingTable: [],
  runwayCorrectionFactors: {
    perThousandFtAltitude: 0,
    perDegreeAboveIsa: 0,
    perKnotHeadwind: 0,
    perKnotTailwind: 0,
    perPercentSlopeUphill: 0,
    perPercentSlopeDownhill: 0,
    grassSurface: 0,
    wetOrContaminatedSurface: 0,
  },
}

interface AircraftFormProps {
  initial: Aircraft | undefined
  onSave: (data: Omit<Aircraft, 'id'>) => void
  onCancel: () => void
}

/** Vollständiges Formular für ein Flugzeugmuster: Stammdaten, Hebelarme,
 * Verbrauch, Schwerpunktgrenzen und Start-/Landestreckentabellen. */
export function AircraftForm({ initial, onSave, onCancel }: AircraftFormProps) {
  const [data, setData] = useState<Omit<Aircraft, 'id'>>(initial ?? BLANK_AIRCRAFT)

  const set = <K extends keyof Omit<Aircraft, 'id'>>(key: K, value: Omit<Aircraft, 'id'>[K]) =>
    setData((d) => ({ ...d, [key]: value }))

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(data)
      }}
      className="flex flex-col gap-6"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TextField id="ac-type" label="Muster" value={data.type} onChange={(v) => set('type', v)} />
        <TextField
          id="ac-reg"
          label="Kennzeichen"
          value={data.registration}
          onChange={(v) => set('registration', v)}
        />
        <NumberField
          id="ac-tas"
          label="Standard-TAS"
          suffix="kt"
          value={data.defaultTasKt}
          onChange={(v) => set('defaultTasKt', v ?? 0)}
        />
        <NumberField
          id="ac-empty-mass"
          label="Leermasse"
          suffix="kg"
          value={data.emptyMassKg}
          onChange={(v) => set('emptyMassKg', v ?? 0)}
        />
        <NumberField
          id="ac-fuel-density"
          label="Kraftstoffdichte"
          suffix="kg/l"
          step={0.01}
          value={data.fuelDensityKgPerL}
          onChange={(v) => set('fuelDensityKgPerL', v ?? 0)}
        />
        <NumberField
          id="ac-fuel-capacity"
          label="Kraftstoffkapazität"
          suffix="l"
          value={data.fuelCapacityL}
          onChange={(v) => set('fuelCapacityL', v ?? 0)}
        />
      </div>

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Verbrauch
        </legend>
        <NumberField
          id="ac-cruise-lh"
          label="Reiseflug"
          suffix="l/h"
          value={data.fuelConsumption.cruiseLh}
          onChange={(v) => set('fuelConsumption', { ...data.fuelConsumption, cruiseLh: v ?? 0 })}
        />
        <NumberField
          id="ac-climb-lh"
          label="Steigflug"
          suffix="l/h"
          value={data.fuelConsumption.climbLh}
          onChange={(v) => set('fuelConsumption', { ...data.fuelConsumption, climbLh: v ?? 0 })}
        />
        <NumberField
          id="ac-taxi-l"
          label="Anlassen/Rollen"
          suffix="l"
          value={data.fuelConsumption.taxiL}
          onChange={(v) => set('fuelConsumption', { ...data.fuelConsumption, taxiL: v ?? 0 })}
        />
      </fieldset>

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Hebelarme (m ab Bezugspunkt)
        </legend>
        <NumberField
          id="ac-arm-seat1"
          label="Sitzreihe 1"
          step={0.01}
          value={data.arms.seatRow1}
          onChange={(v) => set('arms', { ...data.arms, seatRow1: v ?? 0 })}
        />
        <NumberField
          id="ac-arm-seat2"
          label="Sitzreihe 2"
          step={0.01}
          value={data.arms.seatRow2}
          onChange={(v) => set('arms', { ...data.arms, seatRow2: v ?? 0 })}
        />
        <NumberField
          id="ac-arm-seat3"
          label="Sitzreihe 3"
          step={0.01}
          value={data.arms.seatRow3}
          onChange={(v) => set('arms', { ...data.arms, seatRow3: v ?? 0 })}
        />
        <NumberField
          id="ac-arm-fuel"
          label="Kraftstoff"
          step={0.01}
          value={data.arms.fuel}
          onChange={(v) => set('arms', { ...data.arms, fuel: v ?? 0 })}
        />
        <NumberField
          id="ac-arm-bag-front"
          label="Gepäck vorn"
          step={0.01}
          value={data.arms.baggageFront}
          onChange={(v) => set('arms', { ...data.arms, baggageFront: v ?? 0 })}
        />
        <NumberField
          id="ac-arm-bag-mid"
          label="Gepäck mitte"
          step={0.01}
          value={data.arms.baggageMid}
          onChange={(v) => set('arms', { ...data.arms, baggageMid: v ?? 0 })}
        />
        <NumberField
          id="ac-arm-bag-rear"
          label="Gepäck hinten"
          step={0.01}
          value={data.arms.baggageRear}
          onChange={(v) => set('arms', { ...data.arms, baggageRear: v ?? 0 })}
        />
      </fieldset>

      <CgEnvelopeEditor points={data.cgEnvelope} onChange={(v) => set('cgEnvelope', v)} />

      <RunwayTableEditor label="Startstrecke" rows={data.takeoffTable} onChange={(v) => set('takeoffTable', v)} />
      <RunwayTableEditor label="Landestrecke" rows={data.landingTable} onChange={(v) => set('landingTable', v)} />

      <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Zuschlagsfaktoren Start-/Landestrecke
        </legend>
        <NumberField
          id="ac-rwy-alt"
          label="je 1000 ft Höhe"
          step={0.01}
          value={data.runwayCorrectionFactors.perThousandFtAltitude}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, perThousandFtAltitude: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-temp"
          label="je °C über ISA"
          step={0.01}
          value={data.runwayCorrectionFactors.perDegreeAboveIsa}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, perDegreeAboveIsa: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-headwind"
          label="je kt Gegenwind"
          step={0.001}
          value={data.runwayCorrectionFactors.perKnotHeadwind}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, perKnotHeadwind: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-tailwind"
          label="je kt Rückenwind"
          step={0.001}
          value={data.runwayCorrectionFactors.perKnotTailwind}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, perKnotTailwind: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-slope-up"
          label="je % Steigung"
          step={0.01}
          value={data.runwayCorrectionFactors.perPercentSlopeUphill}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, perPercentSlopeUphill: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-slope-down"
          label="je % Gefälle"
          step={0.01}
          value={data.runwayCorrectionFactors.perPercentSlopeDownhill}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, perPercentSlopeDownhill: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-grass"
          label="Graspiste"
          step={0.01}
          value={data.runwayCorrectionFactors.grassSurface}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, grassSurface: v ?? 0 })}
        />
        <NumberField
          id="ac-rwy-wet"
          label="Nass/kontaminiert"
          step={0.01}
          value={data.runwayCorrectionFactors.wetOrContaminatedSurface}
          onChange={(v) => set('runwayCorrectionFactors', { ...data.runwayCorrectionFactors, wetOrContaminatedSurface: v ?? 0 })}
        />
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
        >
          Speichern
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
