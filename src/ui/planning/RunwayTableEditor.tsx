import type { RunwayTableRow } from '../../domain/types'

interface RunwayTableEditorProps {
  label: string
  rows: RunwayTableRow[]
  onChange: (rows: RunwayTableRow[]) => void
}

const EMPTY_ROW: RunwayTableRow = {
  pressureAltitudeFt: 0,
  temperatureC: 0,
  groundRunM: 0,
  distanceOver15mM: 0,
}

/** Dynamische Zeilenliste für eine Start-/Landestreckentabelle aus der
 * POH (Druckhöhe × Temperatur → Grundstrecke / Strecke über 15 m). */
export function RunwayTableEditor({ label, rows, onChange }: RunwayTableEditorProps) {
  const updateRow = (index: number, patch: Partial<RunwayTableRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  const removeRow = (index: number) => onChange(rows.filter((_, i) => i !== index))
  const addRow = () => onChange([...rows, EMPTY_ROW])

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </h4>
      <div className="overflow-x-auto">
        <table className="mono-num w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr style={{ color: 'var(--text-secondary)' }}>
              <th className="px-1 py-1 text-left font-medium">Druckhöhe (ft)</th>
              <th className="px-1 py-1 text-left font-medium">Temp. (°C)</th>
              <th className="px-1 py-1 text-left font-medium">Grundstrecke (m)</th>
              <th className="px-1 py-1 text-left font-medium">Über 15 m (m)</th>
              <th className="px-1 py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="px-1 py-1">
                  <RowInput value={row.pressureAltitudeFt} onChange={(v) => updateRow(index, { pressureAltitudeFt: v })} />
                </td>
                <td className="px-1 py-1">
                  <RowInput value={row.temperatureC} onChange={(v) => updateRow(index, { temperatureC: v })} />
                </td>
                <td className="px-1 py-1">
                  <RowInput value={row.groundRunM} onChange={(v) => updateRow(index, { groundRunM: v })} />
                </td>
                <td className="px-1 py-1">
                  <RowInput value={row.distanceOver15mM} onChange={(v) => updateRow(index, { distanceOver15mM: v })} />
                </td>
                <td className="px-1 py-1">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label="Zeile löschen"
                    className="rounded border px-2 py-1"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="self-start rounded border px-2 py-1 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        + Zeile
      </button>
    </div>
  )
}

function RowInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mono-num w-20 rounded border px-1.5 py-1"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
    />
  )
}
