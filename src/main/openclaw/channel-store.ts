import { join } from 'node:path'
import { homedir } from 'node:os'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const CONFIG_PATH = join(homedir(), '.openclaw', 'openclaw.json')

function readJson(path: string): unknown {
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path: string, data: unknown): void {
  const dir = join(path, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n')
}

export interface ConfiguredChannel {
  id: string
  accountId: string
  name?: string
  configured: boolean
}

/**
 * Read all configured channels from ~/.openclaw/openclaw.json.
 *
 * OpenClaw config format:
 * {
 *   channels: {
 *     telegram: {
 *       enabled: true,
 *       accounts: {
 *         default: { enabled: true, botToken: "...", dmPolicy: "pairing", ... }
 *       }
 *     }
 *   }
 * }
 */
export function getConfiguredChannels(): ConfiguredChannel[] {
  const config = readJson(CONFIG_PATH) as Record<string, unknown> | null
  if (!config) return []

  const channels = config.channels as Record<string, unknown> | undefined
  if (!channels) return []

  const result: ConfiguredChannel[] = []
  for (const [channelId, channelConfig] of Object.entries(channels)) {
    if (!channelConfig || typeof channelConfig !== 'object') continue
    const ch = channelConfig as Record<string, unknown>

    // Only look at the `accounts` sub-key — other keys (enabled, dmPolicy, etc.) are channel-level config
    const accounts = ch.accounts as Record<string, unknown> | undefined
    if (accounts && typeof accounts === 'object') {
      for (const [accountId, accountConfig] of Object.entries(accounts)) {
        if (!accountConfig || typeof accountConfig !== 'object') continue
        const acc = accountConfig as Record<string, unknown>
        result.push({
          id: channelId,
          accountId,
          name: acc.name as string | undefined,
          configured: true,
        })
      }
    } else if (ch.enabled) {
      // Channel enabled but no accounts sub-key — show as single default entry
      result.push({
        id: channelId,
        accountId: 'default',
        configured: true,
      })
    }
  }
  return result
}

/**
 * Save a channel configuration to ~/.openclaw/openclaw.json.
 *
 * This mirrors `openclaw channels add` by:
 * 1. Enabling the channel plugin in plugins.entries
 * 2. Setting channel-level config (enabled, dmPolicy, etc.)
 * 3. Writing account-level config under channels.<id>.accounts.<accountId>
 */
export function saveChannelConfig(
  channelId: string,
  accountId: string,
  channelConfig: Record<string, string>,
): void {
  const config = (readJson(CONFIG_PATH) as Record<string, unknown>) ?? {}

  // 1. Enable the plugin
  const plugins = (config.plugins as Record<string, unknown>) ?? {}
  const entries = (plugins.entries as Record<string, unknown>) ?? {}
  const pluginEntry = (entries[channelId] as Record<string, unknown>) ?? {}
  pluginEntry.enabled = true
  entries[channelId] = pluginEntry
  plugins.entries = entries
  config.plugins = plugins

  // 2. Set channel-level config (matches `openclaw channels add` output)
  const channels = (config.channels as Record<string, unknown>) ?? {}
  const ch = (channels[channelId] as Record<string, unknown>) ?? {}
  ch.enabled = true
  if (!ch.dmPolicy) ch.dmPolicy = channelConfig.dmPolicy ?? 'pairing'
  if (!ch.groupPolicy) ch.groupPolicy = 'allowlist'
  if (!ch.streaming) ch.streaming = 'off'

  // 3. Write account config under channels.<id>.accounts.<accountId>
  const accounts = (ch.accounts as Record<string, unknown>) ?? {}
  const accountCfg: Record<string, unknown> = {
    enabled: true,
    dmPolicy: channelConfig.dmPolicy ?? 'pairing',
    groupPolicy: 'allowlist',
    streaming: 'off',
  }
  // Copy channel-specific fields (botToken, token, etc.) but not meta fields
  for (const [key, value] of Object.entries(channelConfig)) {
    if (key !== 'dmPolicy' && key !== 'name') {
      accountCfg[key] = value
    }
  }
  if (channelConfig.name) accountCfg.name = channelConfig.name

  accounts[accountId] = accountCfg
  ch.accounts = accounts
  channels[channelId] = ch
  config.channels = channels

  writeJson(CONFIG_PATH, config)
}

/**
 * Delete a channel account from ~/.openclaw/openclaw.json.
 * If accountId is provided, delete only that account.
 * If no accounts remain, disable the channel and plugin.
 */
export function deleteChannelConfig(channelId: string, accountId?: string): void {
  const config = (readJson(CONFIG_PATH) as Record<string, unknown>) ?? {}
  const channels = (config.channels as Record<string, unknown>) ?? {}
  const ch = (channels[channelId] as Record<string, unknown>) ?? {}

  if (accountId) {
    const accounts = (ch.accounts as Record<string, unknown>) ?? {}
    delete accounts[accountId]

    if (Object.keys(accounts).length === 0) {
      // No accounts left — disable channel entirely
      delete channels[channelId]

      // Disable plugin
      const plugins = (config.plugins as Record<string, unknown>) ?? {}
      const entries = (plugins.entries as Record<string, unknown>) ?? {}
      const pluginEntry = (entries[channelId] as Record<string, unknown>) ?? {}
      pluginEntry.enabled = false
      entries[channelId] = pluginEntry
      plugins.entries = entries
      config.plugins = plugins
    } else {
      ch.accounts = accounts
      channels[channelId] = ch
    }
  } else {
    delete channels[channelId]

    // Disable plugin
    const plugins = (config.plugins as Record<string, unknown>) ?? {}
    const entries = (plugins.entries as Record<string, unknown>) ?? {}
    const pluginEntry = (entries[channelId] as Record<string, unknown>) ?? {}
    pluginEntry.enabled = false
    entries[channelId] = pluginEntry
    plugins.entries = entries
    config.plugins = plugins
  }

  config.channels = channels
  writeJson(CONFIG_PATH, config)
}
