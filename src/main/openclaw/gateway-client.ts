import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
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

const CLIENT_ID = 'clawbox'
const CLIENT_DISPLAY_NAME = 'ClawBox'
const CLIENT_VERSION = '0.1.0'

// ---------------------------------------------------------------------------
// GatewayClient
// ---------------------------------------------------------------------------

export class GatewayClient extends EventEmitter {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRequest>()
  private retries = 0
  private shouldReconnect = true
  private win: BrowserWindow | null = null
  private port = DEFAULT_GATEWAY_PORT

  setWindow(win: BrowserWindow) {
    this.win = win
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async connect(port?: number): Promise<void> {
    if (port) this.port = port
    this.shouldReconnect = true
    this.retries = 0
    return this.doConnect()
  }

  private doConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://127.0.0.1:${this.port}`
      const ws = new WebSocket(url)

      ws.on('open', () => {
        this.ws = ws
        this.retries = 0
        resolve()
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
        this.sendToRenderer(IPC_EVENTS.GATEWAY_DISCONNECTED)
        this.emit('disconnected')
        this.maybeReconnect()
      })

      ws.on('error', (err) => {
        if (!this.ws) {
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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

  private handleEvent(frame: EventFrame) {
    if (frame.event === 'connect.challenge') {
      // Respond to authentication challenge
      const id = randomUUID()
      const authFrame: RequestFrame = {
        type: 'req',
        id,
        method: 'connect',
        params: {
          clientId: CLIENT_ID,
          displayName: CLIENT_DISPLAY_NAME,
          version: CLIENT_VERSION,
          nonce: (frame.payload as { nonce?: string })?.nonce,
        },
      }
      this.ws?.send(JSON.stringify(authFrame))

      // Wait for response to mark as connected
      this.pending.set(id, {
        resolve: () => {
          this.sendToRenderer(IPC_EVENTS.GATEWAY_CONNECTED)
          this.emit('connected')
        },
        reject: () => {
          // Auth failed
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
