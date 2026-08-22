import { useState } from 'react'
import { useFlightStore } from '../store/flightStore'
import { ThemeToggleButton } from './components/ThemeToggleButton'
import { createDemoFlight } from './seed/createDemoFlight'

/**
 * Platzhalter, solange es noch kein Bildschirm 2 (Planung) gibt: Liste
 * gespeicherter Flüge zum Öffnen, plus ein Demo-Flug zum Ausprobieren von
 * Bildschirm 1. Wird in der nächsten Phase durch die echte Planungsansicht
 * ersetzt.
 */
export function NoFlightScreen() {
  const flights = useFlightStore((s) => s.flights)
  const open = useFlightStore((s) => s.open)
  const [creating, setCreating] = useState(false)

  const handleCreateDemo = async () => {
    setCreating(true)
    try {
      await createDemoFlight()
    } finally {
      setCreating(false)
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
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Die Planungsansicht (Bildschirm 2) folgt in der nächsten Phase. Bis dahin: ein
          Beispielflug zum Ausprobieren von Bildschirm 1.
        </p>
        <button
          type="button"
          onClick={() => void handleCreateDemo()}
          disabled={creating}
          className="rounded-lg px-4 py-3 font-semibold"
          style={{ minHeight: 56, backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
        >
          {creating ? 'Wird angelegt …' : 'Beispielflug anlegen'}
        </button>
      </div>
    </div>
  )
}
