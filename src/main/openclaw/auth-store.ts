import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const AUTH_PROFILES_PATH = join(homedir(), '.openclaw', 'agents', 'main', 'agent', 'auth-profiles.json')
const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json')

export interface OAuthCredential {
  type: 'oauth'
  provider: string
  access: string
  refresh: string
  expires: number
  email: string
}

export interface ApiKeyCredential {
  type: 'api_key'
  provider: string
  key: string
}

export interface TokenCredential {
  type: 'token'
  provider: string
  token: string
}

export type AuthCredential = OAuthCredential | ApiKeyCredential | TokenCredential

interface AuthProfilesFile {
  version: number
  profiles: Record<string, AuthCredential>
}

function readJson(path: string): unknown {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path: string, data: unknown): void {
  const dir = join(path, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

/* ================================================================== */
/*  Provider config definitions                                        */
/* ================================================================== */

interface ProviderConfig {
  api: string
  baseUrl: string
  models: { id: string; name: string; reasoning?: boolean; input?: string[]; contextWindow?: number; maxTokens?: number }[]
  defaultModelRef: string
  alias: string
}

interface EndpointVariant {
  label: string
  value: string
}

interface ProviderMeta {
  profileId: string
  config: ProviderConfig | ((endpoint?: string) => ProviderConfig)
  endpoints?: EndpointVariant[]
}

function moonshotConfig(baseUrl: string): ProviderConfig {
  return {
    api: 'openai-completions',
    baseUrl,
    models: [
      { id: 'kimi-k2.5', name: 'Kimi K2.5', reasoning: false, input: ['text', 'image'], contextWindow: 256000, maxTokens: 8192 },
    ],
    defaultModelRef: 'moonshot/kimi-k2.5',
    alias: 'Kimi',
  }
}

function zaiConfig(endpoint?: string): ProviderConfig {
  const baseUrlMap: Record<string, string> = {
    'coding-global': 'https://api.z.ai/api/coding/paas/v4',
    'coding-cn': 'https://open.bigmodel.cn/api/coding/paas/v4',
    'global': 'https://api.z.ai/api/paas/v4',
    'cn': 'https://open.bigmodel.cn/api/paas/v4',
  }
  return {
    api: 'openai-completions',
    baseUrl: baseUrlMap[endpoint ?? 'global'] ?? baseUrlMap['global'],
    models: [
      { id: 'glm-5', name: 'GLM-5', reasoning: true, contextWindow: 204800, maxTokens: 131072 },
      { id: 'glm-4.7', name: 'GLM-4.7', reasoning: true, contextWindow: 204800, maxTokens: 131072 },
      { id: 'glm-4.7-flash', name: 'GLM-4.7 Flash', reasoning: true, contextWindow: 204800, maxTokens: 131072 },
      { id: 'glm-4.7-flashx', name: 'GLM-4.7 FlashX', reasoning: true, contextWindow: 204800, maxTokens: 131072 },
    ],
    defaultModelRef: 'zai/glm-5',
    alias: 'GLM',
  }
}

/**
 * Providers that need explicit config (baseUrl, api, models) in openclaw.json.
 * Providers NOT listed here (anthropic, openai, google, etc.) work with just a credential.
 */
const PROVIDER_META: Record<string, ProviderMeta> = {
  'moonshot': {
    profileId: 'moonshot:default',
    config: (endpoint) => moonshotConfig(
      endpoint === 'cn' ? 'https://api.moonshot.cn/v1' : 'https://api.moonshot.ai/v1',
    ),
    endpoints: [
      { label: 'Global (.ai)', value: 'global' },
      { label: 'China (.cn)', value: 'cn' },
    ],
  },
  'kimi-coding': {
    profileId: 'kimi-coding:default',
    config: {
      api: 'anthropic-messages',
      baseUrl: 'https://api.kimi.com/coding/',
      models: [
        { id: 'k2p5', name: 'Kimi for Coding', reasoning: false, contextWindow: 256000, maxTokens: 8192 },
      ],
      defaultModelRef: 'kimi-coding/k2p5',
      alias: 'Kimi for Coding',
    },
  },
  'zai': {
    profileId: 'zai:default',
    config: zaiConfig,
    endpoints: [
      { label: 'Global', value: 'global' },
      { label: 'China', value: 'cn' },
      { label: 'Coding Global', value: 'coding-global' },
      { label: 'Coding China', value: 'coding-cn' },
    ],
  },
  'mistral': {
    profileId: 'mistral:default',
    config: {
      api: 'openai-completions',
      baseUrl: 'https://api.mistral.ai/v1',
      models: [
        { id: 'mistral-large-latest', name: 'Mistral Large', reasoning: false, input: ['text', 'image'], contextWindow: 262144, maxTokens: 262144 },
      ],
      defaultModelRef: 'mistral/mistral-large-latest',
      alias: 'Mistral',
    },
  },
  'xai': {
    profileId: 'xai:default',
    config: {
      api: 'openai-completions',
      baseUrl: 'https://api.x.ai/v1',
      models: [
        { id: 'grok-4', name: 'Grok 4', reasoning: false, contextWindow: 131072, maxTokens: 8192 },
      ],
      defaultModelRef: 'xai/grok-4',
      alias: 'Grok',
    },
  },
  'xiaomi': {
    profileId: 'xiaomi:default',
    config: {
      api: 'openai-completions',
      baseUrl: 'https://api.open.xaiomi.com/v1',
      models: [
        { id: 'mimo-v2-flash', name: 'MiMo v2 Flash', reasoning: false, contextWindow: 131072, maxTokens: 8192 },
      ],
      defaultModelRef: 'xiaomi/mimo-v2-flash',
      alias: 'Xiaomi',
    },
  },
  'qianfan': {
    profileId: 'qianfan:default',
    config: {
      api: 'openai-completions',
      baseUrl: 'https://qianfan.baidubce.com/v2',
      models: [
        { id: 'ernie-x1-turbo-32k', name: 'ERNIE X1 Turbo', reasoning: true, contextWindow: 32768, maxTokens: 8192 },
      ],
      defaultModelRef: 'qianfan/ernie-x1-turbo-32k',
      alias: 'QIANFAN',
    },
  },
}

/**
 * Get endpoint variants for a provider (if any).
 */
export function getProviderEndpoints(provider: string): EndpointVariant[] | null {
  return PROVIDER_META[provider]?.endpoints ?? null
}

/**
 * Save an API key for a provider, writing both credential and provider config.
 * This replaces the `openclaw models auth paste-token` CLI approach.
 */
export function saveProviderApiKey(
  provider: string,
  apiKey: string,
  endpoint?: string,
): void {
  const meta = PROVIDER_META[provider]
  const profileId = meta?.profileId ?? `${provider}:default`

  // 1. Write credential to auth-profiles.json
  upsertAuthProfile(profileId, {
    type: 'api_key',
    provider,
    key: apiKey,
  })

  // 2. Write auth profile reference to openclaw.json
  applyAuthProfileToConfig(profileId, provider, 'api_key')

  // 3. If provider has config, write provider config (baseUrl, api, models) to openclaw.json
  if (meta) {
    const providerConfig = typeof meta.config === 'function'
      ? meta.config(endpoint)
      : meta.config

    const config = (readJson(CONFIG_PATH) as Record<string, unknown>) ?? {}

    // models.providers.<providerId>
    const models = (config.models as Record<string, unknown>) ?? {}
    const providers = (models.providers as Record<string, unknown>) ?? {}
    const existing = (providers[provider] as Record<string, unknown>) ?? {}
    const existingModels = Array.isArray(existing.models) ? existing.models : []

    // Merge models: keep existing, add defaults that aren't already there
    const seenIds = new Set(existingModels.map((m: { id?: string }) => m.id))
    const mergedModels = [...existingModels]
    for (const model of providerConfig.models) {
      if (!seenIds.has(model.id)) {
        mergedModels.push(model)
      }
    }

    providers[provider] = {
      ...existing,
      baseUrl: providerConfig.baseUrl,
      api: providerConfig.api,
      models: mergedModels.length > 0 ? mergedModels : providerConfig.models,
    }
    models.providers = providers
    if (!models.mode) models.mode = 'merge'
    config.models = models

    // agents.defaults.models.<modelRef>.alias
    const agents = (config.agents as Record<string, unknown>) ?? {}
    const defaults = (agents.defaults as Record<string, unknown>) ?? {}
    const agentModels = (defaults.models as Record<string, Record<string, unknown>>) ?? {}
    if (!agentModels[providerConfig.defaultModelRef]) {
      agentModels[providerConfig.defaultModelRef] = {}
    }
    if (!agentModels[providerConfig.defaultModelRef].alias) {
      agentModels[providerConfig.defaultModelRef].alias = providerConfig.alias
    }
    defaults.models = agentModels
    agents.defaults = defaults
    config.agents = agents

    writeJson(CONFIG_PATH, config)
  }
}

/**
 * Write or update a credential in ~/.openclaw/agents/main/agent/auth-profiles.json
 */
export function upsertAuthProfile(profileId: string, credential: AuthCredential): void {
  const existing = readJson(AUTH_PROFILES_PATH) as AuthProfilesFile | null
  const file: AuthProfilesFile = existing ?? { version: 1, profiles: {} }
  file.profiles[profileId] = credential
  writeJson(AUTH_PROFILES_PATH, file)
}

/**
 * Update the auth section of ~/.openclaw/openclaw.json to reference the profile.
 */
export function applyAuthProfileToConfig(
  profileId: string,
  provider: string,
  mode: 'oauth' | 'token' | 'api_key',
): void {
  const existing = (readJson(CONFIG_PATH) as Record<string, unknown>) ?? {}
  const auth = (existing.auth as Record<string, unknown>) ?? {}
  const profiles = (auth.profiles as Record<string, unknown>) ?? {}
  const order = (auth.order as Record<string, string[]>) ?? {}

  profiles[profileId] = { provider, mode }

  // Ensure the profile is in the provider's order list
  const providerOrder = order[provider] ?? []
  if (!providerOrder.includes(profileId)) {
    providerOrder.push(profileId)
  }
  order[provider] = providerOrder

  auth.profiles = profiles
  auth.order = order
  existing.auth = auth

  writeJson(CONFIG_PATH, existing)
}

/**
 * Delete all auth profiles for a provider and remove from config.
 */
export function deleteAuthForProvider(provider: string): void {
  // Remove matching profiles from auth-profiles.json
  const profilesFile = readJson(AUTH_PROFILES_PATH) as AuthProfilesFile | null
  if (profilesFile) {
    for (const id of Object.keys(profilesFile.profiles)) {
      if (profilesFile.profiles[id].provider === provider) {
        delete profilesFile.profiles[id]
      }
    }
    writeJson(AUTH_PROFILES_PATH, profilesFile)
  }

  // Remove from openclaw.json config
  const config = (readJson(CONFIG_PATH) as Record<string, unknown>) ?? {}
  const auth = (config.auth as Record<string, unknown>) ?? {}
  const profiles = (auth.profiles as Record<string, unknown>) ?? {}
  const order = (auth.order as Record<string, string[]>) ?? {}

  // Remove profile entries that reference this provider
  for (const id of Object.keys(profiles)) {
    const p = profiles[id] as Record<string, unknown>
    if (p?.provider === provider) {
      delete profiles[id]
    }
  }
  delete order[provider]

  auth.profiles = profiles
  auth.order = order
  config.auth = auth
  writeJson(CONFIG_PATH, config)
}
