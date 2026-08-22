import { useId, useState } from 'react'
import type { ReactNode } from 'react'

interface AccordionProps {
  title: string
  /** Kurzer Zusatztext neben dem Titel, z.B. eine Warnung oder Zusammenfassung. */
  summary?: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

/**
 * Zugeklapptes Panel für alles, was im Flug nicht mit der Kerntabelle
 * konkurrieren soll (Frequenzen, Wetter, Kraftstoff, Masse & Schwerpunkt,
 * Start-/Landestrecke, AIP-Daten). Bleibt erreichbar, drängt sich aber
 * nicht auf: standardmäßig zugeklappt, Tastatur- und Screenreader-tauglich
 * über ein natives Button+aria-expanded-Muster.
 */
export function Accordion({ title, summary, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <div className="border-b" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
        style={{ minHeight: 56, color: 'var(--text-primary)' }}
      >
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-3">
          {summary && (
            <span className="mono-num text-sm" style={{ color: 'var(--text-secondary)' }}>
              {summary}
            </span>
          )}
          <span aria-hidden="true" style={{ color: 'var(--text-muted)' }}>
            {open ? '▲' : '▼'}
          </span>
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-5">
          {children}
        </div>
      )}
    </div>
  )
}
