import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { DEFAULT_GATEWAY_PORT } from '@shared/constants'
import { IPC_CHANNELS, IPC_EVENTS } from '@shared/ipc-types'
import { detectAll } from './openclaw/environment'
import { openclawCli } from './openclaw/cli'
import { gatewayClient } from './openclaw/gateway-client'
import { store } from './store'
import type { StoreSchema } from './store'
import { getWindowState, saveWindowState } from './window-state'

let mainWindow: BrowserWindow | null = null
let gatewayConnectInFlight: Promise<void> | null = null

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function probeGateway(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: '127.0.0.1' }, () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.setTimeout(2000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

// ---------------------------------------------------------------------------
// Window creation
// ---------------------------------------------------------------------------

function createWindow() {
  const windowState = getWindowState()
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    frame: isMac ? true : false,
    trafficLightPosition: isMac ? { x: 16, y: 18 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  gatewayClient.setWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    if (windowState.isMaximized) {
      mainWindow?.maximize()
    }
  })

  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow)
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGED, true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGED, false)
  })

  // Load renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

function registerIpcHandlers() {
  // ─── App Info ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_VERSION, () => app.getVersion())
  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, () => process.platform)
  ipcMain.handle(IPC_CHANNELS.OPEN_LINK, (_e, url: string) => shell.openExternal(url))

  // ─── Store ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GET_STORE_VALUE, (_e, key: string) =>
    store.get(key as keyof StoreSchema),
  )
  ipcMain.handle(IPC_CHANNELS.SET_STORE_VALUE, (_e, key: string, value: unknown) => {
    store.set(key as keyof StoreSchema, value as never)
  })

  // ─── Window Controls ──────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => mainWindow?.minimize())
  ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => mainWindow?.close())
  ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, () => mainWindow?.isMaximized() ?? false)

  // ─── OpenClaw ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.OPENCLAW_DETECT_ENV, () => detectAll())

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_INSTALL, (event) => {
    // Use npm to install openclaw globally — not the openclaw CLI itself
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(npm, ['install', '-g', 'openclaw'], {
      stdio: ['ignore', 'pipe', 'pipe'], // close stdin to prevent blocking
    })

    let exited = false
    const sendOutput = (data: string) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_EVENTS.OPENCLAW_INSTALL_OUTPUT, data)
      }
    }
    const sendExit = (code: number) => {
      if (exited) return
      exited = true
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_EVENTS.OPENCLAW_INSTALL_EXIT, code)
      }
    }

    child.stdout!.on('data', (d: Buffer) => sendOutput(d.toString()))
    child.stderr!.on('data', (d: Buffer) => sendOutput(d.toString()))
    child.on('error', (err) => {
      sendOutput(`Error: ${err.message}\n`)
      sendExit(1)
    })
    child.on('close', (code) => sendExit(code ?? 1))
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_UNINSTALL, (event) => {
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(npmCmd, ['uninstall', '-g', 'openclaw'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let exited = false
    const sendOutput = (data: string) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_EVENTS.OPENCLAW_INSTALL_OUTPUT, data)
      }
    }
    const sendExit = (code: number) => {
      if (exited) return
      exited = true
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_EVENTS.OPENCLAW_INSTALL_EXIT, code)
      }
    }

    child.stdout!.on('data', (d: Buffer) => sendOutput(d.toString()))
    child.stderr!.on('data', (d: Buffer) => sendOutput(d.toString()))
    child.on('error', (err) => {
      sendOutput(`Error: ${err.message}\n`)
      sendExit(1)
    })
    child.on('close', (code) => sendExit(code ?? 1))
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_CLI_EXEC, async (_e, args: string[]) => {
    return openclawCli.exec(args)
  })

  // ─── Gateway ──────────────────────────────────────────────────────────
  ipcMain.handle(IPC_CHANNELS.GATEWAY_CONNECT, async () => {
    if (gatewayConnectInFlight) return gatewayConnectInFlight

    gatewayConnectInFlight = (async () => {
      try {
        // First check if gateway is reachable
        const reachable = await probeGateway(DEFAULT_GATEWAY_PORT)

        if (!reachable) {
          // Try to start the daemon
          try {
            await openclawCli.exec(['daemon', 'start'], 15_000)
            // Wait a bit for the gateway to start
            await new Promise((r) => setTimeout(r, 2000))
          } catch {
            // daemon start may fail if already running or not installed
          }
        }

        await gatewayClient.connect(DEFAULT_GATEWAY_PORT)
      } finally {
        gatewayConnectInFlight = null
      }
    })()

    return gatewayConnectInFlight
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_DISCONNECT, () => {
    gatewayClient.disconnect()
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_RPC_CALL, async (_e, method: string, params?: unknown) => {
    return gatewayClient.call(method, params)
  })
}

// ---------------------------------------------------------------------------
// Theme change forwarding
// ---------------------------------------------------------------------------

function registerThemeHandler() {
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    mainWindow?.webContents.send(IPC_EVENTS.SYSTEM_THEME_CHANGED, theme)
  })
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(() => {
  registerIpcHandlers()
  registerThemeHandler()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
