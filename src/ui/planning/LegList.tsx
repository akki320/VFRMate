import { useRef } from 'react'
import type { Flight } from '../../domain/types'
import { resolveLeg } from '../../domain/navigation'
import { useFlightStore } from '../../store/flightStore'
import { LegEditorRow } from './LegEditorRow'

/**
 * Leg-Verwaltung: anlegen, umbenennen, per Drag & Drop umsortieren,
 * löschen. Reordering geht sowohl per Drag (Zeigegeräte) als auch per
 * Auf/Ab-Buttons (Tastatur) — natives HTML5-Drag-and-Drop ist für sich
 * genommen nicht tastaturbedienbar.
 */
export function LegList({ flight }: { flight: Flight }) {
  const addLeg = useFlightStore((s) => s.addLeg)
  const reorderLegs = useFlightStore((s) => s.reorderLegs)
  const dragIndexRef = useRef<number | undefined>(undefined)

  const move = (from: number, to: number) => {
    if (to < 0 || to >= flight.legs.length || from === to) return
    const ids = flight.legs.map((l) => l.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(to, 0, moved)
    void reorderLegs(ids)
  }

  const handleDrop = (targetIndex: number) => {
    const from = dragIndexRef.current
    dragIndexRef.current = undefined
    if (from === undefined) return
    move(from, targetIndex)
  }

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-2">
        {flight.legs.map((leg, index) => {
          const resolved = resolveLeg(flight, leg)
          const previousPointCoordinates = index === 0 ? flight.departureCoordinates : flight.legs[index - 1].coordinates
          return (
            <LegEditorRow
              key={leg.id}
              leg={leg}
              index={index}
              total={flight.legs.length}
              previousPointCoordinates={previousPointCoordinates}
              isDeviatingFromGlobal={{
                tas: resolved.tasKtIsOverridden,
                wind: resolved.windIsOverridden,
                variation: resolved.variationDegIsOverridden,
              }}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onDragStart={() => {
                dragIndexRef.current = index
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
            />
          )
        })}
      </ol>
      {flight.legs.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Noch keine Legs angelegt.
        </p>
      )}
      <button
        type="button"
        onClick={() =>
          void addLeg({
            waypoint: 'Neuer Kontrollpunkt',
            plannedAltitude: '',
            tc: 0,
            distanceNm: 0,
          })
        }
        className="self-start rounded-lg px-4 py-2 text-sm font-semibold"
        style={{ backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
      >
        + Leg hinzufügen
      </button>
    </div>
  )
}
