import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { spawn, type ChildProcess } from 'node:child_process'
import { createConnection } from 'node:net'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
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
let gatewayProcess: ChildProcess | null = null

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

/** Poll gateway port until reachable or timeout. */
async function waitForGateway(port: number, maxWaitMs = 20_000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    if (await probeGateway(port)) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

/** Ensure gateway.mode is set in openclaw config so gateway can start. */
function ensureGatewayMode(): void {
  const configPath = join(homedir(), '.openclaw', 'openclaw.json')
  if (!existsSync(configPath)) return

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8'))
    if (!config.gateway?.mode) {
      config.gateway = config.gateway || {}
      config.gateway.mode = 'local'
      writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
    }
  } catch {
    // Config not parseable — skip
  }
}

/** Start gateway as a foreground child process. */
function startGatewayProcess(port: number): void {
  if (gatewayProcess) return // already running

  const child = spawn('openclaw', ['gateway', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })

  child.on('exit', (code) => {
    console.log(`[clawbox] gateway process exited (code ${code})`)
    if (gatewayProcess === child) gatewayProcess = null
  })
  child.on('error', () => {
    if (gatewayProcess === child) gatewayProcess = null
  })

  // Prevent parent from waiting on detached child
  child.unref()
  gatewayProcess = child
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
        // 1. Check if gateway is already reachable
        if (await probeGateway(DEFAULT_GATEWAY_PORT)) {
          await gatewayClient.connect(DEFAULT_GATEWAY_PORT)
          return
        }

        // 2. Ensure gateway.mode is set (required by OpenClaw)
        ensureGatewayMode()

        // 3. Try daemon start first (preferred — survives app exit)
        try {
          const result = await openclawCli.exec(['daemon', 'start'], 10_000)
          if (result.exitCode === 0) {
            // daemon start succeeded, wait for gateway to bind
            if (await waitForGateway(DEFAULT_GATEWAY_PORT, 20_000)) {
              await gatewayClient.connect(DEFAULT_GATEWAY_PORT)
              return
            }
          }
        } catch {
          // daemon start failed — fall through to direct start
        }

        // 4. Fallback: start gateway as a child process
        if (!await probeGateway(DEFAULT_GATEWAY_PORT)) {
          startGatewayProcess(DEFAULT_GATEWAY_PORT)

          if (!await waitForGateway(DEFAULT_GATEWAY_PORT, 20_000)) {
            throw new Error(
              'Gateway did not start within 20s. Check ~/.openclaw/logs/gateway.err.log',
            )
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

app.on('will-quit', () => {
  // Clean up gateway child process if we spawned one
  if (gatewayProcess) {
    try {
      gatewayProcess.kill()
    } catch {
      // already dead
    }
    gatewayProcess = null
  }
})
