/**
 * Curated OpenClaw protocol types for ClawBox.
 * Manually mirrored from OpenClaw source — NOT imported.
 */

export interface GatewayStatus {
  running: boolean
  port: number
  pid?: number
  uptime?: number
  url?: string
}

export interface StatusSummary {
  gateway: GatewayStatus
  daemon?: {
    installed: boolean
    type?: 'launchd' | 'systemd' | 'pm2' | 'none'
    running?: boolean
  }
  channels: Record<string, ChannelHealthSummary>
  version?: string
  nodeVersion?: string
}

export interface ChannelHealthSummary {
  accountId?: string
  configured?: boolean
  linked?: boolean
  lastProbeAt?: number | null
  error?: string
}

export interface AgentHeartbeatSummary {
  agentId?: string
  name?: string
  lastSeenMs?: number
  sessions?: number
}

export interface HealthSummary {
  ok: boolean
  ts: number
  channels: Record<string, ChannelHealthSummary>
  channelOrder?: string[]
  channelLabels?: Record<string, string>
  agents?: Record<string, AgentHeartbeatSummary>
  sessions?: number
}

export interface EnvironmentInfo {
  nodeInstalled: boolean
  nodeVersion?: string
  nodePath?: string
  openclawInstalled: boolean
  openclawVersion?: string
  gatewayRunning: boolean
  gatewayPort?: number
  daemonInstalled: boolean
  daemonType?: string | null
}
