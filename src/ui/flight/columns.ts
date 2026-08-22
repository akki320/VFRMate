/**
 * Spaltendefinitionen der Leg-Tabelle — bilden die Spalten des
 * Papierformulars ("Flugdurchführungsplan VFR") ab. Kontrollpunkt und ATO
 * sind immer sichtbar (Zeilenidentität bzw. die Kernfunktion "ATO tippen
 * → ETO der Folgepunkte neu schätzen"); alle anderen Spalten lassen sich
 * beliebig ein-/ausblenden (siehe useColumnVisibility.ts).
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
  'distAccum',
  'distRemain',
  'gs',
  'timeLeg',
  'timeAccum',
  'timeRemain',
  'eto',
  'remarks',
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
  distAccum: 'Entf. Gesamt',
  distRemain: 'Entf. Rest',
  gs: 'GS (VG)',
  timeLeg: 'Zeit Abschnitt',
  timeAccum: 'Zeit Gesamt',
  timeRemain: 'Zeit Rest',
  eto: 'ETO',
  remarks: 'Bemerkungen',
}

/** Für die Spalten-Auswahl gruppiert, in dieser Reihenfolge angezeigt. */
export const COLUMN_GROUPS: { label: string; columns: ColumnId[] }[] = [
  { label: 'Höhe', columns: ['safetyAlt', 'plannedAlt'] },
  { label: 'Navigation', columns: ['tas', 'wind', 'tc', 'wca', 'var', 'mh', 'mc'] },
  { label: 'Entfernung', columns: ['distLeg', 'distAccum', 'distRemain'] },
  { label: 'Zeit', columns: ['gs', 'timeLeg', 'timeAccum', 'timeRemain', 'eto'] },
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
