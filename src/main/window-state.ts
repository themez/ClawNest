import { screen } from 'electron'
import { store } from './store'

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800

export function getWindowState() {
  const saved = store.get('windowState')

  if (saved.x !== undefined && saved.y !== undefined) {
    const displays = screen.getAllDisplays()
    const visible = displays.some((display) => {
      const { x, y, width, height } = display.bounds
      return (
        saved.x! >= x &&
        saved.x! < x + width &&
        saved.y! >= y &&
        saved.y! < y + height
      )
    })

    if (!visible) {
      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, isMaximized: false }
    }
  }

  return saved
}

export function saveWindowState(win: Electron.BrowserWindow) {
  if (win.isMinimized()) return

  const isMaximized = win.isMaximized()
  if (!isMaximized) {
    const bounds = win.getBounds()
    store.set('windowState', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: false,
    })
  } else {
    store.set('windowState.isMaximized', true)
  }
}
