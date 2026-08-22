import { useId, useState } from 'react'
import { readFileAsText } from '../lib/fileIO'

interface ImportButtonProps {
  label: string
  onFile: (contents: string) => void
  onError: (message: string) => void
}

/** Datei-Auswahl getarnt als normaler Button (das native <input
 * type="file"> lässt sich nicht direkt stylen). */
export function ImportButton({ label, onFile, onError }: ImportButtonProps) {
  const inputId = useId()
  const [busy, setBusy] = useState(false)

  return (
    <label
      htmlFor={inputId}
      className="cursor-pointer rounded border px-3 py-1.5 text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
    >
      {busy ? 'Wird gelesen …' : label}
      <input
        id={inputId}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            const contents = await readFileAsText(file)
            onFile(contents)
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Datei konnte nicht gelesen werden.')
          } finally {
            setBusy(false)
          }
        }}
      />
    </label>
  )
}
