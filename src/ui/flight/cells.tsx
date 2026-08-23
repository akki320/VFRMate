import { useState } from 'react'

// Schrift und Innenabstand sind bewusst responsiv (kleiner unterhalb von
// "sm", normal darüber) statt fest: praktisch jede Spaltenbreite in dieser
// Tabelle ist als `ch`-Wert gesetzt (siehe minWidth/width unten), und `ch`
// bemisst sich am Font-Size des jeweiligen Elements — dieselbe Zahl in
// `ch` ergibt bei kleinerer Schrift automatisch weniger Pixel. Dadurch
// schrumpfen alle Spalten auf schmalen Bildschirmen gemeinsam mit, ohne
// dass jede einzelne Breite separat für jede Bildschirmgröße gepflegt
// werden müsste.
export const inputClass = 'mono-num w-full min-w-0 rounded border px-1 py-0.5 text-xs sm:px-1.5 sm:py-1 sm:text-sm'
export const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }

/** Wandelt einen Entwurfstext in eine Zahl um — akzeptiert sowohl "1.6"
 * als auch "1,6" (deutsches Dezimalkomma). Gibt `undefined` für Text
 * zurück, der (noch) keine vollständige Zahl ist ("", "-", "1,"), damit
 * der Aufrufer solche Zwischenzustände nicht als "Feld geleert" wertet. */
function parseDraft(text: string): number | undefined {
  const normalized = text.trim().replace(',', '.')
  if (normalized === '' || normalized === '-') return undefined
  const n = Number(normalized)
  return Number.isFinite(n) ? n : undefined
}

interface NumberCellProps {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
  widthCh?: number
}

/**
 * Zahleneingabe für die Tabellenzellen. Bewusst `type="text"` mit
 * `inputMode="decimal"` statt `type="number"`: native Zahlenfelder zeigen
 * auf vielen Mobilgeräten eine reine Ziffern-Tastatur ohne Minus- oder
 * Komma-Taste und lehnen ein getipptes "," als Dezimaltrennzeichen rundweg
 * ab — genau das Problem bei VAR (Vorzeichen) und Entfernungen ("1,6 NM").
 *
 * Hält während der Eingabe einen eigenen Entwurfstext, der erst bei
 * vollständiger Zahl (oder beim Verlassen des Felds) über `onChange` nach
 * außen committet wird. Ohne das würde z. B. bei TAS/VAR (die auf einen
 * globalen Standardwert zurückfallen, siehe navigation.ts::resolveLeg) das
 * Leeren des Felds sofort ein `undefined` committen und die Zelle auf den
 * Standardwert zurückspringen lassen, noch bevor die neue Zahl fertig
 * getippt ist — z. B. ließ sich TAS so nie unter den globalen Standard von
 * 100 kt eingeben.
 */
export function NumberCell({ label, value, onChange, widthCh = 5 }: NumberCellProps) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  const [focused, setFocused] = useState(false)
  // Entwurf während des Renderns statt in einem Effect an den externen
  // Wert angleichen (React-Pattern "adjusting state during rendering") —
  // vermeidet einen zusätzlichen Render und den oxlint-Hinweis auf
  // setState-in-effect. Nur synchronisieren, solange das Feld nicht
  // fokussiert ist, sonst würde eine externe Änderung mitten in der
  // Eingabe den Entwurfstext überschreiben.
  const [lastSeenValue, setLastSeenValue] = useState(value)
  if (value !== lastSeenValue && !focused) {
    setLastSeenValue(value)
    setDraft(value === undefined ? '' : String(value))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const text = e.target.value
        setDraft(text)
        const parsed = parseDraft(text)
        if (parsed !== undefined) onChange(parsed)
      }}
      onBlur={() => {
        setFocused(false)
        const parsed = parseDraft(draft)
        onChange(parsed)
        setDraft(parsed === undefined ? '' : String(parsed))
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={inputClass}
      style={{ ...inputStyle, minWidth: `${widthCh}ch` }}
    />
  )
}

interface TextCellProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  widthCh?: number
}

/**
 * Freitexteingabe (Kontrollpunkt, Geplante Flughöhe, Bemerkungen). Committet
 * bewusst nur beim Verlassen des Felds (bzw. Enter) statt bei jedem
 * Tastendruck — anders als bei NumberCell braucht kein anderer Wert in der
 * Zeile eine Live-Reaktion auf jeden Buchstaben.
 *
 * Das ist mehr als eine Kleinigkeit: `updateLeg` schreibt asynchron in
 * IndexedDB, bevor der Zustand aktualisiert wird (patchCurrentFlight in
 * flightStore.ts). Committet man bei jedem Tastendruck, feuern beim
 * schnellen Tippen viele dieser async-Aufrufe gleichzeitig — lösen sie in
 * anderer Reihenfolge auf, als sie gestartet wurden, überschreibt ein
 * verspätet auflösender älterer Aufruf den Text eines später getippten
 * Zeichens, und einzelne Buchstaben gehen verloren oder werden vertauscht.
 * Ein einziger Commit am Ende der Eingabe umgeht das vollständig.
 */
export function TextCell({ label, value, onChange, placeholder, className, widthCh }: TextCellProps) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  const [lastSeenValue, setLastSeenValue] = useState(value)
  if (value !== lastSeenValue && !focused) {
    setLastSeenValue(value)
    setDraft(value)
  }

  return (
    <input
      type="text"
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false)
        if (draft !== value) onChange(draft)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      className={className ?? inputClass}
      style={{ ...inputStyle, ...(widthCh !== undefined ? { width: `${widthCh}ch`, minWidth: `${widthCh}ch` } : { minWidth: '7ch' }) }}
    />
  )
}
