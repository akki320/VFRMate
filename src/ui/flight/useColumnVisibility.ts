import { useCallback, useEffect, useState } from 'react'
import { COLUMN_IDS, DEFAULT_VISIBLE_COLUMNS, type ColumnId } from './columns'

const STORAGE_KEY = 'vfrmate.visibleColumns'

function readStored(): Set<ColumnId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set(DEFAULT_VISIBLE_COLUMNS)
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set(DEFAULT_VISIBLE_COLUMNS)
    const valid = parsed.filter((id): id is ColumnId => COLUMN_IDS.includes(id))
    return new Set(valid)
  } catch {
    return new Set(DEFAULT_VISIBLE_COLUMNS)
  }
}

/** Welche Tabellenspalten sichtbar sind — eine reine Anzeigepräferenz je
 * Gerät (wie der Theme), nicht Teil der Flugdaten. Persistiert in
 * localStorage. */
export function useColumnVisibility() {
  const [visible, setVisible] = useState<Set<ColumnId>>(() => readStored())

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]))
    } catch {
      // Persistenz ist ein Komfort, kein Muss.
    }
  }, [visible])

  const toggle = useCallback((id: ColumnId) => {
    setVisible((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const isVisible = useCallback((id: ColumnId) => visible.has(id), [visible])

  return { visible, toggle, isVisible }
}
