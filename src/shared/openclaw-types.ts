/**
 * Curated OpenClaw protocol types for ClawBox.
 * Manually mirrored from OpenClaw source — NOT imported.
 */

export interface ChannelHealthSummary {
  accountId?: string
  configured?: boolean
  linked?: boolean
  lastProbeAt?: number | null
  error?: string
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
