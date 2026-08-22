interface WarningBannerProps {
  messages: string[]
}

/** Warnhinweise (Kraftstoff, Sonnenuntergang, ...) — Farbe hier ist ein
 * echtes Signal, keine Deko: es erscheint nur, wenn ein Grenzwert
 * tatsächlich verletzt ist. */
export function WarningBanner({ messages }: WarningBannerProps) {
  if (messages.length === 0) return null

  return (
    <div
      role="alert"
      className="mono-num mx-3 mt-3 flex flex-col gap-1 rounded border px-4 py-3 text-sm font-medium sm:mx-4"
      style={{
        borderColor: 'var(--signal-warning-border)',
        backgroundColor: 'var(--signal-warning-bg)',
        color: 'var(--signal-warning-text)',
      }}
    >
      {messages.map((message) => (
        <span key={message}>⚠ {message}</span>
      ))}
    </div>
  )
}
