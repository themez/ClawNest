import { create } from 'zustand'

interface AppStore {
  theme: 'light' | 'dark' | 'system'
  language: string
  sidebarCollapsed: boolean
  gatewayConnected: boolean
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
  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setGatewayConnected: (gatewayConnected) => set({ gatewayConnected }),
}))
