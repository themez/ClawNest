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
  getModelsAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_MODELS_STATUS),
  saveModelAuthToken: (provider: string, token: string, endpoint?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_MODELS_AUTH_SAVE_TOKEN, provider, token, endpoint),
  getProviderEndpoints: (provider: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_PROVIDER_ENDPOINTS, provider),
  deleteModelAuth: (provider: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_MODELS_AUTH_DELETE, provider),
  startOAuthLogin: (provider: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_AUTH_OAUTH_LOGIN, provider),
  cancelOAuthLogin: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_AUTH_OAUTH_CANCEL),
  listModels: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_MODELS_LIST),
  setDefaultModel: (model: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_SET_DEFAULT_MODEL, model),
  enablePlugin: (pluginId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_PLUGINS_ENABLE, pluginId),

  // ─── Channels ──────────────────────────────────────────────────────────
  getChannelsList: () => ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_CHANNELS_LIST),
  saveChannelConfig: (channelId: string, accountId: string, config: Record<string, string>) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_CHANNELS_SAVE, channelId, accountId, config),
  deleteChannelConfig: (channelId: string, accountId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_CHANNELS_DELETE, channelId, accountId),
  pairChannel: (channel: string, code: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_CHANNELS_PAIR, channel, code),

  // ─── Gateway ─────────────────────────────────────────────────────────────
  startGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_CONNECT),
  disconnectGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_DISCONNECT),
  stopGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_STOP),
  restartGateway: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_RESTART),
  gatewayRpcCall: (method: string, params?: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_RPC_CALL, method, params),
  getGatewayAuthToken: () => ipcRenderer.invoke(IPC_CHANNELS.GATEWAY_AUTH_TOKEN),

  // ─── Updater ───────────────────────────────────────────────────────────────
  checkForUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_CHECK),
  installUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL),

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
  onAuthLoginOutput: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_OUTPUT, callback)
    return () => ipcRenderer.off(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_OUTPUT, callback)
  },
  onAuthLoginExit: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_EXIT, callback)
    return () => ipcRenderer.off(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_EXIT, callback)
  },
  onAuthLoginPrompt: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_PROMPT, callback)
    return () => ipcRenderer.off(IPC_EVENTS.OPENCLAW_AUTH_LOGIN_PROMPT, callback)
  },
  replyAuthPrompt: (value: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPENCLAW_AUTH_PROMPT_REPLY, value),

  // ─── Updater Events ──────────────────────────────────────────────────────
  onUpdaterError: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.UPDATER_ERROR, callback)
    return () => ipcRenderer.off(IPC_EVENTS.UPDATER_ERROR, callback)
  },
  onUpdaterAvailable: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.UPDATER_AVAILABLE, callback)
    return () => ipcRenderer.off(IPC_EVENTS.UPDATER_AVAILABLE, callback)
  },
  onUpdaterNotAvailable: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.UPDATER_NOT_AVAILABLE, callback)
    return () => ipcRenderer.off(IPC_EVENTS.UPDATER_NOT_AVAILABLE, callback)
  },
  onUpdaterDownloadProgress: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.UPDATER_DOWNLOAD_PROGRESS, callback)
    return () => ipcRenderer.off(IPC_EVENTS.UPDATER_DOWNLOAD_PROGRESS, callback)
  },
  onUpdaterDownloaded: (callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(IPC_EVENTS.UPDATER_DOWNLOADED, callback)
    return () => ipcRenderer.off(IPC_EVENTS.UPDATER_DOWNLOADED, callback)
  },
})
