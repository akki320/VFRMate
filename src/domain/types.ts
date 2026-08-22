/**
 * Domain model for the VFR Flugdurchführungsplan.
 *
 * This module is framework-free: no React, no store, no I/O. It only
 * describes the shapes of data that the domain layer (navigation.ts,
 * fuel.ts, massBalance.ts, runway.ts, ...) operates on.
 *
 * Time convention: every point in time is stored as UTC-Minuten seit
 * Mitternacht (0–1439), never as a `Date`. Displaying it as `HH:MM` is a
 * UI-layer concern (see src/domain/format.ts).
 */

/** Minutes since UTC midnight, 0–1439. Wrap-around past midnight is the
 * caller's responsibility (a flight never spans > 24h in this app). */
export type UtcMinutes = number

/** A single mass/moment point on an aircraft's CG envelope, used to build
 * the closed polygon that the loaded mass/CG must fall inside. */
export interface MassMomentPoint {
  /** Mass in kg. */
  mass: number
  /** Moment (mass × Hebelarm) in kg·m (or kg·mm, kept consistent per type). */
  moment: number
}

/** One row of a start-/landestrecke performance table, e.g. as printed in
 * the aircraft's POH for a given pressure altitude / temperature. */
export interface RunwayTableRow {
  /** Druckhöhe in ft. */
  pressureAltitudeFt: number
  /** Temperatur in °C. */
  temperatureC: number
  /** Grundstrecke (Startlauf / Landerollstrecke) in m. */
  groundRunM: number
  /** Strecke über 15 m Hindernis in m. */
  distanceOver15mM: number
}

/** Multiplicative/additive correction factors applied to a base
 * Start-/Landestrecke figure. Values are ratios (1.10 = +10%) unless noted. */
export interface RunwayCorrectionFactors {
  /** Zuschlag pro 1000 ft Druckhöhe, als Faktor (z.B. 0.10 = +10% / 1000 ft). */
  perThousandFtAltitude: number
  /** Zuschlag pro °C Abweichung von ISA, als Faktor. */
  perDegreeAboveIsa: number
  /** Faktor je kt Gegenwind (Reduktion) — negativer Wert reduziert die Strecke. */
  perKnotHeadwind: number
  /** Faktor je kt Rückenwind (Zuschlag). */
  perKnotTailwind: number
  /** Zuschlag je Prozent Bahnneigung (positiv = ansteigend). */
  perPercentSlopeUphill: number
  perPercentSlopeDownhill: number
  /** Zuschlag für Grasbahn, als Faktor (0.20 = +20%). */
  grassSurface: number
  /** Zuschlag für nassen/kontaminierten Untergrund, als Faktor. */
  wetOrContaminatedSurface: number
}

/** Kraftstoffverbrauchsangaben eines Musters für verschiedene Flugphasen. */
export interface FuelConsumption {
  /** l/h im Reiseflug. */
  cruiseLh: number
  /** l/h im Steigflug. */
  climbLh: number
  /** l für Anlassen und Rollen (fixe Menge, kein l/h). */
  taxiL: number
}

/** Hebelarme (Momentarme) eines Musters, in m ab Bezugspunkt. */
export interface AircraftArms {
  /** Sitzreihen 1–3 (Pilot/Vordersitze, Reihe 2, Reihe 3). */
  seatRow1: number
  seatRow2: number
  seatRow3: number
  /** Gepäckabteile. */
  baggageFront: number
  baggageMid: number
  baggageRear: number
  /** Kraftstofftank. */
  fuel: number
}

/** Ein Luftfahrzeugmuster mit allen für Navigation, Masse & Schwerpunkt und
 * Start-/Landestreckenberechnung nötigen Stammdaten. */
export interface Aircraft {
  id: string
  /** Muster, z.B. "Cessna 172S". */
  type: string
  /** Kennzeichen, z.B. "D-EABC". */
  registration: string
  /** Standard-TAS für die Streckenplanung, in kt. */
  defaultTasKt: number
  fuelConsumption: FuelConsumption
  /** Leermasse in kg. */
  emptyMassKg: number
  arms: AircraftArms
  /** Kraftstoffdichte in kg/l (z.B. AVGAS ≈ 0.72). */
  fuelDensityKgPerL: number
  /** Maximale nutzbare Kraftstoffmenge in l. */
  fuelCapacityL: number
  /** Schwerpunktgrenzen als geschlossenes Polygon aus Masse-/Momentpunkten. */
  cgEnvelope: MassMomentPoint[]
  takeoffTable: RunwayTableRow[]
  landingTable: RunwayTableRow[]
  runwayCorrectionFactors: RunwayCorrectionFactors
}

/** Frequenzen für einen Flugplatz (Start oder Ziel). */
export interface AerodromeFrequencies {
  twr?: string
  ground?: string
  info?: string
  atis?: string
}

/** TWR/Ground/INFO/ATIS je Start- und Zielflugplatz. */
export interface Frequencies {
  departure: AerodromeFrequencies
  destination: AerodromeFrequencies
}

/** Wettermeldung/-beratung für einen Flugplatz oder eine Region. */
export interface WeatherInfo {
  /** QNH in hPa. */
  qnhHpa?: number
  temperatureC?: number
  dewPointC?: number
  /** Windrichtung in ° (rechtweisend oder wie gemeldet) und Stärke in kt. */
  windDirectionDeg?: number
  windSpeedKt?: number
  /** Sicht in m (oder km, je nach Meldung — Einheit in UI kennzeichnen). */
  visibilityM?: number
  clouds?: string
  /** GAFOR-Code, z.B. "OPR". */
  gafor?: string
  /** Gültigkeitsbeginn/-ende der Beratung, in UTC-Minuten seit Mitternacht. */
  validFrom?: UtcMinutes
  validUntil?: UtcMinutes
}

/** Wind an einem Kontrollpunkt/Abschnitt: Richtung in ° (woher der Wind
 * weht), Stärke in kt. */
export interface Wind {
  directionDeg: number
  speedKt: number
}

/** Ein Abschnitt (Leg) zwischen zwei Kontrollpunkten. Nur die geplanten
 * Eingabewerte werden gespeichert — abgeleitete Werte (WCA, MH, GS, ...)
 * werden nie persistiert, sondern immer aus diesen Feldern neu berechnet
 * (siehe navigation.ts::computeLeg). */
export interface Leg {
  id: string
  /** Kontrollpunkt-Name (Ziel dieses Abschnitts), z.B. "EDXY" oder "Kirchturm Musterdorf". */
  waypoint: string
  /** Optionale Koordinaten (Dezimalgrad). */
  coordinates?: { lat: number; lon: number }
  /** Sicherheitshöhe in ft. */
  safetyAltitudeFt?: number
  /** Geplante Flughöhe in ft oder Flugfläche (z.B. "FL065"). */
  plannedAltitude: string
  /** Rechtweisender Kurs (True Course) in °, 0–359. */
  tc: number
  /** Distanz zum vorherigen Kontrollpunkt in NM. */
  distanceNm: number
  /**
   * True Airspeed in kt für diesen Abschnitt — überschreibt
   * Flight.globalDefaults.tasKt. `undefined` bedeutet: globalen Wert
   * übernehmen (siehe navigation.ts::resolveLeg).
   */
  tasKt?: number
  /** Wind für diesen Abschnitt — überschreibt Flight.globalDefaults.wind.
   * `undefined` bedeutet: globalen Wert übernehmen. */
  wind?: Wind
  /** Missweisung (Variation) in °, positiv = östliche Missweisung —
   * überschreibt Flight.globalDefaults.variationDeg. `undefined` bedeutet:
   * globalen Wert übernehmen. */
  variationDeg?: number
  remarks?: string
}

/** Global für den ganzen Flug gesetzte Werte, die pro Leg überschrieben
 * werden können (siehe Leg.tasKt/wind/variationDeg). */
export interface FlightGlobalDefaults {
  tasKt: number
  wind: Wind
  variationDeg: number
}

/** Effektive (aufgelöste) Werte eines Legs samt Kennzeichnung, welche davon
 * vom globalen Standardwert abweichen — für die "welche Legs weichen ab"
 * Anzeige in Bildschirm 2. Wird von navigation.ts::resolveLeg geliefert,
 * nie gespeichert. */
export interface ResolvedLegValues {
  tasKt: number
  wind: Wind
  variationDeg: number
  tasKtIsOverridden: boolean
  windIsOverridden: boolean
  variationDegIsOverridden: boolean
}

/** Tatsächliche Überflugzeit (ATO) für einen Kontrollpunkt, per Leg-ID. */
export interface LegActual {
  legId: string
  /** ATO in UTC-Minuten seit Mitternacht. */
  atoUtcMin: UtcMinutes
}

/** Abgeleitete (nie gespeicherte) Werte für ein Leg, aus computeLeg(). */
export interface ComputedLeg {
  legId: string
  /** Wind Correction Angle in °, signiert (+ = Kurskorrektur nach rechts/Steuerbord). */
  wca: number
  /** Magnetic Course = TC − VAR, 0–359. */
  mc: number
  /** Magnetic Heading = TH − VAR, 0–359. */
  mh: number
  /** Rechtweisender Steuerkurs (True Heading) = TC + WCA, 0–359. */
  rwK: number
  /** Missweisender Steuerkurs = MH (Alias, deutsche Fluglehrer-Terminologie). */
  mwK: number
  /** Groundspeed in kt. */
  gs: number
  /** Flugzeit dieses Abschnitts in Minuten (gerundet). */
  legTimeMin: number
  /** Kumulierte Flugzeit seit Abflug in Minuten. */
  cumulativeTimeMin: number
  /** Restzeit bis zum Zielflugplatz in Minuten (ab Ende dieses Legs). */
  remainingTimeMin: number
  /** Restdistanz bis zum Zielflugplatz in NM (ab Ende dieses Legs). */
  remainingDistanceNm: number
  /** Estimated Time Over (ETO) am Kontrollpunkt dieses Legs, in UTC-Minuten. */
  etoUtcMin: UtcMinutes
}

/** Re-Estimate-Ergebnis für ein Leg, nachdem ein oder mehrere vorherige
 * ATOs eingetragen wurden. */
export interface ReEstimatedLeg {
  legId: string
  /** Neu geschätzte ETO in UTC-Minuten (Fallback: geplante ETO, falls noch
   * keine ATO-Kette vorliegt, aus der eine tatsächliche GS ableitbar ist). */
  revisedEtoUtcMin: UtcMinutes
  /** Abweichung revised − planned in Minuten, z.B. +3 oder −2. */
  deltaMin: number
  /** Tatsächliche Groundspeed des zuletzt geflogenen Abschnitts, falls
   * bekannt (kt). */
  actualGsKt?: number
}

/** Ein geplanter Flug: Rahmendaten, die für alle Legs gelten. */
export interface Flight {
  id: string
  /** Freier Name zum Wiederfinden in der Flugliste, z.B. "EDXA–EDXB Sommerlager". */
  name: string
  /** Datum als ISO-Datumsstring (YYYY-MM-DD) — kein Date-Objekt. */
  date: string
  departureAerodrome: string
  destinationAerodrome: string
  alternateAerodrome?: string
  /** Estimated Time of Departure, UTC-Minuten seit Mitternacht. */
  etdUtcMin: UtcMinutes
  /** Actual Time of Departure, UTC-Minuten seit Mitternacht (optional bis Start). */
  atdUtcMin?: UtcMinutes
  /** Übergangshöhe (Transition Altitude) in ft. */
  transitionAltitudeFt: number
  /** Transition Level, z.B. "FL070". */
  transitionLevel: string
  /** Sonnenuntergang (SS) am Zielort, UTC-Minuten seit Mitternacht. */
  sunsetUtcMin?: UtcMinutes
  aircraftId: string
  /** Globale Standardwerte für TAS/Wind/VAR, pro Leg überschreibbar
   * (siehe Leg.tasKt/wind/variationDeg). */
  globalDefaults: FlightGlobalDefaults
  legs: Leg[]
  legActuals: LegActual[]
}

/** Kraftstoffplan nach deutschem Flugdurchführungsplan-Schema. Alle Mengen
 * in Litern, sofern nicht anders angegeben. */
export interface FuelPlan {
  /** Anlassen und Rollen. */
  startAndTaxiL: number
  /** Steigflug. */
  climbL: number
  /** Reiseflug. */
  cruiseL: number
  /** An-/Abflugzuschlag, mind. 10 Minuten (als Menge in l hinterlegt, aus
   * Verbrauch × Zeit abgeleitet). */
  approachContingencyL: number
  /** Ausweichflugplatz (Alternate). */
  alternateL: number
  /** Reserve, mind. 30 Minuten Flugzeit. */
  reserveL: number
  /** Zusätzlicher Kraftstoff nach Ermessen des Piloten. */
  extraL: number
  /** Tatsächlich getankter/vorhandener Kraftstoffvorrat. */
  onboardL: number
}

/** Masse & Schwerpunkt (Mass & Balance) für einen Beladungszustand
 * (Start oder Landung). */
export interface MassBalance {
  emptyMassKg: number
  /** Ausfliegbarer Kraftstoff in l. */
  usableFuelL: number
  /** Nicht ausfliegbarer Kraftstoff in l (fester Bestandteil der Leermasse
   * bei manchen Mustern separat ausgewiesen). */
  unusableFuelL: number
  /** Schmierstoff/Öl in kg. */
  oilKg: number
  seatRow1Kg: number
  seatRow2Kg: number
  seatRow3Kg: number
  baggageFrontKg: number
  baggageMidKg: number
  baggageRearKg: number
}

/** Ergebnis einer Start-/Landestreckenberechnung für einen konkreten Flugplatz
 * und Wetterzustand. */
export interface RunwayCalc {
  /** Grundstrecke aus der POH-Tabelle (interpoliert), in m. */
  baseGroundRunM: number
  baseDistanceOver15mM: number
  /** Angewandte Korrekturfaktoren, für Nachvollziehbarkeit protokolliert. */
  appliedFactors: {
    altitude: number
    temperature: number
    wind: number
    slope: number
    grass: number
    surfaceCondition: number
  }
  /** Korrigierte Werte in m. */
  correctedGroundRunM: number
  correctedDistanceOver15mM: number
  /** Verfügbare Bahnlänge am Flugplatz, in m. */
  availableRunwayLengthM: number
  /** true, wenn correctedDistanceOver15mM <= availableRunwayLengthM. */
  withinAvailableLength: boolean
}
