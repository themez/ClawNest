import type { EnvironmentInfo, HealthSummary, ModelsAuthStatus, ConfiguredChannelInfo } from './openclaw-types'

/**
 * Typed contract for the preload bridge (window.electronAPI).
 * Single source of truth for all IPC between renderer and main.
 */
export interface ElectronIPC {
  platform: string

  // App info
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  openLink: (url: string) => Promise<void>

  // Store
  getStoreValue: <T = unknown>(key: string) => Promise<T>
  setStoreValue: <T = unknown>(key: string, value: T) => Promise<void>

  // Window controls
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  windowIsMaximized: () => Promise<boolean>

  // OpenClaw
  detectEnv: () => Promise<EnvironmentInfo>
  installOpenclaw: () => Promise<void>
  uninstallOpenclaw: () => Promise<void>
  cliExec: (args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  getModelsAuthStatus: () => Promise<ModelsAuthStatus>
  saveModelAuthToken: (provider: string, token: string, endpoint?: string) => Promise<{ success: boolean; error?: string }>
  getProviderEndpoints: (provider: string) => Promise<{ label: string; value: string }[] | null>
  deleteModelAuth: (provider: string) => Promise<{ success: boolean; error?: string }>
  startOAuthLogin: (provider: string) => Promise<void>
  cancelOAuthLogin: () => Promise<void>
  listModels: () => Promise<{ key: string; name: string; available: boolean }[]>
  setDefaultModel: (model: string) => Promise<{ success: boolean; error?: string }>
  enablePlugin: (pluginId: string) => Promise<{ success: boolean; error?: string }>

  // Channels
  getChannelsList: () => Promise<ConfiguredChannelInfo[]>
  saveChannelConfig: (channelId: string, accountId: string, config: Record<string, string>) => Promise<{ success: boolean; error?: string }>
  deleteChannelConfig: (channelId: string, accountId?: string) => Promise<{ success: boolean; error?: string }>
  pairChannel: (channel: string, code: string) => Promise<{ success: boolean; error?: string }>

  // Gateway
  startGateway: () => Promise<void>
  disconnectGateway: () => Promise<void>
  stopGateway: () => Promise<void>
  restartGateway: () => Promise<void>
  gatewayRpcCall: (method: string, params?: unknown) => Promise<unknown>
  getGatewayAuthToken: () => Promise<string | null>

  // Updater
  checkForUpdate: () => Promise<unknown>
  installUpdate: () => Promise<void>

  // Event listeners (return unsubscribe function)
  onSystemThemeChange: (callback: (event: unknown, theme: string) => void) => () => void
  onWindowMaximizedChanged: (callback: (event: unknown, isMaximized: boolean) => void) => () => void
  onGatewayConnected: (callback: () => void) => () => void
  onGatewayDisconnected: (callback: (event: unknown, reason?: string) => void) => () => void
  onGatewayHealthUpdate: (callback: (event: unknown, health: HealthSummary) => void) => () => void
  onOpenclawInstallOutput: (callback: (event: unknown, data: string) => void) => () => void
  onOpenclawInstallExit: (callback: (event: unknown, code: number) => void) => () => void
  onAuthLoginOutput: (callback: (event: unknown, data: string) => void) => () => void
  onAuthLoginExit: (callback: (event: unknown, code: number) => void) => () => void
  onAuthLoginPrompt: (callback: (event: unknown, message: string, placeholder?: string) => void) => () => void
  replyAuthPrompt: (value: string) => Promise<void>

  // Updater events
  onUpdaterError: (callback: (event: unknown, message: string) => void) => () => void
  onUpdaterAvailable: (callback: (event: unknown, version: string) => void) => () => void
  onUpdaterNotAvailable: (callback: (event: unknown) => void) => () => void
  onUpdaterDownloadProgress: (callback: (event: unknown, progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => () => void
  onUpdaterDownloaded: (callback: (event: unknown, version: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronIPC
  }
}
