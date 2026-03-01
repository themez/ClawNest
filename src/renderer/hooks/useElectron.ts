import type { ElectronIPC } from '@shared/electron-types'

export function useElectron(): ElectronIPC {
  return window.electronAPI as ElectronIPC
}
