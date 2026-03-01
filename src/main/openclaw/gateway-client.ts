import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import WebSocket from 'ws'
import { BrowserWindow } from 'electron'
import { DEFAULT_GATEWAY_PORT } from '@shared/constants'
import { IPC_EVENTS } from '@shared/ipc-types'
import type { HealthSummary } from '@shared/openclaw-types'

// ---------------------------------------------------------------------------
// Protocol frames
// ---------------------------------------------------------------------------

interface RequestFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

interface ResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: string
}

interface EventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
}

type GatewayFrame = ResponseFrame | EventFrame

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const BASE_BACKOFF_MS = 1000
const REQUEST_TIMEOUT_MS = 30_000

const PROTOCOL_VERSION = 3
const CLIENT_ID = 'gateway-client'
const CLIENT_VERSION = '0.1.0'

// ---------------------------------------------------------------------------
// GatewayClient
// ---------------------------------------------------------------------------

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private retries = 0
  private shouldReconnect = true
  private authenticated = false
  private win: BrowserWindow | null = null
  private port = DEFAULT_GATEWAY_PORT
  private onAuthComplete: (() => void) | null = null
  private onAuthFailed: ((err: Error) => void) | null = null

  setWindow(win: BrowserWindow) {
    this.win = win
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.authenticated
  }

  async connect(port?: number): Promise<void> {
    if (port) this.port = port
    this.shouldReconnect = true
    this.retries = 0
    this.authenticated = false
    return this.doConnect()
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://127.0.0.1:${this.port}`
      const ws = new WebSocket(url)

      // Auth completion callbacks — connect() waits for auth, not just WS open
      this.onAuthComplete = () => resolve()
      this.onAuthFailed = (err) => reject(err)

      const authTimeout = setTimeout(() => {
        this.onAuthComplete = null
        this.onAuthFailed = null
        reject(new Error('Gateway auth handshake timed out'))
        ws.close()
      }, REQUEST_TIMEOUT_MS)

      const cleanupAuth = () => {
        clearTimeout(authTimeout)
        this.onAuthComplete = null
        this.onAuthFailed = null
      }

      ws.on('open', () => {
        this.ws = ws
        this.retries = 0
        // Don't resolve yet — wait for auth handshake
      })

      ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const frame = JSON.parse(raw.toString()) as GatewayFrame
          this.handleFrame(frame)
        } catch {
          // ignore malformed frames
        }
      })

      ws.on('close', () => {
        this.ws = null
        this.authenticated = false
        cleanupAuth()
        this.sendToRenderer(IPC_EVENTS.GATEWAY_DISCONNECTED)
        this.emit('disconnected')
        this.maybeReconnect()
      })

      ws.on('error', (err) => {
        if (!this.ws) {
          cleanupAuth()
          reject(err)
        }
      })
    })
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    // Reject all pending requests
    for (const [id, req] of this.pending) {
      req.reject(new Error('Gateway disconnected'))
      this.pending.delete(id)
    }
  }

  async call(method: string, params?: unknown): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.authenticated) {
      throw new Error('Gateway not connected')
    }

    const id = randomUUID()
    const frame: RequestFrame = { type: 'req', id, method, params }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Gateway RPC timeout: ${method}`))
      }, REQUEST_TIMEOUT_MS)

      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })

      this.ws!.send(JSON.stringify(frame))
    })
  }

  // ---------------------------------------------------------------------------
  // Frame handling
  // ---------------------------------------------------------------------------

  private handleFrame(frame: GatewayFrame) {
    if (frame.type === 'res') {
      const pending = this.pending.get(frame.id)
      if (pending) {
        this.pending.delete(frame.id)
        if (frame.ok) {
          pending.resolve(frame.payload)
        } else {
          pending.reject(new Error(frame.error ?? 'Unknown gateway error'))
        }
      }
    } else if (frame.type === 'event') {
      this.handleEvent(frame)
    }
  }

  private readAuthToken(): string | undefined {
    try {
      const configPath = join(homedir(), '.openclaw', 'openclaw.json')
      const config = JSON.parse(readFileSync(configPath, 'utf8'))
      return config.gateway?.auth?.token
    } catch {
      return undefined
    }
  }

  private handleEvent(frame: EventFrame) {
    if (frame.event === 'connect.challenge') {
      const id = randomUUID()
      const token = this.readAuthToken()
      const authFrame: RequestFrame = {
        type: 'req',
        id,
        method: 'connect',
        params: {
          minProtocol: PROTOCOL_VERSION,
          maxProtocol: PROTOCOL_VERSION,
          client: {
            id: CLIENT_ID,
            version: CLIENT_VERSION,
            platform: process.platform,
            mode: 'backend',
          },
          caps: [],
          role: 'operator',
          scopes: ['operator.admin'],
          auth: token ? { token } : undefined,
        },
      }
      this.ws?.send(JSON.stringify(authFrame))

      this.pending.set(id, {
        resolve: () => {
          this.authenticated = true
          this.sendToRenderer(IPC_EVENTS.GATEWAY_CONNECTED)
          this.emit('connected')
          this.onAuthComplete?.()
          this.onAuthComplete = null
          this.onAuthFailed = null
        },
        reject: (err) => {
          this.onAuthFailed?.(err)
          this.onAuthComplete = null
          this.onAuthFailed = null
        },
      })
    } else if (frame.event === 'health') {
      this.sendToRenderer(IPC_EVENTS.GATEWAY_HEALTH_UPDATE, frame.payload as HealthSummary)
    }
  }

  // ---------------------------------------------------------------------------
  // Reconnection
  // ---------------------------------------------------------------------------

  private maybeReconnect() {
    if (!this.shouldReconnect || this.retries >= MAX_RETRIES) return

    this.retries++
    const delay = BASE_BACKOFF_MS * Math.pow(2, this.retries - 1)

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.doConnect().catch(() => {
          // reconnect will be attempted again via close handler
        })
      }
    }, delay)
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private sendToRenderer(channel: string, ...args: unknown[]) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, ...args)
    }
  }
}

export const gatewayClient = new GatewayClient()
