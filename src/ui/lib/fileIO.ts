/** Browser-Datei-I/O für Export/Import: Herunterladen eines JSON-Strings
 * als Datei, Einlesen einer ausgewählten Datei als Text. Reines
 * DOM-Handling, keine Serialisierung/Validierung (siehe
 * store/exportImport.ts). */

export function downloadJsonFile(filename: string, contents: string): void {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Sicherer Dateiname aus einem beliebigen Titel (Flugbezeichnung,
 * Musterbezeichnung, ...): nur alphanumerische Zeichen, Bindestrich und
 * Unterstrich, sonst "-". */
export function safeFileNamePart(input: string): string {
  const cleaned = input.trim().replace(/[^a-zA-Z0-9-_]+/g, '-')
  return cleaned.length > 0 ? cleaned : 'unbenannt'
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'))
    reader.readAsText(file)
  })
}
