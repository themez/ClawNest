import { create } from 'zustand'
import type { EnvironmentInfo, ModelsAuthStatus } from '@shared/openclaw-types'

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

  // Cached auth status
  authStatus: ModelsAuthStatus | null
  setAuthStatus: (status: ModelsAuthStatus) => void

  // Setup page section collapse state
  setupSectionsOpen: Record<number, boolean>
  setSetupSectionOpen: (step: number, open: boolean) => void

  // Locally tracked paired channels (persisted across renders, source of truth for pairing)
  pairedChannels: Record<string, boolean>
  markChannelPaired: (key: string) => void
  unmarkChannelPaired: (key: string) => void

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

  authStatus: null,
  setAuthStatus: (authStatus) => set({ authStatus }),

  setupSectionsOpen: {},
  setSetupSectionOpen: (step, open) =>
    set((s) => ({ setupSectionsOpen: { ...s.setupSectionsOpen, [step]: open } })),

  pairedChannels: {},
  markChannelPaired: (key) =>
    set((s) => ({ pairedChannels: { ...s.pairedChannels, [key]: true } })),
  unmarkChannelPaired: (key) =>
    set((s) => {
      const { [key]: _, ...rest } = s.pairedChannels
      return { pairedChannels: rest }
    }),

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => {
    set({ language })
    window.electronAPI?.setStoreValue('language', language)
  },
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setGatewayConnected: (gatewayConnected) => set({ gatewayConnected }),
}))
