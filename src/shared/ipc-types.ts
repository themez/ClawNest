/**
 * IPC channel name constants.
 * These define the contract between main process and renderer via preload.
 */

// Invoke channels (renderer -> main, expects response)
export const IPC_CHANNELS = {
  GET_PLATFORM: 'get-platform',
  GET_VERSION: 'get-version',
  OPEN_LINK: 'open-link',
  GET_STORE_VALUE: 'store:get',
  SET_STORE_VALUE: 'store:set',
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',
  // OpenClaw
  OPENCLAW_DETECT_ENV: 'openclaw:detect-env',
  OPENCLAW_INSTALL: 'openclaw:install',
  OPENCLAW_UNINSTALL: 'openclaw:uninstall',
  OPENCLAW_CLI_EXEC: 'openclaw:cli-exec',
  // Gateway
  GATEWAY_CONNECT: 'gateway:connect',
  GATEWAY_DISCONNECT: 'gateway:disconnect',
  GATEWAY_RPC_CALL: 'gateway:rpc-call',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

// Event channels (main -> renderer, one-way push)
export const IPC_EVENTS = {
  SYSTEM_THEME_CHANGED: 'system-theme-changed',
  WINDOW_MAXIMIZED_CHANGED: 'window:maximized-changed',
  GATEWAY_CONNECTED: 'gateway:connected',
  GATEWAY_DISCONNECTED: 'gateway:disconnected',
  GATEWAY_HEALTH_UPDATE: 'gateway:health-update',
  OPENCLAW_INSTALL_OUTPUT: 'openclaw:install-output',
  OPENCLAW_INSTALL_EXIT: 'openclaw:install-exit',
} as const

export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]
