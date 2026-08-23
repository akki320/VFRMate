import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'vfrmate.remarksCollapsed'

function readStored(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    // Standardmäßig eingeklappt (schmal) — Bemerkungen sind Freitext und
    // damit potenziell lang; die ohnehin schon breite Tabelle soll dafür
    // nicht ungefragt Platz verlieren. Ein Tap auf den Pfeil in der
    // Kopfzeile klappt die Spalte bei Bedarf sofort auf.
    return raw === null ? true : raw === 'true'
  } catch {
    return true
  }
}

/** Ob die (immer ganz rechts, hinter ATO angeheftete) Bemerkungen-Spalte
 * schmal (eingeklappt) oder breit (ausgeklappt) dargestellt wird — eine
 * reine Anzeigepräferenz je Gerät (wie die Spaltenauswahl), nicht Teil
 * der Flugdaten. Persistiert in localStorage. */
export function useRemarksCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => readStored())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      // Persistenz ist ein Komfort, kein Muss.
    }
  }, [collapsed])

  const toggle = useCallback(() => setCollapsed((c) => !c), [])

  return { collapsed, toggle }
}
