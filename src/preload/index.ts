import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, IPC_EVENTS } from '../shared/ipc-types'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // ─── App Info ────────────────────────────────────────────────────────────
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_VERSION),
  getPlatform: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PLATFORM),
  openLink: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_LINK, url),

  // ─── Store ───────────────────────────────────────────────────────────────
  getStoreValue: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_STORE_VALUE, key),
  setStoreValue: (key: string, value: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_STORE_VALUE, key, value),

  // ─── Window Controls ────────────────────────────────────────────────────
  windowMinimize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
  windowIsMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),

  // ─── OpenClaw ────────────────────────────────────────────────────────────
  detectEnv: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_DETECT_ENV),
  installOpenclaw: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_INSTALL),
  uninstallOpenclaw: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_UNINSTALL),
  cliExec: (args: string[]) => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_CLI_EXEC, args),

  // ─── Gateway ─────────────────────────────────────────────────────────────
  startGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_CONNECT),
  disconnectGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_DISCONNECT),
  stopGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_STOP),
  gatewayRpcCall: (method: string, params?: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_RPC_CALL, method, params),
  getGatewayAuthToken: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_AUTH_TOKEN),

  // ─── Event Listeners ────────────────────────────────────────────────────
  onSystemThemeChange: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.SYSTEM_THEME_CHANGED, callback)
    return () => ipcRenderer.off(IPC_EVENTS.SYSTEM_THEME_CHANGED, callback)
  },
  onWindowMaximizedChanged: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGED, callback)
    return () => ipcRenderer.off(IPC_EVENTS.WINDOW_MAXIMIZED_CHANGED, callback)
  },
  onGatewayConnected: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.GATEWAY_CONNECTED, callback)
    return () => ipcRenderer.off(IPC_EVENTS.GATEWAY_CONNECTED, callback)
  },
  onGatewayDisconnected: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.GATEWAY_DISCONNECTED, callback)
    return () => ipcRenderer.off(IPC_EVENTS.GATEWAY_DISCONNECTED, callback)
  },
  onGatewayHealthUpdate: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.GATEWAY_HEALTH_UPDATE, callback)
    return () => ipcRenderer.off(IPC_EVENTS.GATEWAY_HEALTH_UPDATE, callback)
  },
  onOpenclawInstallOutput: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.OPENCLAW_INSTALL_OUTPUT, callback)
    return () => ipcRenderer.off(IPC_EVENTS.OPENCLAW_INSTALL_OUTPUT, callback)
  },
  onOpenclawInstallExit: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.OPENCLAW_INSTALL_EXIT, callback)
    return () => ipcRenderer.off(IPC_EVENTS.OPENCLAW_INSTALL_EXIT, callback)
  },
})
