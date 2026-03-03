import { autoUpdater } from 'electron-updater'
import { ipcMain, type BrowserWindow } from 'electron'
import { IPC_CHANNELS, IPC_EVENTS } from '@shared/ipc-types'

export function setupUpdater(getWindow: () => BrowserWindow | null) {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  const send = (channel: string, ...args: unknown[]) => {
    const win = getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }

  autoUpdater.on('error', (err) => {
    send(IPC_EVENTS.UPDATER_ERROR, err.message)
  })

  autoUpdater.on('checking-for-update', () => {
    send(IPC_EVENTS.UPDATER_CHECKING)
  })

  autoUpdater.on('update-available', (info) => {
    send(IPC_EVENTS.UPDATER_AVAILABLE, info.version)
  })

  autoUpdater.on('update-not-available', () => {
    send(IPC_EVENTS.UPDATER_NOT_AVAILABLE)
  })

  autoUpdater.on('download-progress', (progress) => {
    send(IPC_EVENTS.UPDATER_DOWNLOAD_PROGRESS, {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send(IPC_EVENTS.UPDATER_DOWNLOADED, info.version)
  })

  // IPC handlers
  ipcMain.handle(IPC_CHANNELS.UPDATER_CHECK, () => {
    return autoUpdater.checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, () => {
    autoUpdater.quitAndInstall()
  })

  // Check for updates after a short delay on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5_000)
}
