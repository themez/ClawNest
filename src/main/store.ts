import Store from 'electron-store'

export interface StoreSchema {
  theme: 'light' | 'dark' | 'system'
  language: string
  windowState: {
    x?: number
    y?: number
    width: number
    height: number
    isMaximized: boolean
  }
}

export const store = new Store<StoreSchema>({
  defaults: {
    theme: 'system',
    language: 'en',
    windowState: {
      width: 1200,
      height: 800,
      isMaximized: false,
    },
  },
})
