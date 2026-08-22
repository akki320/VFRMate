import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { formatUtcMinutes, parseUtcMinutes } from '../../domain/format'

/**
 * Kompakte, zurückhaltende Formularfelder für die Kopfzeile — bewusst
 * klein, im Gegensatz zu den großen Touchziel-Elementen der Leg-Tabelle
 * (ATO-Button etc.).
 */

const fieldClass =
  'w-full rounded border px-2 py-1.5 text-sm mono-num focus-visible:outline-none'
const fieldStyle = {
  backgroundColor: 'var(--bg-elevated)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
}

interface FieldWrapperProps {
  label: string
  htmlFor: string
  children: React.ReactNode
}

function FieldWrapper({ label, htmlFor, children }: FieldWrapperProps) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
      <span>{label}</span>
      {children}
    </label>
  )
}

interface NumberFieldProps {
  id: string
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  step?: number
  suffix?: string
}

export function NumberField({ id, label, value, onChange, step = 1, suffix }: NumberFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    onChange(raw === '' ? undefined : Number(raw))
  }
  return (
    <FieldWrapper label={suffix ? `${label} (${suffix})` : label} htmlFor={id}>
      <input
        id={id}
        type="number"
        step={step}
        value={value ?? ''}
        onChange={handleChange}
        className={fieldClass}
        style={fieldStyle}
      />
    </FieldWrapper>
  )
}

interface TextFieldProps {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string) => void
  placeholder?: string
}

export function TextField({ id, label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id}>
      <input
        id={id}
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} font-sans`}
        style={fieldStyle}
      />
    </FieldWrapper>
  )
}

interface TimeFieldProps {
  id: string
  label: string
  /** UTC-Minuten seit Mitternacht, oder undefined für "nicht gesetzt". */
  value: number | undefined
  onChange: (value: number | undefined) => void
}

/** Zeitfeld als "HH:MM"-Text, gebunden an UTC-Minuten seit Mitternacht
 * (siehe domain/format.ts) — kein <input type="time">, damit die
 * UTC-Konvention nie mit der Zeitzone des Geräts verwechselt wird. */
export function TimeField({ id, label, value, onChange }: TimeFieldProps) {
  const formatted = value !== undefined ? formatUtcMinutes(value) : ''
  const [draft, setDraft] = useState(formatted)
  // Wenn sich der Wert von außen ändert (z.B. ein anderer Store-Patch),
  // den Entwurf synchron beim Rendern nachziehen statt in einem Effect —
  // vermeidet einen unnötigen zusätzlichen Render-Durchlauf.
  const [lastFormatted, setLastFormatted] = useState(formatted)
  if (formatted !== lastFormatted) {
    setLastFormatted(formatted)
    setDraft(formatted)
  }

  const commit = (raw: string) => {
    if (raw.trim() === '') {
      onChange(undefined)
      return
    }
    const parsed = parseUtcMinutes(raw)
    if (!Number.isNaN(parsed)) onChange(parsed)
  }

  return (
    <FieldWrapper label={`${label} (UTC)`} htmlFor={id}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="HH:MM"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        className={fieldClass}
        style={fieldStyle}
      />
    </FieldWrapper>
  )
}
