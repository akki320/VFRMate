import { useAircraftStore } from '../../store/aircraftStore'
import { useFlightStore } from '../../store/flightStore'
import { Accordion } from '../components/Accordion'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { FrequenciesPanel } from '../panels/FrequenciesPanel'
import { WeatherPanel } from '../panels/WeatherPanel'
import { FuelPanel } from '../panels/FuelPanel'
import { MassBalancePanel } from '../panels/MassBalancePanel'
import { RunwayPanel } from '../panels/RunwayPanel'
import { AerodromeNotesPanel } from '../panels/AerodromeNotesPanel'
import { FlightMetaForm } from './FlightMetaForm'
import { GlobalDefaultsForm } from './GlobalDefaultsForm'
import { LegList } from './LegList'
import { AircraftManager } from './AircraftManager'

interface PlanningScreenProps {
  onOpenExecution: () => void
}

/**
 * Bildschirm 2: Planung. Alle Formularabschnitte des
 * Flugdurchführungsplans offen und nebeneinander statt hinter
 * Accordions versteckt (das ist Bildschirm 1 vorbehalten) — hier wird am
 * Schreibtisch geplant, nicht im Flug bedient.
 */
export function PlanningScreen({ onOpenExecution }: PlanningScreenProps) {
  const flight = useFlightStore((s) => s.currentFlight)
  const closeCurrent = useFlightStore((s) => s.closeCurrent)
  const duplicateAsTemplate = useFlightStore((s) => s.duplicateAsTemplate)
  const removeFlight = useFlightStore((s) => s.remove)
  const aircraft = useAircraftStore((s) => (flight ? s.aircraft.find((a) => a.id === flight.aircraftId) : undefined))

  if (!flight) return null

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-3 pb-16 sm:px-4">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b py-3" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Planung — {flight.name || 'Neuer Flug'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={onOpenExecution}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Flugdurchführung
          </button>
          <button
            type="button"
            onClick={() => void duplicateAsTemplate(flight.id)}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Als Vorlage duplizieren
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Flug "${flight.name}" wirklich löschen?`)) void removeFlight(flight.id)
            }}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--signal-warning-border)', color: 'var(--signal-warning-text)' }}
          >
            Flug löschen
          </button>
          <button
            type="button"
            onClick={closeCurrent}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Flugliste
          </button>
        </div>
      </header>

      <Section title="Flug">
        <FlightMetaForm flight={flight} />
      </Section>

      <Section title="Globale Standardwerte (Wind, TAS, VAR)">
        <GlobalDefaultsForm flight={flight} />
      </Section>

      <Section title="Legs">
        <LegList flight={flight} />
      </Section>

      <Section title="Kraftstoff">
        <FuelPanel flight={flight} aircraft={aircraft} />
      </Section>

      <Section title="Masse & Schwerpunkt">
        <MassBalancePanel flight={flight} aircraft={aircraft} />
      </Section>

      <Section title="Start-/Landestrecke">
        <RunwayPanel flight={flight} aircraft={aircraft} />
      </Section>

      <div className="rounded border" style={{ borderColor: 'var(--border)' }}>
        <Accordion title="Frequenzen">
          <FrequenciesPanel flight={flight} />
        </Accordion>
        <Accordion title="Wetter / Freigaben">
          <WeatherPanel flight={flight} />
        </Accordion>
        <Accordion title="Flugplatzdaten (AIP)">
          <AerodromeNotesPanel flight={flight} />
        </Accordion>
        <Accordion title="Flugzeugmuster verwalten">
          <AircraftManager />
        </Accordion>
      </div>

      <footer
        className="mt-4 border-t pt-4 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        Die App ist ein Hilfsmittel für die Planung und ersetzt weder die vorgeschriebene
        Flugvorbereitung noch amtliche Unterlagen. Alle Werte sind vom Piloten zu prüfen.
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}
