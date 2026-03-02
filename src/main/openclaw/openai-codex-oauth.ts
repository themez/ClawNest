import { createHash, randomBytes, randomUUID } from 'node:crypto'

export interface OAuthResult {
  access: string
  refresh: string
  expires: number
  email: string
}

/**
 * All OAuth providers supported by clawbox.
 * pi-ai providers + device-code providers implemented here.
 */
const SUPPORTED_OAUTH_PROVIDERS = new Set([
  'openai-codex',
  'anthropic',
  'github-copilot',
  'google-gemini-cli',
  'antigravity',
  'minimax-portal',
  'qwen-portal',
])

export function isOAuthSupported(provider: string): boolean {
  return SUPPORTED_OAUTH_PROVIDERS.has(provider)
}

export function getOAuthProviderIds(): string[] {
  return Array.from(SUPPORTED_OAUTH_PROVIDERS)
}

/* ================================================================== */
/*  Shared helpers for device-code OAuth flows                         */
/* ================================================================== */

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }, { once: true })
  })
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

function toFormUrlEncoded(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

function generatePkce(): { verifier: string; challenge: string; state: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('base64url')
  return { verifier, challenge, state }
}

/* ================================================================== */
/*  MiniMax Portal OAuth (device code flow)                            */
/* ================================================================== */

const MINIMAX_OAUTH_CONFIG = {
  cn: {
    baseUrl: 'https://api.minimaxi.com',
    clientId: '78257093-7e40-4613-99e0-527b14b39113',
  },
  global: {
    baseUrl: 'https://api.minimax.io',
    clientId: '78257093-7e40-4613-99e0-527b14b39113',
  },
} as const

async function loginMiniMaxPortal(
  params: {
    openUrl: (url: string) => Promise<void>
    onProgress: (msg: string) => void
    onPrompt: (message: string, placeholder?: string) => Promise<string>
    signal?: AbortSignal
  },
  region: 'cn' | 'global' = 'global',
): Promise<{ access: string; refresh: string; expires: number }> {
  const config = MINIMAX_OAUTH_CONFIG[region]
  const { verifier, challenge, state } = generatePkce()

  // Request device code
  const codeRes = await fetch(`${config.baseUrl}/oauth/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'x-request-id': randomUUID(),
    },
    body: toFormUrlEncoded({
      response_type: 'code',
      client_id: config.clientId,
      scope: 'group_id profile model.completion',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
    }),
  })

  if (!codeRes.ok) throw new Error(`MiniMax authorization failed: ${await codeRes.text()}`)
  const oauth = (await codeRes.json()) as {
    user_code: string
    verification_uri: string
    expired_in: number
    interval?: number
    state: string
  }

  if (oauth.state !== state) throw new Error('MiniMax OAuth state mismatch')

  params.onProgress(`Verification URL: ${oauth.verification_uri}\n`)
  params.onProgress(`Your code: ${oauth.user_code}\n`)
  await params.onPrompt(
    `Your verification code is: ${oauth.user_code}\nCopy this code, then click Submit to open the browser.`,
    oauth.user_code,
  )
  try {
    await params.openUrl(oauth.verification_uri)
  } catch {
    /* browser open failed, user can copy URL */
  }

  // Poll for token
  let pollMs = oauth.interval ?? 2000
  while (Date.now() < oauth.expired_in) {
    throwIfAborted(params.signal)
    params.onProgress('Waiting for MiniMax OAuth approval…\n')
    const tokenRes = await fetch(`${config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: toFormUrlEncoded({
        grant_type: 'urn:ietf:params:oauth:grant-type:user_code',
        client_id: config.clientId,
        user_code: oauth.user_code,
        code_verifier: verifier,
      }),
    })

    const text = await tokenRes.text()
    let payload: Record<string, unknown> = {}
    try {
      payload = JSON.parse(text) as Record<string, unknown>
    } catch {
      /* ignore */
    }

    if (tokenRes.ok && payload.status === 'success' && payload.access_token) {
      return {
        access: payload.access_token as string,
        refresh: payload.refresh_token as string,
        expires: payload.expired_in as number,
      }
    }

    if (payload.status === 'error') {
      throw new Error(`MiniMax OAuth failed: ${(payload.base_resp as Record<string, unknown>)?.status_msg ?? text}`)
    }

    pollMs = Math.min(pollMs * 1.5, 10000)
    await abortableSleep(pollMs, params.signal)
  }

  throw new Error('MiniMax OAuth timed out waiting for authorization.')
}

/* ================================================================== */
/*  Qwen Portal OAuth (device code flow, RFC 8628)                     */
/* ================================================================== */

const QWEN_BASE = 'https://chat.qwen.ai'
const QWEN_CLIENT_ID = 'f0304373b74a44d2b584a3fb70ca9e56'

async function loginQwenPortal(params: {
  openUrl: (url: string) => Promise<void>
  onProgress: (msg: string) => void
  onPrompt: (message: string, placeholder?: string) => Promise<string>
  signal?: AbortSignal
}): Promise<{ access: string; refresh: string; expires: number }> {
  const { verifier, challenge } = generatePkce()

  // Request device code
  const codeRes = await fetch(`${QWEN_BASE}/api/v1/oauth2/device/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'x-request-id': randomUUID(),
    },
    body: toFormUrlEncoded({
      client_id: QWEN_CLIENT_ID,
      scope: 'openid profile email model.completion',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }),
  })

  if (!codeRes.ok) throw new Error(`Qwen device authorization failed: ${await codeRes.text()}`)
  const device = (await codeRes.json()) as {
    device_code: string
    user_code: string
    verification_uri: string
    verification_uri_complete?: string
    expires_in: number
    interval?: number
  }

  const verificationUrl = device.verification_uri_complete || device.verification_uri
  params.onProgress(`Verification URL: ${verificationUrl}\n`)
  params.onProgress(`Your code: ${device.user_code}\n`)
  await params.onPrompt(
    `Your verification code is: ${device.user_code}\nCopy this code, then click Submit to open the browser.`,
    device.user_code,
  )
  try {
    await params.openUrl(verificationUrl)
  } catch {
    /* browser open failed */
  }

  // Poll for token
  const start = Date.now()
  let pollMs = device.interval ? device.interval * 1000 : 2000
  const timeoutMs = device.expires_in * 1000

  while (Date.now() - start < timeoutMs) {
    throwIfAborted(params.signal)
    params.onProgress('Waiting for Qwen OAuth approval…\n')
    const tokenRes = await fetch(`${QWEN_BASE}/api/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: toFormUrlEncoded({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: QWEN_CLIENT_ID,
        device_code: device.device_code,
        code_verifier: verifier,
      }),
    })

    if (tokenRes.ok) {
      const t = (await tokenRes.json()) as Record<string, unknown>
      if (t.access_token && t.refresh_token && t.expires_in) {
        return {
          access: t.access_token as string,
          refresh: t.refresh_token as string,
          expires: Date.now() + (t.expires_in as number) * 1000,
        }
      }
    } else {
      let payload: { error?: string; error_description?: string } | undefined
      try {
        payload = (await tokenRes.json()) as typeof payload
      } catch {
        /* ignore */
      }
      if (payload?.error === 'slow_down') {
        pollMs = Math.min(pollMs * 1.5, 10000)
      } else if (payload?.error !== 'authorization_pending') {
        throw new Error(`Qwen OAuth failed: ${payload?.error_description || payload?.error || tokenRes.statusText}`)
      }
    }

    await abortableSleep(pollMs, params.signal)
  }

  throw new Error('Qwen OAuth timed out waiting for authorization.')
}

/* ================================================================== */
/*  Main entry point                                                   */
/* ================================================================== */

/**
 * Run the OAuth flow for a given provider.
 * Uses dynamic import() for @mariozechner/pi-ai (ESM-only).
 * Device-code providers (minimax, qwen) are implemented natively.
 */
export async function performOAuthLogin(
  provider: string,
  params: {
    openUrl: (url: string) => Promise<void>
    onProgress: (msg: string) => void
    onPrompt: (message: string, placeholder?: string) => Promise<string>
    signal?: AbortSignal
  },
): Promise<OAuthResult | null> {
  if (!SUPPORTED_OAUTH_PROVIDERS.has(provider)) {
    params.onProgress(`OAuth login is not supported for provider: ${provider}\n`)
    return null
  }

  try {
    throwIfAborted(params.signal)
    let creds: { access: string; refresh: string; expires: number; [k: string]: unknown }

    switch (provider) {
      /* ── pi-ai providers ─────────────────────────────────────── */

      case 'openai-codex': {
        const m = await import('@mariozechner/pi-ai')
        creds = await m.loginOpenAICodex({
          onAuth: ({ url }) => {
            params.onProgress('Opening browser for authorization...\n')
            params.openUrl(url)
          },
          onPrompt: async (prompt) => {
            return params.onPrompt(prompt.message, prompt.placeholder)
          },
          onProgress: (message) => {
            params.onProgress(message + '\n')
          },
        })
        break
      }

      case 'anthropic': {
        const m = await import('@mariozechner/pi-ai')
        creds = await m.loginAnthropic(
          (url: string) => {
            params.onProgress('Opening browser for Anthropic authorization...\n')
            params.openUrl(url)
          },
          async () => {
            return params.onPrompt(
              'Paste the authorization code from the browser (format: code#state):',
              'code#state',
            )
          },
        )
        break
      }

      case 'github-copilot': {
        const m = await import('@mariozechner/pi-ai')
        creds = await m.loginGitHubCopilot({
          onAuth: (url: string, instructions?: string) => {
            // Device-code flow: show code and wait for user confirmation before opening browser
            ;(async () => {
              if (instructions) {
                params.onProgress(instructions + '\n')
                await params.onPrompt(
                  `${instructions}\nCopy the code above, then click Submit to open the browser.`,
                )
              }
              params.onProgress('Opening browser for GitHub Copilot authorization...\n')
              params.openUrl(url)
            })()
          },
          onPrompt: async (prompt: { message: string; placeholder?: string }) => {
            return params.onPrompt(prompt.message, prompt.placeholder)
          },
          onProgress: (message: string) => {
            params.onProgress(message + '\n')
          },
        })
        break
      }

      case 'google-gemini-cli': {
        const m = await import('@mariozechner/pi-ai')
        creds = await m.loginGeminiCli(
          (info: { url: string; instructions?: string }) => {
            params.onProgress('Opening browser for Google Gemini CLI authorization...\n')
            if (info.instructions) params.onProgress(info.instructions + '\n')
            params.openUrl(info.url)
          },
          (message: string) => {
            params.onProgress(message + '\n')
          },
        )
        break
      }

      case 'antigravity': {
        const m = await import('@mariozechner/pi-ai')
        creds = await m.loginAntigravity(
          (info: { url: string; instructions?: string }) => {
            params.onProgress('Opening browser for Antigravity authorization...\n')
            if (info.instructions) params.onProgress(info.instructions + '\n')
            params.openUrl(info.url)
          },
          (message: string) => {
            params.onProgress(message + '\n')
          },
        )
        break
      }

      /* ── Device-code providers (native implementation) ───────── */

      case 'minimax-portal': {
        creds = await loginMiniMaxPortal({
          openUrl: params.openUrl,
          onProgress: params.onProgress,
          onPrompt: params.onPrompt,
          signal: params.signal,
        })
        break
      }

      case 'qwen-portal': {
        creds = await loginQwenPortal({
          openUrl: params.openUrl,
          onProgress: params.onProgress,
          onPrompt: params.onPrompt,
          signal: params.signal,
        })
        break
      }

      default:
        params.onProgress(`Unsupported OAuth provider: ${provider}\n`)
        return null
    }

    const email = (creds.email as string) ?? 'unknown'
    return {
      access: creds.access,
      refresh: creds.refresh,
      expires: creds.expires,
      email,
    }
  } catch (err) {
    params.onProgress(`OAuth error: ${err instanceof Error ? err.message : String(err)}\n`)
    return null
  }
}
