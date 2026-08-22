import type { MassMomentPoint } from '../../domain/types'

interface CgEnvelopeEditorProps {
  points: MassMomentPoint[]
  onChange: (points: MassMomentPoint[]) => void
}

/** Dynamische Liste der Masse-/Momentpunkte, die das
 * Schwerpunktgrenzen-Polygon (CG-Envelope) aufspannen. Reihenfolge ist
 * die Polygon-Reihenfolge (siehe massBalance.ts::isWithinEnvelope). */
export function CgEnvelopeEditor({ points, onChange }: CgEnvelopeEditorProps) {
  const updatePoint = (index: number, patch: Partial<MassMomentPoint>) => {
    onChange(points.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }
  const removePoint = (index: number) => onChange(points.filter((_, i) => i !== index))
  const addPoint = () => onChange([...points, { mass: 0, moment: 0 }])

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        Schwerpunktgrenzen (Polygon aus Masse-/Momentpunkten, in Reihenfolge)
      </h4>
      <div className="flex flex-col gap-1.5">
        {points.map((point, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="mono-num w-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              {index + 1}
            </span>
            <input
              type="number"
              aria-label={`Masse Punkt ${index + 1} (kg)`}
              value={point.mass}
              onChange={(e) => updatePoint(index, { mass: Number(e.target.value) })}
              placeholder="Masse (kg)"
              className="mono-num w-24 rounded border px-1.5 py-1 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
            <input
              type="number"
              aria-label={`Moment Punkt ${index + 1}`}
              value={point.moment}
              onChange={(e) => updatePoint(index, { moment: Number(e.target.value) })}
              placeholder="Moment"
              className="mono-num w-24 rounded border px-1.5 py-1 text-sm"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
            <button
              type="button"
              onClick={() => removePoint(index)}
              aria-label={`Punkt ${index + 1} löschen`}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPoint}
        className="self-start rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        + Punkt
      </button>
    </div>
  )
}
