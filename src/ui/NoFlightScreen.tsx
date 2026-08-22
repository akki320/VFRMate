import { useState } from 'react'
import { useFlightStore } from '../store/flightStore'
import { Accordion } from './components/Accordion'
import { ThemeToggleButton } from './components/ThemeToggleButton'
import { AircraftManager } from './planning/AircraftManager'
import { createDemoFlight } from './seed/createDemoFlight'

/** Flugliste + Einstieg in einen neuen Flug. Flugzeugmuster sind hier
 * ebenfalls erreichbar, weil sie unabhängig vom einzelnen Flug gespeichert
 * sind — man kann ein Muster anlegen, bevor der erste Flug existiert. */
export function NoFlightScreen() {
  const flights = useFlightStore((s) => s.flights)
  const open = useFlightStore((s) => s.open)
  const createNew = useFlightStore((s) => s.createNew)
  const [creatingDemo, setCreatingDemo] = useState(false)

  const handleCreateNew = () => {
    void createNew({
      name: 'Neuer Flug',
      date: new Date().toISOString().slice(0, 10),
      departureAerodrome: '',
      destinationAerodrome: '',
      etdUtcMin: 0,
      transitionAltitudeFt: 5000,
      transitionLevel: '',
      aircraftId: '',
      globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 },
    })
  }

  const handleCreateDemo = async () => {
    setCreatingDemo(true)
    try {
      await createDemoFlight()
    } finally {
      setCreatingDemo(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          VFRMate
        </h1>
        <ThemeToggleButton />
      </div>

      {flights.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Gespeicherte Flüge
          </h2>
          {flights.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => open(f.id)}
              className="rounded border px-4 py-3 text-left"
              style={{ borderColor: 'var(--border)', minHeight: 56, color: 'var(--text-primary)' }}
            >
              <div className="font-medium">{f.name}</div>
              <div className="mono-num text-xs" style={{ color: 'var(--text-secondary)' }}>
                {f.departureAerodrome} → {f.destinationAerodrome} · {f.date}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={handleCreateNew}
          className="rounded-lg px-4 py-3 font-semibold"
          style={{ minHeight: 56, backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
        >
          Neuen Flug anlegen
        </button>
        <button
          type="button"
          onClick={() => void handleCreateDemo()}
          disabled={creatingDemo}
          className="rounded border px-4 py-2 text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {creatingDemo ? 'Wird angelegt …' : 'Beispielflug zum Ausprobieren anlegen'}
        </button>
      </div>

      <div className="rounded border" style={{ borderColor: 'var(--border)' }}>
        <Accordion title="Flugzeugmuster verwalten">
          <AircraftManager />
        </Accordion>
      </div>
    </div>
  )
}
