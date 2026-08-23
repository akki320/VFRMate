/**
 * Spaltendefinitionen der Leg-Tabelle — bilden die Spalten des
 * Papierformulars ("Flugdurchführungsplan VFR") ab. Kontrollpunkt und ATO
 * sind immer sichtbar (Zeilenidentität bzw. die Kernfunktion "ATO tippen
 * → ETO der Folgepunkte neu schätzen"); alle anderen Spalten lassen sich
 * beliebig ein-/ausblenden (siehe useColumnVisibility.ts).
 *
 * Die meisten Spalten sind direkte Piloteneingaben — automatisch berechnet
 * werden WCA, GS, MC, Entf. Rest, Zeit Rest und ETO (siehe
 * domain/flightPlan.ts::computeLegDerived/reEstimateEto). "Gesamtstrecke"
 * (P14) und "Gesamtzeit" (P18) sind keine Spalten mehr, sondern
 * Summenwerte oberhalb der Tabelle (siehe FlightHeader.tsx) — auf jeder
 * Zeile wiederholt waren sie kaum zu gebrauchen.
 *
 * "eto" steht bewusst als letzter Eintrag: ETO und ATO sollen immer
 * nebeneinander stehen, und ATO wird als fest angeheftete Spalte direkt
 * nach den hier aufgeführten (sichtbaren) Spalten gerendert (siehe
 * LegTable.tsx) — nichts darf sich also hinter "eto" einreihen.
 */

export const COLUMN_IDS = [
  'safetyAlt',
  'plannedAlt',
  'tas',
  'wind',
  'tc',
  'wca',
  'var',
  'mh',
  'mc',
  'distLeg',
  'distRemain',
  'gs',
  'timeLeg',
  'timeRemain',
  'remarks',
  'eto',
] as const

export type ColumnId = (typeof COLUMN_IDS)[number]

/** Kurzlabel wie auf dem Papierformular (deutsches Kürzel, ggf. mit
 * ICAO-Kürzel in Klammern). */
export const COLUMN_LABELS: Record<ColumnId, string> = {
  safetyAlt: 'Sicherh.-Höhe',
  plannedAlt: 'Geplante Flughöhe',
  tas: 'TAS',
  wind: 'Wind',
  tc: 'TC (rwK)',
  wca: 'WCA',
  var: 'VAR (MW)',
  mh: 'MH (mwSK)',
  mc: 'MC (mwK)',
  distLeg: 'Entf. Abschnitt',
  distRemain: 'Entf. Rest',
  gs: 'GS (VG)',
  timeLeg: 'Zeit Abschnitt',
  timeRemain: 'Zeit Rest',
  eto: 'ETO',
  remarks: 'Bemerkungen',
}

/** Welche Spalten automatisch berechnet (schreibgeschützt) statt vom
 * Piloten ausgefüllt sind. */
export const COMPUTED_COLUMNS: ReadonlySet<ColumnId> = new Set(['wca', 'gs', 'mc', 'distRemain', 'timeRemain', 'eto'])

/** Für die Spalten-Auswahl gruppiert, in dieser Reihenfolge angezeigt. */
export const COLUMN_GROUPS: { label: string; columns: ColumnId[] }[] = [
  { label: 'Höhe', columns: ['safetyAlt', 'plannedAlt'] },
  { label: 'Navigation', columns: ['tas', 'wind', 'tc', 'wca', 'var', 'mh', 'mc'] },
  { label: 'Entfernung', columns: ['distLeg', 'distRemain'] },
  { label: 'Zeit', columns: ['gs', 'timeLeg', 'timeRemain', 'eto'] },
  { label: 'Sonstiges', columns: ['remarks'] },
]

export const DEFAULT_VISIBLE_COLUMNS: ColumnId[] = [
  'safetyAlt',
  'plannedAlt',
  'tas',
  'wind',
  'tc',
  'wca',
  'var',
  'mh',
  'distLeg',
  'distRemain',
  'gs',
  'timeLeg',
  'timeRemain',
  'eto',
]
