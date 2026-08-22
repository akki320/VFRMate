import { useState } from 'react'
import type { Aircraft } from '../../domain/types'
import { useAircraftStore } from '../../store/aircraftStore'
import { ImportValidationError, parseAircraftImport, serializeAircraft } from '../../store/exportImport'
import { ImportButton } from '../components/ImportButton'
import { downloadJsonFile, safeFileNamePart } from '../lib/fileIO'
import { AircraftForm } from './AircraftForm'

/** Flugzeugmuster-Verwaltung: anlegen, bearbeiten, duplizieren, löschen,
 * sowie Export/Import als JSON-Datei. Muster sind unabhängig vom
 * einzelnen Flug gespeichert. */
export function AircraftManager() {
  const aircraft = useAircraftStore((s) => s.aircraft)
  const add = useAircraftStore((s) => s.add)
  const update = useAircraftStore((s) => s.update)
  const remove = useAircraftStore((s) => s.remove)
  const duplicate = useAircraftStore((s) => s.duplicate)

  const [editingId, setEditingId] = useState<string | 'new' | undefined>(undefined)
  const [importError, setImportError] = useState<string | undefined>(undefined)
  const editing = editingId === 'new' ? undefined : aircraft.find((a) => a.id === editingId)

  if (editingId !== undefined) {
    return (
      <AircraftForm
        initial={editing}
        onCancel={() => setEditingId(undefined)}
        onSave={(dataInput) => {
          if (editingId === 'new') {
            void add(dataInput)
          } else {
            void update(editingId, dataInput)
          }
          setEditingId(undefined)
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {aircraft.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Noch keine Flugzeugmuster angelegt.
        </p>
      )}
      {aircraft.map((a: Aircraft) => (
        <div
          key={a.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {a.type || '(ohne Namen)'}
            </div>
            <div className="mono-num text-xs" style={{ color: 'var(--text-secondary)' }}>
              {a.registration}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditingId(a.id)}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => void duplicate(a.id)}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Duplizieren
            </button>
            <button
              type="button"
              onClick={() =>
                downloadJsonFile(
                  `vfrmate-muster-${safeFileNamePart(a.registration || a.type)}.json`,
                  serializeAircraft(a),
                )
              }
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Exportieren
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`"${a.type}" (${a.registration}) wirklich löschen?`)) void remove(a.id)
              }}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: 'var(--signal-warning-border)', color: 'var(--signal-warning-text)' }}
            >
              Löschen
            </button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setEditingId('new')}
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: 'var(--signal-active-border)', color: '#05070b' }}
        >
          + Neues Muster
        </button>
        <ImportButton
          label="Muster importieren"
          onError={setImportError}
          onFile={(contents) => {
            try {
              const data = parseAircraftImport(contents)
              void add(data)
              setImportError(undefined)
            } catch (err) {
              setImportError(err instanceof ImportValidationError ? err.message : 'Import fehlgeschlagen.')
            }
          }}
        />
      </div>
      {importError && (
        <p className="text-sm" style={{ color: 'var(--signal-warning-text)' }}>
          ⚠ {importError}
        </p>
      )}
    </div>
  )
}
