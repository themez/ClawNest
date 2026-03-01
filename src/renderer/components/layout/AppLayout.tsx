import { Outlet } from '@tanstack/react-router'
import { Titlebar } from '@/components/titlebar/Titlebar'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
