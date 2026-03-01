import { create } from 'zustand'
import type { EnvironmentInfo } from '@shared/openclaw-types'

interface AppStore {
  theme: 'light' | 'dark' | 'system'
  language: string
  sidebarCollapsed: boolean
  gatewayConnected: boolean

  // Cached environment info
  envInfo: EnvironmentInfo | null
  envChecking: boolean
  setEnvInfo: (info: EnvironmentInfo) => void
  setEnvChecking: (checking: boolean) => void

  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLanguage: (lang: string) => void
  toggleSidebar: () => void
  setGatewayConnected: (connected: boolean) => void
}

export const useAppStore = create<AppStore>((set) => ({
  theme: 'system',
  language: 'en',
  sidebarCollapsed: false,
  gatewayConnected: false,

  envInfo: null,
  envChecking: false,
  setEnvInfo: (envInfo) => set({ envInfo }),
  setEnvChecking: (envChecking) => set({ envChecking }),

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setGatewayConnected: (gatewayConnected) => set({ gatewayConnected }),
}))
