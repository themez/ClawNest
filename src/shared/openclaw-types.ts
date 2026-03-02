/**
 * Curated OpenClaw protocol types for ClawNest.
 * Manually mirrored from OpenClaw source — NOT imported.
 */

export interface ChannelProbe {
  ok: boolean
  status?: string | null
  error?: string | null
  elapsedMs?: number
  bot?: {
    id: number
    username: string
    canJoinGroups?: boolean
    canReadAllGroupMessages?: boolean
    supportsInlineQueries?: boolean
  }
  webhook?: {
    url: string
    hasCustomCert: boolean
  }
}

export interface ChannelHealthSummary {
  accountId?: string
  configured?: boolean
  running?: boolean
  linked?: boolean
  probe?: ChannelProbe
  lastProbeAt?: number | null
  lastStartAt?: number | null
  lastStopAt?: number | null
  lastError?: string | null
  error?: string
  tokenSource?: string
  mode?: string | null
  accounts?: Record<string, ChannelHealthSummary>
}

export interface AgentHeartbeatSummary {
  agentId: string
  isDefault?: boolean
  heartbeat?: {
    enabled: boolean
    every: string
    everyMs: number
  }
  sessions?: {
    path: string
    count: number
    recent: SessionInfo[]
  }
}

export interface SessionInfo {
  key: string
  agentId?: string
  kind?: string
  sessionId?: string
  updatedAt: number
  age: number
  model?: string
  contextTokens?: number
  percentUsed?: number
  totalTokens?: number
  remainingTokens?: number
}

export interface HealthSummary {
  ok: boolean
  ts: number
  durationMs?: number
  channels: Record<string, ChannelHealthSummary>
  channelOrder?: string[]
  channelLabels?: Record<string, string>
  heartbeatSeconds?: number
  defaultAgentId?: string
  agents?: AgentHeartbeatSummary[]
  sessions?: {
    path: string
    count: number
    recent: SessionInfo[]
  }
}

export interface StatusSummary {
  heartbeat?: {
    defaultAgentId: string
    agents: {
      agentId: string
      enabled: boolean
      every: string
      everyMs: number
    }[]
  }
  channelSummary?: unknown[]
  queuedSystemEvents?: unknown[]
  sessions?: {
    paths: string[]
    count: number
    defaults?: {
      model: string
      contextTokens: number
    }
    recent: SessionInfo[]
    byAgent?: {
      agentId: string
      path: string
      count: number
      recent: SessionInfo[]
    }[]
  }
}

export interface AuthProfile {
  profileId: string
  provider: string
  type: 'token' | 'oauth' | 'apiKey'
  status: string
  label: string
}

export interface AuthProviderStatus {
  provider: string
  status: 'ok' | 'missing' | 'expired'
  profiles: AuthProfile[]
}

export interface ModelsAuthStatus {
  defaultModel: string | null
  missingProvidersInUse: string[]
  providersWithOAuth: string[]
  providers: AuthProviderStatus[]
}

export interface ConfiguredChannelInfo {
  id: string
  accountId: string
  name?: string
  configured: boolean
}

export interface EnvironmentInfo {
  nodeInstalled: boolean
  nodeVersion?: string
  nodePath?: string
  openclawInstalled: boolean
  openclawVersion?: string
  openclawPath?: string
  gatewayRunning: boolean
  gatewayPort?: number
  daemonInstalled: boolean
  daemonType?: string | null
}
