import { useRouterState, Link } from '@tanstack/react-router'
import {
  Wand2,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18n'

const NAV_ITEMS = [
  { path: '/' as const, labelKey: 'sidebar.setup' as TranslationKey, icon: Wand2 },
  { path: '/dashboard' as const, labelKey: 'sidebar.dashboard' as TranslationKey, icon: LayoutDashboard },
]

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const gatewayConnected = useAppStore((s) => s.gatewayConnected)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const { t, language } = useTranslation()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en')
  }

  return (
    <nav
      className={`flex flex-col border-r border-border bg-card transition-[width] duration-200 ${
        collapsed ? 'w-[60px]' : 'w-[220px]'
      }`}
    >
      <div className="flex-1 flex flex-col gap-1 p-2 pt-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          )
        })}
      </div>

      {/* Gateway status + language toggle + collapse toggle */}
      <div className="border-t border-border p-2">
        <div className="flex items-center gap-2 px-3 py-1.5">
          <div
            className={`h-2 w-2 rounded-full ${
              gatewayConnected
                ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                : 'bg-muted-foreground/40'
            }`}
          />
          {!collapsed && (
            <span className="text-xs text-muted-foreground">
              {gatewayConnected ? t('sidebar.connected') : t('sidebar.disconnected')}
            </span>
          )}
        </div>
        <button
          onClick={toggleLanguage}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          {collapsed
            ? (language === 'en' ? 'EN' : '中')
            : (language === 'en' ? 'EN | 中文' : '中文 | EN')}
        </button>
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </nav>
  )
}
