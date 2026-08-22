import { useEffect, useRef, useState } from 'react'
import { ThemeProvider } from './ui/theme/ThemeContext'
import { useAircraftStore } from './store/aircraftStore'
import { useFlightStore } from './store/flightStore'
import { NoFlightScreen } from './ui/NoFlightScreen'
import { FlightExecutionScreen } from './ui/flight-execution/FlightExecutionScreen'
import { PlanningScreen } from './ui/planning/PlanningScreen'
import { PrintView } from './ui/print/PrintView'

type Mode = 'planning' | 'execution'

function AppShell() {
  const loadAircraft = useAircraftStore((s) => s.loadAll)
  const loadFlights = useFlightStore((s) => s.loadAll)
  const isLoaded = useFlightStore((s) => s.isLoaded)
  const currentFlight = useFlightStore((s) => s.currentFlight)
  const aircraft = useAircraftStore((s) =>
    currentFlight ? s.aircraft.find((a) => a.id === currentFlight.aircraftId) : undefined,
  )

  const [mode, setMode] = useState<Mode>('planning')
  const lastFlightIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    void loadAircraft()
    void loadFlights()
  }, [loadAircraft, loadFlights])

  useEffect(() => {
    if (currentFlight && currentFlight.id !== lastFlightIdRef.current) {
      // Ein frisch geöffneter/angelegter Flug: mit Legs direkt in die
      // Flugdurchführung, ohne noch in die Planung — sonst in die Planung,
      // weil er offensichtlich noch nicht startklar ist.
      setMode(currentFlight.legs.length > 0 ? 'execution' : 'planning')
    }
    lastFlightIdRef.current = currentFlight?.id
  }, [currentFlight])

  if (!isLoaded) return null

  return (
    <>
      {/* Auf dem Bildschirm sichtbarer App-Chrome — wird beim Drucken
          komplett ausgeblendet (siehe .no-print in index.css). */}
      <div className="no-print">
        {!currentFlight ? (
          <NoFlightScreen />
        ) : mode === 'planning' ? (
          <PlanningScreen onOpenExecution={() => setMode('execution')} />
        ) : (
          <FlightExecutionScreen onOpenPlanning={() => setMode('planning')} />
        )}
      </div>
      {/* Nur im Druck sichtbar (siehe .print-only in index.css) — bleibt
          über den Mode-Wechsel hinweg an denselben Flug gebunden. */}
      <PrintView flight={currentFlight} aircraft={aircraft} />
    </>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}

export default App
