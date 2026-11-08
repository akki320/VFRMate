/**
 * Spaltendefinitionen der Leg-Tabelle — bilden die Spalten des
 * Papierformulars ("Flugdurchführungsplan VFR") ab. Kontrollpunkt und ATO
 * sind immer sichtbar (Zeilenidentität bzw. die Kernfunktion "ATO tippen
 * → ETO der Folgepunkte neu schätzen"); alle anderen Spalten lassen sich
 * beliebig ein-/ausblenden (siehe useColumnVisibility.ts).
 *
 * Die meisten Spalten sind direkte Piloteneingaben — automatisch berechnet
 * werden WCA, MC, MH, Entf. Rest, Zeit Rest und ETO (siehe
 * domain/flightPlan.ts::computeLegDerived/reEstimateEto). "Gesamtstrecke"
 * (P14) und "Gesamtzeit" (P18) sind keine Spalten mehr, sondern
 * Summenwerte oberhalb der Tabelle (siehe FlightHeader.tsx) — auf jeder
 * Zeile wiederholt waren sie kaum zu gebrauchen.
 *
 * "eto" steht bewusst als letzter Eintrag dieser Liste: ETO und ATO sollen
 * immer nebeneinander stehen, und ATO wird als fest angeheftete Spalte
 * direkt nach den hier aufgeführten (sichtbaren) Spalten gerendert (siehe
 * LegTable.tsx) — nichts aus dieser Liste darf sich also hinter "eto"
 * einreihen. "Bemerkungen" ist deshalb keine Spalte aus dieser Liste mehr
 * (nicht Teil der Spalten-Auswahl), sondern eine eigene, immer ganz
 * rechts — noch hinter ATO — angeheftete Spalte mit eigenem
 * Schnell-Ein-/Ausklapp-Schalter statt der allgemeinen Sichtbarkeitswahl
 * (siehe useRemarksCollapsed.ts, LegTable.tsx).
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
}

/** Welche Spalten automatisch berechnet (schreibgeschützt) statt vom
 * Piloten ausgefüllt sind. */
export const COMPUTED_COLUMNS: ReadonlySet<ColumnId> = new Set(['wca', 'mc', 'mh', 'distRemain', 'timeRemain', 'eto'])

/** Erklärender Hinweis als "ⓘ"-Tooltip neben dem Spaltenkopf, für Spalten
 * mit einer nicht auf den ersten Blick offensichtlichen Konvention (siehe
 * LegTable.tsx). Bislang nur VAR — Vorzeichenkonvention seit Phase 20
 * umgedreht (negativ = Ost, positiv = West, direkt wie in SkyDemon), kam
 * schon einmal zu einer Verwechslung. */
export const COLUMN_HINTS: Partial<Record<ColumnId, string>> = {
  var: 'Vorzeichen: negativ = östliche Missweisung, positiv = westliche — wie in SkyDemon, direkt übertragbar',
}

/** Für die Spalten-Auswahl gruppiert, in dieser Reihenfolge angezeigt. */
export const COLUMN_GROUPS: { label: string; columns: ColumnId[] }[] = [
  { label: 'Höhe', columns: ['safetyAlt', 'plannedAlt'] },
  { label: 'Navigation', columns: ['tas', 'wind', 'tc', 'wca', 'var', 'mh', 'mc'] },
  { label: 'Entfernung', columns: ['distLeg', 'distRemain'] },
  { label: 'Zeit', columns: ['gs', 'timeLeg', 'timeRemain', 'eto'] },
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
