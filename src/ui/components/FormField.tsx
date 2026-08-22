import type { ChangeEvent } from 'react'

/**
 * Kompakte, zurückhaltende Formularfelder für alles, was nur am Boden
 * gebraucht wird (Accordion-Inhalte, Planungsformulare) — bewusst klein,
 * im Gegensatz zu den sehr großen Touchziel-Elementen der Kerntabelle.
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

interface CheckboxFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxField({ id, label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  )
}

interface TextAreaFieldProps {
  id: string
  label: string
  value: string | undefined
  onChange: (value: string) => void
  rows?: number
}

export function TextAreaField({ id, label, value, onChange, rows = 4 }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} htmlFor={id}>
      <textarea
        id={id}
        value={value ?? ''}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} font-sans`}
        style={fieldStyle}
      />
    </FieldWrapper>
  )
}
