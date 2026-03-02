import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
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
import { performOAuthLogin, isOAuthSupported, getOAuthProviderIds } from './openclaw/openai-codex-oauth'
import { upsertAuthProfile, applyAuthProfileToConfig, deleteAuthForProvider, saveProviderApiKey, getProviderEndpoints } from './openclaw/auth-store'

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

/** Ensure gateway is installed as a system service (launchd/systemd/schtasks). */
async function ensureGatewayInstalled(): Promise<void> {
  try {
    const result = await openclawCli.exec(['gateway', 'install'], 15_000)
    if (result.exitCode !== 0 && !result.stderr.includes('already installed')) {
      console.log(`[clawbox] gateway install: ${result.stderr}`)
    }
  } catch (err) {
    console.log(`[clawbox] gateway install failed: ${err}`)
  }
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

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_UNINSTALL, async (event) => {
    // Stop and uninstall gateway service before removing openclaw
    gatewayClient.disconnect()
    try { await openclawCli.exec(['gateway', 'stop'], 10_000) } catch { /* ignore */ }
    try { await openclawCli.exec(['gateway', 'uninstall'], 10_000) } catch { /* ignore */ }

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

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_MODELS_STATUS, async () => {
    try {
      const result = await openclawCli.exec(['models', 'status', '--json'])
      if (result.exitCode !== 0) {
        return { defaultModel: null, missingProvidersInUse: [], providersWithOAuth: [], providers: [] }
      }
      const data = JSON.parse(result.stdout)
      const auth = data?.auth ?? {}
      const oauthProviders = auth.oauth?.providers ?? []
      const providers = oauthProviders.map(
        (p: { provider?: string; status?: string; profiles?: unknown[] }) => ({
          provider: p.provider ?? 'unknown',
          status: p.status === 'ok' ? 'ok' : p.status === 'expired' ? 'expired' : 'missing',
          profiles: p.profiles ?? [],
        }),
      )
      // Use the known OAuth-capable providers from pi-ai library
      const providersWithOAuth = getOAuthProviderIds()

      return {
        defaultModel: data?.defaultModel ?? null,
        missingProvidersInUse: auth.missingProvidersInUse ?? [],
        providersWithOAuth,
        providers,
      }
    } catch {
      return { defaultModel: null, missingProvidersInUse: [], providersWithOAuth: [], providers: [] }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.OPENCLAW_MODELS_AUTH_SAVE_TOKEN,
    async (_e, provider: string, token: string, endpoint?: string) => {
      try {
        saveProviderApiKey(provider, token, endpoint)
        return { success: true }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
      }
    },
  )

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_PROVIDER_ENDPOINTS, (_e, provider: string) => {
    return getProviderEndpoints(provider)
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_MODELS_AUTH_DELETE, async (_e, provider: string) => {
    try {
      deleteAuthForProvider(provider)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete' }
    }
  })

  // ─── OAuth Login ──────────────────────────────────────────────────────
  // Prompt reply mechanism: main asks renderer for user input, renderer replies here
  let pendingPromptResolve: ((value: string) => void) | null = null
  let oauthAbortController: AbortController | null = null

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_AUTH_PROMPT_REPLY, (_e, value: string) => {
    if (pendingPromptResolve) {
      pendingPromptResolve(value)
      pendingPromptResolve = null
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_AUTH_OAUTH_CANCEL, () => {
    if (oauthAbortController) {
      oauthAbortController.abort()
      oauthAbortController = null
    }
    // Also resolve any pending prompt so the flow unblocks
    if (pendingPromptResolve) {
      pendingPromptResolve('')
      pendingPromptResolve = null
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_AUTH_OAUTH_LOGIN, async (event, provider: string) => {
    const sendOutput = (msg: string) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_OUTPUT, msg)
      }
    }
    const sendExit = (code: number) => {
      if (!event.sender.isDestroyed()) {
        event.sender.send(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_EXIT, code)
      }
    }

    oauthAbortController = new AbortController()
    const { signal } = oauthAbortController

    try {
      if (!isOAuthSupported(provider)) {
        sendOutput(`OAuth login is not supported for provider: ${provider}\n`)
        sendExit(1)
        return
      }

      const result = await performOAuthLogin(provider, {
        openUrl: (url) => shell.openExternal(url),
        onProgress: sendOutput,
        onPrompt: (message: string, placeholder?: string) => {
          return new Promise<string>((resolve, reject) => {
            pendingPromptResolve = resolve
            signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
            if (!event.sender.isDestroyed()) {
              event.sender.send(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_PROMPT, message, placeholder)
            }
          })
        },
        signal,
      })

      if (!result) {
        sendExit(1)
        return
      }

      // Write credentials to auth-profiles.json
      const profileId = `${provider}:${result.email}`
      upsertAuthProfile(profileId, {
        type: 'oauth',
        provider,
        access: result.access,
        refresh: result.refresh,
        expires: result.expires,
        email: result.email,
      })

      // Update openclaw.json to reference the profile
      applyAuthProfileToConfig(profileId, provider, 'oauth')

      sendOutput('OAuth login successful!\n')
      sendExit(0)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        sendOutput('OAuth login cancelled.\n')
        sendExit(1)
      } else {
        sendOutput(`OAuth error: ${err instanceof Error ? err.message : String(err)}\n`)
        sendExit(1)
      }
    } finally {
      oauthAbortController = null
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_MODELS_LIST, async () => {
    try {
      const result = await openclawCli.exec(['models', 'list', '--all', '--json'])
      if (result.exitCode !== 0) return []
      const data = JSON.parse(result.stdout)
      const models = data.models ?? data
      if (!Array.isArray(models)) return []
      return models.map((m: { key?: string; name?: string; available?: boolean }) => ({
        key: m.key ?? '',
        name: m.name ?? '',
        available: m.available ?? false,
      }))
    } catch {
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_SET_DEFAULT_MODEL, async (_e, model: string) => {
    try {
      const result = await openclawCli.exec(['models', 'set', model])
      if (result.exitCode === 0) {
        return { success: true }
      }
      return { success: false, error: result.stderr || `Exit code ${result.exitCode}` }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  ipcMain.handle(IPC_CHANNELS.OPENCLAW_PLUGINS_ENABLE, async (_e, pluginId: string) => {
    try {
      const result = await openclawCli.exec(['plugins', 'enable', pluginId])
      if (result.exitCode === 0) {
        return { success: true }
      }
      return { success: false, error: result.stderr || `Exit code ${result.exitCode}` }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  })

  // ─── Gateway (managed via `openclaw gateway install/start/stop/restart`) ─
  ipcMain.handle(IPC_CHANNELS.GATEWAY_CONNECT, async () => {
    if (gatewayConnectInFlight) return gatewayConnectInFlight

    gatewayConnectInFlight = (async () => {
      try {
        // 1. If already reachable, just connect the WS client
        const reachable = await probeGateway(DEFAULT_GATEWAY_PORT)
        console.log(`[clawbox] gateway probe port=${DEFAULT_GATEWAY_PORT} reachable=${reachable}`)

        if (reachable) {
          console.log('[clawbox] gateway already running, connecting WS client…')
          await gatewayClient.connect(DEFAULT_GATEWAY_PORT)
          console.log('[clawbox] gateway WS connected')
          return
        }

        // 2. Ensure config prerequisites
        ensureGatewayMode()

        // 3. Ensure gateway is installed as a system service
        console.log('[clawbox] installing gateway service…')
        await ensureGatewayInstalled()

        // 4. Start via service manager (launchd/systemd/schtasks)
        console.log('[clawbox] starting gateway service…')
        const startResult = await openclawCli.exec(['gateway', 'start'], 15_000)
        console.log(`[clawbox] gateway start exit=${startResult.exitCode} stdout=${startResult.stdout.slice(0, 200)} stderr=${startResult.stderr.slice(0, 200)}`)

        if (!await waitForGateway(DEFAULT_GATEWAY_PORT, 20_000)) {
          throw new Error(
            'Gateway did not start within 20s. Check ~/.openclaw/logs/gateway.err.log',
          )
        }

        console.log('[clawbox] gateway port reachable, connecting WS…')
        await gatewayClient.connect(DEFAULT_GATEWAY_PORT)
        console.log('[clawbox] gateway WS connected')
      } catch (err) {
        console.error('[clawbox] GATEWAY_CONNECT error:', err)
        throw err
      } finally {
        gatewayConnectInFlight = null
      }
    })()

    return gatewayConnectInFlight
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_DISCONNECT, () => {
    gatewayClient.disconnect()
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_STOP, async () => {
    gatewayClient.disconnect()
    await openclawCli.exec(['gateway', 'stop'], 15_000)
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_RESTART, async () => {
    gatewayClient.disconnect()
    await openclawCli.exec(['gateway', 'restart'], 15_000)

    // Give the gateway process time to shut down before probing
    await new Promise((r) => setTimeout(r, 3000))

    if (!await waitForGateway(DEFAULT_GATEWAY_PORT, 30_000)) {
      throw new Error('Gateway did not restart within 30s')
    }

    await gatewayClient.connect(DEFAULT_GATEWAY_PORT)
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_RPC_CALL, async (_e, method: string, params?: unknown) => {
    return gatewayClient.call(method, params)
  })

  ipcMain.handle(IPC_CHANNELS.GATEWAY_AUTH_TOKEN, () => {
    try {
      const configPath = join(homedir(), '.openclaw', 'openclaw.json')
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      return config.gateway?.auth?.token ?? null
    } catch {
      return null
    }
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
  // Disconnect WS client — gateway service keeps running independently
  gatewayClient.disconnect()
})
