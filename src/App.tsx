import { useEffect } from 'react'
import { ThemeProvider } from './ui/theme/ThemeContext'
import { useFlightStore } from './store/flightStore'
import { NoFlightScreen } from './ui/NoFlightScreen'
import { FlightScreen } from './ui/flight/FlightScreen'
import { PrintView } from './ui/print/PrintView'

function AppShell() {
  const loadFlights = useFlightStore((s) => s.loadAll)
  const isLoaded = useFlightStore((s) => s.isLoaded)
  const currentFlight = useFlightStore((s) => s.currentFlight)

  useEffect(() => {
    void loadFlights()
  }, [loadFlights])

  if (!isLoaded) return null

  return (
    <>
      {/* Auf dem Bildschirm sichtbarer App-Chrome — wird beim Drucken
          komplett ausgeblendet (siehe .no-print in index.css). */}
      <div className="no-print">{!currentFlight ? <NoFlightScreen /> : <FlightScreen />}</div>
      {/* Nur im Druck sichtbar (siehe .print-only in index.css). */}
      <PrintView flight={currentFlight} />
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
