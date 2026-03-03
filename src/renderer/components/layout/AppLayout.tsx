import { useEffect } from 'react'
import { Outlet } from '@tanstack/react-router'
import { Titlebar } from '@/components/titlebar/Titlebar'
import { UpdateBanner } from '@/components/UpdateBanner'
import { useAppStore } from '@/stores/app-store'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const setLanguage = useAppStore((s) => s.setLanguage)

  // Load persisted language on startup; fall back to system language detection
  useEffect(() => {
    window.electronAPI?.getStoreValue('language').then((stored) => {
      if (stored === 'zh' || stored === 'en') {
        // Use set() directly to avoid re-persisting what we just read
        useAppStore.setState({ language: stored as string })
      } else {
        // Detect system language
        const lang = navigator.language.startsWith('zh') ? 'zh' : 'en'
        setLanguage(lang)
      }
    }).catch(() => {})
  }, [setLanguage])

  return (
    <div className="flex h-screen flex-col">
      <Titlebar />
      <UpdateBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
