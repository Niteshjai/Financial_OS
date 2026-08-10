import { useEffect } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { ThemeMode } from '../../hooks/useTheme'

interface Props {
  style?: 'icon-only' | 'three-way'
  size?: 'sm' | 'md'
  className?: string
}

export function ThemeToggle({ style = 'icon-only', size = 'md', className = '' }: Props) {
  const { mode, resolved, setMode, toggle, initTheme } = useTheme()

  useEffect(() => {
    initTheme()
  }, [])

  if (style === 'three-way') {
    const options: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
      { value: 'light', icon: <Sun className="size-3.5" />, label: 'Light' },
      { value: 'system', icon: <Monitor className="size-3.5" />, label: 'System' },
      { value: 'dark', icon: <Moon className="size-3.5" />, label: 'Dark' },
    ]

    return (
      <div
        role="group"
        aria-label="Theme preference"
        className={`flex bg-muted rounded-full p-1 border border-border gap-0.5 ${className}`}
      >
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            title={`${opt.label} mode`}
            aria-pressed={mode === opt.value}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
              mode === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    )
  }

  // Default: icon-only toggle
  const dim = size === 'sm' ? 'size-8' : 'size-9'

  return (
    <button
      onClick={toggle}
      title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
      className={`${dim} rounded-xl border border-border bg-muted text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer active:scale-95 ${className}`}
    >
      {resolved === 'dark' ? (
        <Moon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      ) : (
        <Sun className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      )}
    </button>
  )
}
