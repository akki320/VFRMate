import { useAircraftStore } from '../../store/aircraftStore'
import { useFlightStore } from '../../store/flightStore'
import { formatUtcMinutes } from '../../domain/format'
import { Accordion } from '../components/Accordion'
import { WarningBanner } from '../components/WarningBanner'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { useFlightExecutionViewModel } from './useFlightExecutionViewModel'
import { LegTable } from './LegTable'
import { RemainingHud } from './RemainingHud'
import { FrequenciesPanel } from '../panels/FrequenciesPanel'
import { WeatherPanel } from '../panels/WeatherPanel'
import { FuelPanel } from '../panels/FuelPanel'
import { MassBalancePanel } from '../panels/MassBalancePanel'
import { RunwayPanel } from '../panels/RunwayPanel'
import { AerodromeNotesPanel } from '../panels/AerodromeNotesPanel'

interface FlightExecutionScreenProps {
  onOpenPlanning: () => void
}

export function FlightExecutionScreen({ onOpenPlanning }: FlightExecutionScreenProps) {
  const viewModel = useFlightExecutionViewModel()
  const closeCurrent = useFlightStore((s) => s.closeCurrent)
  const aircraft = useAircraftStore((s) =>
    viewModel ? s.aircraft.find((a) => a.id === viewModel.flight.aircraftId) : undefined,
  )

  if (!viewModel) return null
  const { flight, rows, activeIndex } = viewModel

  const warnings: string[] = []
  if (viewModel.exceedsSafeEndurance) {
    warnings.push(
      `Restflugzeit (${viewModel.remainingTimeMinEstimated} min) überschreitet die sichere Flugzeit (${viewModel.safeEnduranceMin} min).`,
    )
  }
  if (viewModel.arrivesAfterSunset && viewModel.estimatedArrivalUtcMin !== undefined) {
    warnings.push(
      `Geschätzte Ankunft ${formatUtcMinutes(viewModel.estimatedArrivalUtcMin)} liegt nach Sonnenuntergang (${formatUtcMinutes(flight.sunsetUtcMin!)}).`,
    )
  }
  if (viewModel.fuelInsufficient) {
    warnings.push('Kraftstoffvorrat unterschreitet den Mindestbedarf.')
  }

  return (
    <div className="flex min-h-screen flex-col pb-24">
      <header className="flex items-center justify-between gap-3 border-b px-3 py-2 sm:px-4" style={{ borderColor: 'var(--border)' }}>
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {flight.name || `${flight.departureAerodrome} → ${flight.destinationAerodrome}`}
          </h1>
          <p className="mono-num text-xs" style={{ color: 'var(--text-secondary)' }}>
            {flight.departureAerodrome} → {flight.destinationAerodrome}
            {flight.alternateAerodrome ? ` (Ausw. ${flight.alternateAerodrome})` : ''} · {flight.date}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggleButton />
          <button
            type="button"
            onClick={onOpenPlanning}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Planung
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

      <WarningBanner messages={warnings} />

      {activeIndex === -1 && rows.length > 0 && (
        <p
          className="mx-3 mt-3 rounded border px-4 py-2 text-sm sm:mx-4"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Alle Kontrollpunkte überflogen — Flug beendet.
        </p>
      )}

      <section className="mt-3">
        <LegTable flight={flight} rows={rows} />
      </section>

      <section className="mt-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <Accordion title="Frequenzen">
          <FrequenciesPanel flight={flight} />
        </Accordion>
        <Accordion title="Wetter / Freigaben">
          <WeatherPanel flight={flight} />
        </Accordion>
        <Accordion title="Kraftstoff">
          <FuelPanel flight={flight} aircraft={aircraft} />
        </Accordion>
        <Accordion title="Masse & Schwerpunkt">
          <MassBalancePanel flight={flight} aircraft={aircraft} />
        </Accordion>
        <Accordion title="Start-/Landestrecke">
          <RunwayPanel flight={flight} aircraft={aircraft} />
        </Accordion>
        <Accordion title="Flugplatzdaten (AIP)">
          <AerodromeNotesPanel flight={flight} />
        </Accordion>
      </section>

      <RemainingHud
        remainingTimeMin={viewModel.remainingTimeMinEstimated}
        remainingDistanceNm={viewModel.remainingDistanceNm}
        flightComplete={activeIndex === -1}
      />
    </div>
  )
}
