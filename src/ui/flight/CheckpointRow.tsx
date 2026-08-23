import { useFlightStore } from '../../store/flightStore'
import { inputClass, TextCell } from './cells'

interface CheckpointRowProps {
  /** undefined = Startflugplatz-Zeile (nicht editierbar hier, siehe
   * FlightHeader.tsx) statt eine echte Leg-Kontrollpunkt-Zeile. */
  legId?: string
  waypoint: string
  /** Wie viele Spalten (Kontrollpunkt bis inkl. ATO) der Namens-Banner
   * überspannen soll — muss mit der Spaltenzahl der Streckendaten-Zeilen
   * übereinstimmen (siehe LegTable.tsx). */
  spanColumns: number
  /** Grenzt diese Kontrollpunkt-Zeile an die gerade aktive Streckendaten-
   * Zeile an (davor oder danach) — leichte Hervorhebung, damit sich beide
   * Kontrollpunkte optisch als "von … nach …" der aktiven Zeile zuordnen
   * lassen. */
  highlighted: boolean
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
}

/**
 * Eine Kontrollpunkt-Zeile: nur der Name (plus bei einem echten Leg die
 * Verschieben-/Löschen-Knöpfe), keine Streckendaten. Steht im Papierformular
 * an der Grenze zweier Zeilen mit Streckendaten (Sicherh.-Höhe … ATO) — hier
 * nachgebildet, indem CheckpointRow und LegTableRow sich in LegTable.tsx
 * abwechseln: Kontrollpunkt, Streckendaten (dieses Legs), nächster
 * Kontrollpunkt, Streckendaten (nächstes Leg), usw. Der erste Kontrollpunkt
 * (Startflugplatz) hat kein eigenes Leg und deshalb weder Verschieben- noch
 * Löschen-Knöpfe — der Name kommt stattdessen nur lesend aus dem Flugkopf
 * (siehe FlightHeader.tsx, dort editierbar).
 */
export function CheckpointRow({ legId, waypoint, spanColumns, highlighted, index, total, onMoveUp, onMoveDown }: CheckpointRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
  const removeLeg = useFlightStore((s) => s.removeLeg)

  const rowStyle: React.CSSProperties = highlighted
    ? { boxShadow: 'inset 4px 0 0 var(--signal-active-border)', backgroundColor: 'var(--bg-elevated)' }
    : { backgroundColor: 'transparent' }

  return (
    <tr className="border-b" style={{ ...rowStyle, borderColor: 'var(--border)' }}>
      <td className="px-0.5 py-1 align-middle sm:px-1 sm:py-1.5">
        {legId !== undefined && (
          <div className="flex items-center gap-0.5">
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
            <button
              type="button"
              onClick={() => {
                if (confirm(`Leg "${waypoint}" wirklich löschen?`)) void removeLeg(legId)
              }}
              aria-label={`Leg ${waypoint} löschen`}
              className="rounded border px-1.5 py-1 text-xs"
              style={{ borderColor: 'var(--signal-warning-border)', color: 'var(--signal-warning-text)' }}
            >
              ✕
            </button>
          </div>
        )}
      </td>

      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5" colSpan={spanColumns}>
        {legId !== undefined ? (
          <TextCell
            label="Kontrollpunkt"
            value={waypoint}
            onChange={(v) => void updateLeg(legId, { waypoint: v })}
            placeholder="Kontrollpunkt"
            className={`${inputClass} font-semibold`}
            widthCh={12}
          />
        ) : (
          <span
            className="mono-num text-xs font-semibold sm:text-sm"
            style={{ color: 'var(--text-primary)' }}
            title="Startflugplatz — bearbeitbar oben im Flugkopf"
          >
            {waypoint || '–'}
          </span>
        )}
      </td>

      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5" />
    </tr>
  )
}
