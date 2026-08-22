import { useTheme } from '../theme/ThemeContext'

/** Kleines, zurückhaltendes Bedienelement — wird nur am Boden gebraucht. */
export function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded border px-3 py-1.5 text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      aria-label={theme === 'night' ? 'Zu Tagmodus wechseln' : 'Zu Nachtmodus wechseln'}
    >
      {theme === 'night' ? '☾ Nacht' : '☀ Tag'}
    </button>
  )
}
