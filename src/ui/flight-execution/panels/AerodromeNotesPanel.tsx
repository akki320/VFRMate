import type { Flight } from '../../../domain/types'
import { useFlightStore } from '../../../store/flightStore'
import { TextAreaField } from '../../components/FormField'

/** Freiform-Notizen zu Flugplatzdaten aus dem AIP (Pistenlänge,
 * Platzrunde, Besonderheiten, Beschränkungen, ...). */
export function AerodromeNotesPanel({ flight }: { flight: Flight }) {
  const patchCurrentFlight = useFlightStore((s) => s.patchCurrentFlight)

  return (
    <TextAreaField
      id="aerodrome-notes"
      label="Flugplatzdaten aus dem AIP"
      value={flight.aerodromeNotes}
      onChange={(v) => void patchCurrentFlight({ aerodromeNotes: v })}
      rows={6}
    />
  )
}
