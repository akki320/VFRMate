import { useState } from 'react'
import type { Coordinates } from '../../domain/greatCircle'
import { greatCircleBearingAndDistance } from '../../domain/greatCircle'
import type { Leg } from '../../domain/types'
import { useFlightStore } from '../../store/flightStore'
import { NumberField, TextField } from '../components/FormField'

interface LegEditorRowProps {
  leg: Leg
  index: number
  total: number
  previousPointCoordinates: Coordinates | undefined
  isDeviatingFromGlobal: { tas: boolean; wind: boolean; variation: boolean }
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
}

/** Ein Leg im Planungsformular: TC/Distanz manuell oder aus Koordinaten
 * abgeleitet, optionale Overrides für TAS/Wind/VAR gegenüber den globalen
 * Standardwerten, Umbenennen/Löschen/Neuordnen. */
export function LegEditorRow({
  leg,
  index,
  total,
  previousPointCoordinates,
  isDeviatingFromGlobal,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: LegEditorRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
  const removeLeg = useFlightStore((s) => s.removeLeg)
  const [expanded, setExpanded] = useState(false)

  const canDeriveFromCoordinates = leg.coordinates !== undefined && previousPointCoordinates !== undefined

  const deriveFromCoordinates = () => {
    if (!canDeriveFromCoordinates) return
    const { tc, distanceNm } = greatCircleBearingAndDistance(previousPointCoordinates!, leg.coordinates!)
    void updateLeg(leg.id, { tc, distanceNm })
  }

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="rounded border"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <span aria-hidden="true" className="cursor-grab select-none" style={{ color: 'var(--text-muted)' }} title="Ziehen zum Umsortieren">
          ⠿
        </span>
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Nach oben verschieben"
            className="rounded border px-1 text-xs leading-none disabled:opacity-30"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Nach unten verschieben"
            className="rounded border px-1 text-xs leading-none disabled:opacity-30"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            ▼
          </button>
        </div>

        <input
          aria-label="Kontrollpunkt"
          value={leg.waypoint}
          onChange={(e) => void updateLeg(leg.id, { waypoint: e.target.value })}
          placeholder="Kontrollpunkt"
          className="min-w-0 flex-1 rounded border px-2 py-1.5 text-sm font-medium"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
        />

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {expanded ? 'weniger' : 'mehr'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Leg "${leg.waypoint}" wirklich löschen?`)) void removeLeg(leg.id)
          }}
          aria-label={`Leg ${leg.waypoint} löschen`}
          className="rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--signal-warning-border)', color: 'var(--signal-warning-text)' }}
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-3 pb-3 sm:grid-cols-4">
        <NumberField id={`leg-${leg.id}-tc`} label="TC" suffix="°" value={leg.tc} onChange={(v) => void updateLeg(leg.id, { tc: v ?? 0 })} />
        <NumberField
          id={`leg-${leg.id}-dist`}
          label="Distanz"
          suffix="NM"
          step={0.1}
          value={leg.distanceNm}
          onChange={(v) => void updateLeg(leg.id, { distanceNm: v ?? 0 })}
        />
        <NumberField
          id={`leg-${leg.id}-safety`}
          label="Sicherh.-Höhe"
          suffix="ft"
          value={leg.safetyAltitudeFt}
          onChange={(v) => void updateLeg(leg.id, { safetyAltitudeFt: v })}
        />
        <TextField
          id={`leg-${leg.id}-alt`}
          label="Flughöhe"
          value={leg.plannedAltitude}
          onChange={(v) => void updateLeg(leg.id, { plannedAltitude: v })}
        />
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t px-3 py-3" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField
              id={`leg-${leg.id}-lat`}
              label="Breite"
              suffix="°"
              step={0.0001}
              value={leg.coordinates?.lat}
              onChange={(v) =>
                void updateLeg(leg.id, {
                  coordinates: v === undefined ? undefined : { lat: v, lon: leg.coordinates?.lon ?? 0 },
                })
              }
            />
            <NumberField
              id={`leg-${leg.id}-lon`}
              label="Länge"
              suffix="°"
              step={0.0001}
              value={leg.coordinates?.lon}
              onChange={(v) =>
                void updateLeg(leg.id, {
                  coordinates: v === undefined ? undefined : { lat: leg.coordinates?.lat ?? 0, lon: v },
                })
              }
            />
            <div className="col-span-2 flex items-end">
              <button
                type="button"
                disabled={!canDeriveFromCoordinates}
                onClick={deriveFromCoordinates}
                className="rounded border px-3 py-1.5 text-xs disabled:opacity-30"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                title={
                  canDeriveFromCoordinates
                    ? 'TC und Distanz aus Koordinaten übernehmen'
                    : 'Benötigt Koordinaten dieses und des vorherigen Punkts'
                }
              >
                TC/Distanz aus Koordinaten übernehmen
              </button>
            </div>
          </div>

          <OverrideField
            label="TAS"
            suffix="kt"
            isOverridden={isDeviatingFromGlobal.tas}
            value={leg.tasKt}
            onToggle={(on) => void updateLeg(leg.id, { tasKt: on ? leg.tasKt ?? 0 : undefined })}
            onChange={(v) => void updateLeg(leg.id, { tasKt: v })}
            idPrefix={`leg-${leg.id}-tas`}
          />
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={leg.wind !== undefined}
                onChange={(e) =>
                  void updateLeg(leg.id, {
                    wind: e.target.checked ? (leg.wind ?? { directionDeg: 0, speedKt: 0 }) : undefined,
                  })
                }
              />
              Eigener Wind {isDeviatingFromGlobal.wind ? '(weicht ab)' : ''}
            </label>
            {leg.wind !== undefined && (
              <>
                <NumberField
                  id={`leg-${leg.id}-wd`}
                  label="Richtung"
                  suffix="°"
                  value={leg.wind.directionDeg}
                  onChange={(v) => void updateLeg(leg.id, { wind: { ...leg.wind!, directionDeg: v ?? 0 } })}
                />
                <NumberField
                  id={`leg-${leg.id}-ws`}
                  label="Stärke"
                  suffix="kt"
                  value={leg.wind.speedKt}
                  onChange={(v) => void updateLeg(leg.id, { wind: { ...leg.wind!, speedKt: v ?? 0 } })}
                />
              </>
            )}
          </div>
          <OverrideField
            label="VAR"
            suffix="°, Ost = +"
            isOverridden={isDeviatingFromGlobal.variation}
            value={leg.variationDeg}
            onToggle={(on) => void updateLeg(leg.id, { variationDeg: on ? leg.variationDeg ?? 0 : undefined })}
            onChange={(v) => void updateLeg(leg.id, { variationDeg: v })}
            idPrefix={`leg-${leg.id}-var`}
          />

          <TextField
            id={`leg-${leg.id}-remarks`}
            label="Bemerkungen"
            value={leg.remarks}
            onChange={(v) => void updateLeg(leg.id, { remarks: v })}
          />
        </div>
      )}
    </li>
  )
}

function OverrideField({
  label,
  suffix,
  isOverridden,
  value,
  onToggle,
  onChange,
  idPrefix,
}: {
  label: string
  suffix: string
  isOverridden: boolean
  value: number | undefined
  onToggle: (on: boolean) => void
  onChange: (v: number | undefined) => void
  idPrefix: string
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <input type="checkbox" checked={value !== undefined} onChange={(e) => onToggle(e.target.checked)} />
        Eigene {label} {isOverridden ? '(weicht ab)' : ''}
      </label>
      {value !== undefined && <NumberField id={idPrefix} label={label} suffix={suffix} value={value} onChange={onChange} />}
    </div>
  )
}
