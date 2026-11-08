/**
 * Import einer GPX-Routendatei (z. B. aus SkyDemon exportiert — "Route
 * teilen"/"Export" bietet dort GPX neben Garmin-eigenen Formaten wie FPL/
 * GFP) als neuer Flug. Anders als exportImport.ts (eigenes JSON-Format)
 * liest dieses Modul ein fremdes, offen dokumentiertes XML-Format (GPX
 * 1.1, siehe topografix.com/GPX/1/1) — das am weitesten verbreitete
 * Austauschformat zwischen Flugplanungs-Apps (SkyDemon, ForeFlight,
 * Garmin Pilot, SkyVector, ...), anders als SkyDemons proprietäre/Garmin-
 * spezifische Formate (FPL, GFP), die dieses Modul bewusst nicht
 * unterstützt.
 *
 * Liest die Punktliste aus der ersten <rte> (Route, der Normalfall für
 * einen exportierten Flugplan), fällt auf <trk>/<trkseg> zurück, sonst auf
 * eine reine <wpt>-Liste. Der erste Punkt wird zum Startflugplatz, jeder
 * weitere zu einem Leg — TC und Distanz werden aus den Koordinaten per
 * Großkreisrechnung abgeleitet (siehe domain/greatCircle.ts), exakt der
 * Zweck, für den Leg.coordinates/Flight.departureCoordinates im
 * Domain-Modell bereits vorgesehen sind (siehe domain/types.ts) — bislang
 * nur nie an eine Datenquelle angebunden.
 *
 * Nutzt `DOMParser`, deshalb nur im Browser aufrufbar (kein DOM in
 * Node/Vitest ohne Weiteres) — die Tests laufen deshalb mit
 * `// @vitest-environment happy-dom` (siehe gpxImport.test.ts).
 */
import { greatCircleBearingAndDistance, type Coordinates } from '../domain/greatCircle'
import type { Flight, Leg } from '../domain/types'
import { ImportValidationError } from './exportImport'
import { generateId } from './id'

interface GpxPoint {
  name: string
  coordinates: Coordinates
}

function parseGpxDocument(xmlText: string): Document {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new ImportValidationError('Datei ist kein gültiges GPX/XML.')
  }
  return doc
}

function readPoint(el: Element, fallbackName: string): GpxPoint | undefined {
  const lat = Number(el.getAttribute('lat'))
  const lon = Number(el.getAttribute('lon'))
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined
  const name = el.getElementsByTagName('name')[0]?.textContent?.trim() || fallbackName
  return { name, coordinates: { lat, lon } }
}

/** Erste <rte> bevorzugt (der Normalfall für eine exportierte Route),
 * sonst die erste <trkseg>, sonst alle <wpt> auf oberster Ebene. */
function extractPoints(doc: Document): GpxPoint[] {
  const source =
    doc.getElementsByTagName('rtept').length > 0
      ? doc.getElementsByTagName('rtept')
      : doc.getElementsByTagName('trkpt').length > 0
        ? doc.getElementsByTagName('trkpt')
        : doc.getElementsByTagName('wpt')

  const points: GpxPoint[] = []
  for (let i = 0; i < source.length; i++) {
    const point = readPoint(source[i], `WP${i + 1}`)
    if (point) points.push(point)
  }
  return points
}

/**
 * Parst eine GPX-Datei zu einem importfertigen Flug (ohne id — wie bei
 * parseFlightImport vergibt der Aufrufer/importFlight eine neue). Felder,
 * die GPX nicht liefert (Datum, ETD, Übergangshöhe, globale
 * Standardwerte, ...), bekommen dieselben Vorgaben wie ein neu angelegter
 * Flug (siehe NoFlightScreen.tsx::handleCreateNew) — der Pilot ergänzt
 * sie im Flugkopf wie bei jedem neuen Flug.
 */
export function parseGpxRouteImport(
  xmlText: string,
  today: string = new Date().toISOString().slice(0, 10),
): Omit<Flight, 'id'> {
  const doc = parseGpxDocument(xmlText)
  const points = extractPoints(doc)

  if (points.length < 2) {
    throw new ImportValidationError('GPX-Datei enthält zu wenige Punkte (mindestens Start- und ein Zielpunkt nötig).')
  }

  const [departure, ...rest] = points
  const legs: Leg[] = []
  let previous = departure
  for (const point of rest) {
    const { tc, distanceNm } = greatCircleBearingAndDistance(previous.coordinates, point.coordinates)
    legs.push({
      id: generateId(),
      waypoint: point.name,
      coordinates: point.coordinates,
      plannedAltitude: '',
      tc,
      distanceNm,
    })
    previous = point
  }

  const destination = points[points.length - 1]

  return {
    name: `${departure.name} – ${destination.name}`,
    date: today,
    departureAerodrome: departure.name,
    destinationAerodrome: destination.name,
    departureCoordinates: departure.coordinates,
    etdUtcMin: 0,
    transitionAltitudeFt: 5000,
    transitionLevel: '',
    globalDefaults: { tasKt: 100, wind: { directionDeg: 0, speedKt: 0 }, variationDeg: 0 },
    legs,
    legActuals: [],
  }
}
