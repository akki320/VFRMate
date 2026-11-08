// @vitest-environment happy-dom
//
// Einziger Test in diesem Projekt, der eine DOM-Umgebung braucht
// (gpxImport.ts nutzt `DOMParser`, global per `vite.config.ts` auf
// `environment: 'node'` gestellt) — deshalb die Pro-Datei-Umgebung statt
// das ganze Projekt auf jsdom/happy-dom umzustellen.
import { describe, expect, it } from 'vitest'
import { parseGpxRouteImport } from './gpxImport'
import { ImportValidationError } from './exportImport'

const SKYDEMON_LIKE_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="SkyDemon" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <name>EDXA-EDXB</name>
    <rtept lat="50.7000" lon="7.1000">
      <name>EDXA</name>
    </rtept>
    <rtept lat="50.9000" lon="7.3000">
      <name>Kirchturm Musterdorf</name>
    </rtept>
    <rtept lat="51.1000" lon="7.6000">
      <name>EDXB</name>
    </rtept>
  </rte>
</gpx>`

describe('parseGpxRouteImport', () => {
  it('builds a flight from a route with one departure and two further points', () => {
    const flight = parseGpxRouteImport(SKYDEMON_LIKE_GPX, '2026-11-08')

    expect(flight.date).toBe('2026-11-08')
    expect(flight.departureAerodrome).toBe('EDXA')
    expect(flight.destinationAerodrome).toBe('EDXB')
    expect(flight.departureCoordinates).toEqual({ lat: 50.7, lon: 7.1 })
    expect(flight.legs).toHaveLength(2)
    expect(flight.legs[0].waypoint).toBe('Kirchturm Musterdorf')
    expect(flight.legs[1].waypoint).toBe('EDXB')
    expect(flight.legActuals).toEqual([])
  })

  it('derives TC and distance for each leg via great-circle calculation, not left at 0', () => {
    const flight = parseGpxRouteImport(SKYDEMON_LIKE_GPX, '2026-11-08')

    for (const leg of flight.legs) {
      expect(leg.distanceNm).toBeGreaterThan(0)
      expect(leg.tc).toBeGreaterThanOrEqual(0)
      expect(leg.tc).toBeLessThan(360)
    }
    // Die Strecke verläuft durchgehend nach Nordost (lat und lon steigen
    // von Punkt zu Punkt) — TC muss also im Nordost-Quadranten liegen.
    expect(flight.legs[0].tc).toBeGreaterThan(0)
    expect(flight.legs[0].tc).toBeLessThan(90)
  })

  it('gives each leg a unique id and assigns no flight id (caller/importFlight does that)', () => {
    const flight = parseGpxRouteImport(SKYDEMON_LIKE_GPX, '2026-11-08')
    expect(flight).not.toHaveProperty('id')
    const ids = flight.legs.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back to a track (<trk>/<trkseg>/<trkpt>) when there is no <rte>', () => {
    const trackGpx = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <trkseg>
      <trkpt lat="50.0" lon="7.0"><name>A</name></trkpt>
      <trkpt lat="50.2" lon="7.2"><name>B</name></trkpt>
    </trkseg>
  </trk>
</gpx>`
    const flight = parseGpxRouteImport(trackGpx, '2026-11-08')
    expect(flight.departureAerodrome).toBe('A')
    expect(flight.destinationAerodrome).toBe('B')
    expect(flight.legs).toHaveLength(1)
  })

  it('falls back to a bare <wpt> list when there is neither <rte> nor <trk>', () => {
    const wptGpx = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <wpt lat="50.0" lon="7.0"><name>A</name></wpt>
  <wpt lat="50.2" lon="7.2"><name>B</name></wpt>
</gpx>`
    const flight = parseGpxRouteImport(wptGpx, '2026-11-08')
    expect(flight.departureAerodrome).toBe('A')
    expect(flight.destinationAerodrome).toBe('B')
  })

  it('falls back to a generated "WP<n>" label when a point has no <name>', () => {
    const noNameGpx = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <rtept lat="50.0" lon="7.0" />
    <rtept lat="50.2" lon="7.2" />
  </rte>
</gpx>`
    const flight = parseGpxRouteImport(noNameGpx, '2026-11-08')
    expect(flight.departureAerodrome).toBe('WP1')
    expect(flight.legs[0].waypoint).toBe('WP2')
  })

  it('rejects malformed XML', () => {
    expect(() => parseGpxRouteImport('<rte><rtept', '2026-11-08')).toThrow(ImportValidationError)
  })

  it('rejects a GPX file with fewer than two points', () => {
    const singlePointGpx = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <rte><rtept lat="50.0" lon="7.0"><name>A</name></rtept></rte>
</gpx>`
    expect(() => parseGpxRouteImport(singlePointGpx, '2026-11-08')).toThrow(/zu wenige Punkte/)
  })

  it('rejects a GPX file with no points at all', () => {
    const empty = `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"></gpx>`
    expect(() => parseGpxRouteImport(empty, '2026-11-08')).toThrow(ImportValidationError)
  })

  it('applies the same sensible defaults as a freshly created flight for fields GPX has no data for', () => {
    const flight = parseGpxRouteImport(SKYDEMON_LIKE_GPX, '2026-11-08')
    expect(flight.etdUtcMin).toBe(0)
    expect(flight.transitionAltitudeFt).toBe(5000)
    expect(flight.transitionLevel).toBe('')
    expect(flight.globalDefaults).toEqual({ tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 })
  })
})
