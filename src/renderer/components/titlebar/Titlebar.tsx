import { Minus, Square, X, Copy } from 'lucide-react'
import { useElectron } from '@/hooks/useElectron'
import { useEffect, useState } from 'react'

const platform = typeof window !== 'undefined' ? window.electronAPI?.platform : 'darwin'

export function Titlebar() {
  const electron = useElectron()
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    electron.windowIsMaximized().then(setIsMaximized).catch(() => {})
    const unsub = electron.onWindowMaximizedChanged((_e, val) => setIsMaximized(val as boolean))
    return unsub
  }, [electron])

  // macOS: just a drag region (native traffic lights handle controls)
  if (platform === 'darwin') {
    return (
      <div
        className="h-[38px] w-full shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />
    )
  }

  // Windows / Linux: custom frameless titlebar with controls
  return (
    <div
      className="flex h-[38px] w-full shrink-0 items-center justify-between border-b border-border"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="pl-3 text-xs font-medium text-muted-foreground">ClawBox</div>
      <div
        className="flex h-full items-stretch"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => electron.windowMinimize()}
          className="flex w-11 items-center justify-center hover:bg-accent"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => electron.windowMaximize()}
          className="flex w-11 items-center justify-center hover:bg-accent"
        >
          {isMaximized ? (
            <Copy className="h-3.5 w-3.5" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={() => electron.windowClose()}
          className="flex w-11 items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
