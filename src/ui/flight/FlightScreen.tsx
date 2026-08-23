import { useFlightStore } from '../../store/flightStore'
import { serializeFlight } from '../../store/exportImport'
import { downloadJsonFile, safeFileNamePart } from '../lib/fileIO'
import { formatUtcMinutes } from '../../domain/format'
import { WarningBanner } from '../components/WarningBanner'
import { ThemeToggleButton } from '../components/ThemeToggleButton'
import { FlightHeader } from './FlightHeader'
import { LegTable } from './LegTable'
import { RemainingHud } from './RemainingHud'
import { ColumnVisibilityMenu } from './ColumnVisibilityMenu'
import { useColumnVisibility } from './useColumnVisibility'
import { useFlightTableViewModel } from './useFlightTableViewModel'

/**
 * Die einzige Ansicht für einen geöffneten Flug: Kopfzeile + eine
 * durchgehend editierbare Tabelle, genau wie das Papierformular — Planung
 * und Flugdurchführung sind nicht mehr getrennt, es ist derselbe
 * Bildschirm vor und während des Flugs.
 */
export function FlightScreen() {
  const viewModel = useFlightTableViewModel()
  const closeCurrent = useFlightStore((s) => s.closeCurrent)
  const addLeg = useFlightStore((s) => s.addLeg)
  const removeFlight = useFlightStore((s) => s.remove)
  const resetProgress = useFlightStore((s) => s.resetProgress)
  const columns = useColumnVisibility()

  if (!viewModel) return null
  const { flight, rows, activeIndex } = viewModel
  const totalDistanceNm = rows.length > 0 ? rows[rows.length - 1].cumulativeDistanceNm : 0
  const hasProgress = flight.legActuals.length > 0 || flight.atdUtcMin !== undefined

  const warnings: string[] = []
  if (viewModel.arrivesAfterSunset && viewModel.estimatedArrivalUtcMin !== undefined) {
    warnings.push(
      `Geschätzte Ankunft ${formatUtcMinutes(viewModel.estimatedArrivalUtcMin)} liegt nach Sonnenuntergang (${formatUtcMinutes(flight.sunsetUtcMin!)}).`,
    )
  }

  return (
    <div className="flex min-h-screen flex-col px-2 pb-24 sm:px-4">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b py-2" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Flugdurchführungsplan VFR
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggleButton />
          <ColumnVisibilityMenu columns={columns} />
          <button
            type="button"
            onClick={() => downloadJsonFile(`vfrmate-flug-${safeFileNamePart(flight.name || flight.date)}.json`, serializeFlight(flight))}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Exportieren
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border px-3 py-1.5 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Drucken
          </button>
          <button
            type="button"
            disabled={!hasProgress}
            onClick={() => {
              if (confirm('Flug zurücksetzen? Alle ATOs und die ATD werden gelöscht, die Planung bleibt erhalten.')) {
                void resetProgress()
              }
            }}
            className="rounded border px-3 py-1.5 text-xs disabled:opacity-30"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Flug zurücksetzen
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

      <FlightHeader flight={flight} estimatedArrivalUtcMin={viewModel.estimatedArrivalUtcMin} />

      <WarningBanner messages={warnings} />

      {activeIndex === -1 && rows.length > 0 && (
        <p className="mt-3 rounded border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          Alle Kontrollpunkte überflogen — Flug beendet.
        </p>
      )}

      <section className="mt-3">
        {rows.length > 0 && (
          <p className="mono-num mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Gesamtstrecke: <span style={{ color: 'var(--text-primary)' }}>{totalDistanceNm.toFixed(1)} NM</span>
          </p>
        )}
        <LegTable rows={rows} visibleColumns={columns.visible} />
        <button
          type="button"
          onClick={() => void addLeg({ waypoint: 'Neuer Kontrollpunkt', plannedAltitude: '', tc: 0, distanceNm: 0 })}
          className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
        >
          + Leg hinzufügen
        </button>
      </section>

      <footer className="mt-6 border-t pt-3 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        Die App ist ein Hilfsmittel für die Planung und ersetzt weder die vorgeschriebene
        Flugvorbereitung noch amtliche Unterlagen. Alle Werte sind vom Piloten zu prüfen.
      </footer>

      <RemainingHud
        remainingTimeMin={viewModel.remainingTimeMinEstimated}
        remainingDistanceNm={viewModel.remainingDistanceNm}
        flightComplete={activeIndex === -1}
      />
    </div>
  )
}
