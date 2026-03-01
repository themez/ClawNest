import type { EnvironmentInfo, HealthSummary } from './openclaw-types'

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

  // Gateway
  startGateway: () => Promise<void>
  disconnectGateway: () => Promise<void>
  gatewayRpcCall: (method: string, params?: unknown) => Promise<unknown>

  // Event listeners (return unsubscribe function)
  onSystemThemeChange: (callback: (event: unknown, theme: string) => void) => () => void
  onWindowMaximizedChanged: (callback: (event: unknown, isMaximized: boolean) => void) => () => void
  onGatewayConnected: (callback: () => void) => () => void
  onGatewayDisconnected: (callback: (event: unknown, reason?: string) => void) => () => void
  onGatewayHealthUpdate: (callback: (event: unknown, health: HealthSummary) => void) => () => void
  onOpenclawInstallOutput: (callback: (event: unknown, data: string) => void) => () => void
  onOpenclawInstallExit: (callback: (event: unknown, code: number) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronIPC
  }
}
