import { useState } from 'react'
import { COLUMN_GROUPS, COLUMN_LABELS } from './columns'
import type { useColumnVisibility } from './useColumnVisibility'

/** Popover zum beliebigen Ein-/Ausblenden der Tabellenspalten. */
export function ColumnVisibilityMenu({ columns }: { columns: ReturnType<typeof useColumnVisibility> }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded border px-3 py-1.5 text-xs"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        Spalten
      </button>
      {open && (
        <>
          {/* Klick außerhalb schließt das Menü. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            className="absolute left-0 z-40 mt-2 flex max-h-[70vh] w-64 max-w-[85vw] flex-col gap-3 overflow-y-auto rounded border p-3 shadow-lg"
            style={{ borderColor: 'var(--border-strong)', backgroundColor: 'var(--bg-elevated)' }}
          >
            {COLUMN_GROUPS.map((group) => (
              <fieldset key={group.label} className="flex flex-col gap-1">
                <legend className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {group.label}
                </legend>
                {group.columns.map((id) => (
                  <label key={id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                    <input type="checkbox" checked={columns.isVisible(id)} onChange={() => columns.toggle(id)} />
                    {COLUMN_LABELS[id]}
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
