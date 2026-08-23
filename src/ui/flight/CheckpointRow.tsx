import { useFlightStore } from '../../store/flightStore'
import { clockMinuteOnly, formatDeltaMinutes, formatUtcMinutes } from '../../domain/format'
import type { LegEto } from '../../domain/flightPlan'
import { AtoCell } from './AtoCell'
import { ACTIVE_LIGHT_STYLE, activeStrongStyle, inputClass, ReadOnly, TextCell } from './cells'

interface CheckpointRowProps {
  /** undefined = Startflugplatz-Zeile (nicht editierbar hier, siehe
   * FlightHeader.tsx) statt eine echte Leg-Kontrollpunkt-Zeile. */
  legId?: string
  waypoint: string
  /** Wie viele Spalten (Kontrollpunkt plus restliche Streckendaten-Spalten
   * außer ETO) der Namens-Banner überspannen soll — muss mit der
   * Spaltenzahl der Streckendaten-Zeilen übereinstimmen (siehe
   * LegTable.tsx). ETO und ATO liegen dahinter als eigene, echte Zellen. */
  bannerSpanColumns: number
  /** Ist die ETO-Spalte gerade überhaupt eingeblendet (Spaltenauswahl)? */
  etoVisible: boolean
  /** undefined bei der Startflugplatz-Zeile (kein eigenes Leg, also keine
   * ETO). */
  eto?: LegEto
  ato: number | undefined
  anchorUtcMinutes: number
  /** Diese Kontrollpunkt-Zeile trägt gerade ETO/ATO/"Überflug" des aktiven
   * Legs — starke Hervorhebung plus sticky (siehe cells.tsx::activeStrongStyle). */
  isActiveTarget: boolean
  /** Diese Kontrollpunkt-Zeile ist der Startpunkt des aktiven Legs — nur
   * die leichte Randmarkierung, nicht fixiert. */
  isActiveOrigin: boolean
  headerOffsetPx: number
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
}

/**
 * Eine Kontrollpunkt-Zeile: Name (plus bei einem echten Leg die
 * Verschieben-/Löschen-Knöpfe) UND — seit Phase 18 — ETO/ATO für genau
 * diesen Punkt. Steht im Papierformular an der Grenze zweier Zeilen mit
 * Streckendaten (Sicherh.-Höhe … Zeit Rest) — hier nachgebildet, indem
 * CheckpointRow und LegTableRow sich in LegTable.tsx abwechseln:
 * Kontrollpunkt, Streckendaten (dieses Legs), nächster Kontrollpunkt,
 * Streckendaten (nächstes Leg), usw.
 *
 * ETO/ATO saßen bis Phase 17 auf der Streckendaten-Zeile davor (dem Leg,
 * das zu diesem Punkt führt). Auf Nutzerwunsch stehen sie jetzt auf dem
 * Kontrollpunkt selbst — fachlich korrekter (ETO/ATO sind die Über-
 * flugzeit *dieses* Punktes, nicht der Strecke davor) und näher am
 * Papierformular, wo Überflugzeit und ATO ebenfalls neben dem
 * Kontrollpunkt-Feld stehen. Damit trotzdem eindeutig bleibt, zu welchem
 * Kontrollpunkt ETO/ATO gehören, auch wenn der Name links (in der
 * Kontrollpunkt-Spalte) beim horizontalen Scrollen schon aus dem
 * Sichtbereich gelaufen ist, wird der Name direkt hinter ATO noch einmal
 * gespiegelt (schreibgeschützt) — eine eigene, immer sichtbare Spalte
 * zwischen ATO und Bemerkungen.
 *
 * Der Startflugplatz hat kein eigenes Leg und deshalb weder Verschieben-/
 * Löschen-Knöpfe noch ETO/ATO — der Name kommt stattdessen nur lesend aus
 * dem Flugkopf (siehe FlightHeader.tsx, dort editierbar).
 *
 * Sticky/Hervorhebung: die Kontrollpunkt-Zeile, die gerade ETO/ATO/
 * "Überflug" des aktiven Legs trägt (isActiveTarget), bleibt beim
 * Scrollen oben fixiert — sie hat den Handlungsbedarf (Tap auf
 * "Überflug"). Der Startpunkt dieses Legs (isActiveOrigin) bekommt nur
 * die leichte Randmarkierung, damit das "von … nach …" optisch erhalten
 * bleibt, ohne selbst zu fixieren.
 */
export function CheckpointRow({
  legId,
  waypoint,
  bannerSpanColumns,
  etoVisible,
  eto,
  ato,
  anchorUtcMinutes,
  isActiveTarget,
  isActiveOrigin,
  headerOffsetPx,
  index,
  total,
  onMoveUp,
  onMoveDown,
}: CheckpointRowProps) {
  const updateLeg = useFlightStore((s) => s.updateLeg)
  const removeLeg = useFlightStore((s) => s.removeLeg)

  const rowStyle = isActiveTarget
    ? activeStrongStyle(headerOffsetPx)
    : isActiveOrigin
      ? ACTIVE_LIGHT_STYLE
      : { backgroundColor: 'transparent' }

  return (
    <tr className="transition-state border-b" style={{ ...rowStyle, borderColor: 'var(--border)' }}>
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

      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5" colSpan={bannerSpanColumns}>
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

      {etoVisible && (
        <td className="px-1 py-1 align-middle text-right sm:px-1.5 sm:py-1.5">
          {eto && (
            <ReadOnly title={`ETO ${formatUtcMinutes(anchorUtcMinutes + eto.revisedEtoMin)}`}>
              {clockMinuteOnly(anchorUtcMinutes, eto.revisedEtoMin)}
              {eto.deltaMin !== 0 && (
                <span
                  className="ml-1 text-xs"
                  style={{ color: eto.deltaMin > 0 ? 'var(--signal-delta-late)' : 'var(--signal-delta-early)' }}
                >
                  {formatDeltaMinutes(eto.deltaMin)}
                </span>
              )}
            </ReadOnly>
          )}
        </td>
      )}

      <td className="px-1 py-1 align-middle text-right sm:px-1.5 sm:py-1.5">
        {legId !== undefined && <AtoCell legId={legId} ato={ato} isActive={isActiveTarget} anchorUtcMinutes={anchorUtcMinutes} />}
      </td>

      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5">
        <span className="mono-num text-xs whitespace-nowrap sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          {waypoint || '–'}
        </span>
      </td>

      <td className="px-1 py-1 align-middle sm:px-1.5 sm:py-1.5" />
    </tr>
  )
}
