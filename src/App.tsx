import { useEffect } from 'react'
import { ThemeProvider } from './ui/theme/ThemeContext'
import { useAircraftStore } from './store/aircraftStore'
import { useFlightStore } from './store/flightStore'
import { NoFlightScreen } from './ui/NoFlightScreen'
import { FlightExecutionScreen } from './ui/flight-execution/FlightExecutionScreen'

function AppShell() {
  const loadAircraft = useAircraftStore((s) => s.loadAll)
  const loadFlights = useFlightStore((s) => s.loadAll)
  const isLoaded = useFlightStore((s) => s.isLoaded)
  const currentFlight = useFlightStore((s) => s.currentFlight)

  useEffect(() => {
    void loadAircraft()
    void loadFlights()
  }, [loadAircraft, loadFlights])

  if (!isLoaded) return null
  return currentFlight ? <FlightExecutionScreen /> : <NoFlightScreen />
}

function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  )
}

export default App
