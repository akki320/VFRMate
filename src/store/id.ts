/** Generates a locally-unique ID for aircraft/flights/legs. No backend, so
 * a random UUID (or a timestamp+random fallback) is enough — no
 * coordination with anything outside this device is ever needed. */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
