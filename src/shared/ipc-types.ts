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
  OPENCLAW_INSTALL_NODE: 'openclaw:install-node',
  OPENCLAW_UNINSTALL: 'openclaw:uninstall',
  OPENCLAW_CLI_EXEC: 'openclaw:cli-exec',
  OPENCLAW_MODELS_STATUS: 'openclaw:models-status',
  OPENCLAW_MODELS_AUTH_SAVE_TOKEN: 'openclaw:models-auth-save-token',
  OPENCLAW_AUTH_OAUTH_LOGIN: 'openclaw:auth-oauth-login',
  OPENCLAW_MODELS_LIST: 'openclaw:models-list',
  OPENCLAW_SET_DEFAULT_MODEL: 'openclaw:set-default-model',
  OPENCLAW_PLUGINS_ENABLE: 'openclaw:plugins-enable',
  OPENCLAW_MODELS_AUTH_DELETE: 'openclaw:models-auth-delete',
  OPENCLAW_AUTH_OAUTH_CANCEL: 'openclaw:auth-oauth-cancel',
  OPENCLAW_AUTH_PROMPT_REPLY: 'openclaw:auth-prompt-reply',
  OPENCLAW_PROVIDER_ENDPOINTS: 'openclaw:provider-endpoints',
  // Channels
  OPENCLAW_CHANNELS_LIST: 'openclaw:channels-list',
  OPENCLAW_CHANNELS_SAVE: 'openclaw:channels-save',
  OPENCLAW_CHANNELS_DELETE: 'openclaw:channels-delete',
  OPENCLAW_CHANNELS_PAIR: 'openclaw:channels-pair',
  // Updater
  UPDATER_CHECK: 'updater:check',
  UPDATER_INSTALL: 'updater:install',
  // Gateway
  GATEWAY_CONNECT: 'gateway:connect',
  GATEWAY_DISCONNECT: 'gateway:disconnect',
  GATEWAY_STOP: 'gateway:stop',
  GATEWAY_RESTART: 'gateway:restart',
  GATEWAY_RPC_CALL: 'gateway:rpc-call',
  GATEWAY_AUTH_TOKEN: 'gateway:auth-token',
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
  OPENCLAW_AUTH_LOGIN_OUTPUT: 'openclaw:auth-login-output',
  OPENCLAW_AUTH_LOGIN_EXIT: 'openclaw:auth-login-exit',
  OPENCLAW_AUTH_LOGIN_PROMPT: 'openclaw:auth-login-prompt',
  // Updater
  UPDATER_ERROR: 'updater:error',
  UPDATER_CHECKING: 'updater:checking',
  UPDATER_AVAILABLE: 'updater:available',
  UPDATER_NOT_AVAILABLE: 'updater:not-available',
  UPDATER_DOWNLOAD_PROGRESS: 'updater:download-progress',
  UPDATER_DOWNLOADED: 'updater:downloaded',
} as const

export type IpcEvent = (typeof IPC_EVENTS)[keyof typeof IPC_EVENTS]
