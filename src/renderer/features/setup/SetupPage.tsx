import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Square,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useElectron } from '@/hooks/useElectron'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/i18n'
import type { EnvironmentInfo, ModelsAuthStatus } from '@shared/openclaw-types'
import { ApiAuthSection } from './ApiAuthSection'
import type { AuthSectionStatus } from './ApiAuthSection'
import { ChannelSection } from './ChannelSection'

type DetectStatus = 'idle' | 'checking' | 'installed' | 'not-installed'

interface EnvItem {
  label: string
  status: DetectStatus
  version?: string
  path?: string
}

type SectionStatus = 'complete' | 'warning' | 'pending' | 'optional'

/* ================================================================== */
/*  CollapsibleSection                                                  */
/* ================================================================== */

function CollapsibleSection({
  title,
  step,
  status,
  defaultOpen = true,
  children,
}: {
  title: string
  step: number
  status: SectionStatus
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const storedOpen = useAppStore((s) => s.setupSectionsOpen[step])
  const setStoredOpen = useAppStore((s) => s.setSetupSectionOpen)
  const open = storedOpen ?? defaultOpen
  const setOpen = (v: boolean) => setStoredOpen(step, v)

  // Auto-collapse only once: when status first becomes 'complete' on initial load
  // After that, user controls the section manually
  const initialCollapseRef = useRef(false)
  useEffect(() => {
    if (initialCollapseRef.current) return
    if (status === 'complete') {
      initialCollapseRef.current = true
      setOpen(false)
    } else if (status !== 'pending' && status !== 'optional') {
      // Status has been determined (not default) — stop watching
      initialCollapseRef.current = true
    }
  }, [status])

  const statusIcon = () => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'optional':
        return <Minus className="h-4 w-4 text-muted-foreground" />
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
    }
  }

  return (
    <Card>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-base font-semibold">
            {step}. {title}
          </span>
        </div>
        {statusIcon()}
      </div>
      {open && (
        <CardContent className="pt-0 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

/* ================================================================== */
/*  SetupPage                                                           */
/* ================================================================== */

export function SetupPage() {
  const electron = useElectron()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const envInfo = useAppStore((s) => s.envInfo)
  const envChecking = useAppStore((s) => s.envChecking)
  const setEnvInfo = useAppStore((s) => s.setEnvInfo)
  const setEnvChecking = useAppStore((s) => s.setEnvChecking)
  const cachedAuthStatus = useAppStore((s) => s.authStatus)

  const [installOutput, setInstallOutput] = useState<string[]>([])
  const [installVisible, setInstallVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [startingDaemon, setStartingDaemon] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [hasChannels, setHasChannels] = useState(false)
  const [authSecStatus, setAuthSecStatus] = useState<AuthSectionStatus>('no-provider')
  const logRef = useRef<HTMLDivElement>(null)

  const detectEnv = useCallback(async () => {
    setEnvChecking(true)
    try {
      const env: EnvironmentInfo = await electron.detectEnv()
      setEnvInfo(env)
    } catch {
      // keep previous cached state
    } finally {
      setEnvChecking(false)
    }
  }, [electron, setEnvInfo, setEnvChecking])

  // Only detect on first mount if no cached data
  useEffect(() => {
    if (!envInfo) {
      detectEnv()
    } else {
      // Refresh in background without blocking UI
      detectEnv()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-scroll install log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [installOutput])

  function envToItems(env: EnvironmentInfo | null, checking: boolean): { node: EnvItem; openclaw: EnvItem } {
    if (!env) {
      const status = checking ? 'checking' : 'idle'
      return {
        node: { label: t('setup.nodejs'), status },
        openclaw: { label: t('setup.openclaw'), status },
      }
    }
    return {
      node: {
        label: t('setup.nodejs'),
        status: env.nodeInstalled ? 'installed' : 'not-installed',
        version: env.nodeVersion,
        path: env.nodePath,
      },
      openclaw: {
        label: t('setup.openclaw'),
        status: env.openclawInstalled ? 'installed' : 'not-installed',
        version: env.openclawVersion,
        path: env.openclawPath,
      },
    }
  }

  const { node: nodeStatus, openclaw: openclawStatus } = envToItems(envInfo, envChecking)
  const daemonRunning = envInfo?.gatewayRunning ?? false
  const allReady = nodeStatus.status === 'installed' && openclawStatus.status === 'installed'

  // Section statuses
  const installStatus: SectionStatus =
    nodeStatus.status === 'installed' && openclawStatus.status === 'installed'
      ? 'complete'
      : 'pending'

  const providerStatus: SectionStatus = authSecStatus === 'ok'
    ? 'complete'
    : authSecStatus === 'no-model'
      ? 'warning'
      : 'pending'

  const channelStatus: SectionStatus = hasChannels ? 'complete' : 'optional'

  const handleInstallNode = () => {
    electron.openLink('https://nodejs.org/')
  }

  const handleInstallOpenclaw = () => {
    setInstalling(true)
    setInstallVisible(true)
    setInstallOutput([t('setup.installCmd'), t('setup.installResolving')])

    const unsubOutput = electron.onOpenclawInstallOutput((_e, data) => {
      setInstallOutput((prev) => [...prev, data as string])
    })

    const unsubExit = electron.onOpenclawInstallExit((_e, code) => {
      setInstalling(false)
      setInstallOutput((prev) => [
        ...prev,
        code === 0 ? t('setup.installComplete') : t('setup.installFailed', { code: code as number }),
      ])
      if (code === 0) {
        setTimeout(() => {
          detectEnv()
          setInstallVisible(false)
        }, 1500)
      }
      unsubOutput()
      unsubExit()
    })

    electron.installOpenclaw().catch(() => {
      setInstalling(false)
      setInstallOutput((prev) => [...prev, t('setup.installProcessError')])
      unsubOutput()
      unsubExit()
    })
  }

  const handleUninstallOpenclaw = () => {
    setInstalling(true)
    setInstallVisible(true)
    setInstallOutput([t('setup.uninstallCmd')])

    const unsubOutput = electron.onOpenclawInstallOutput((_e, data) => {
      setInstallOutput((prev) => [...prev, data as string])
    })

    const unsubExit = electron.onOpenclawInstallExit((_e, code) => {
      setInstalling(false)
      setInstallOutput((prev) => [
        ...prev,
        code === 0 ? t('setup.uninstallComplete') : t('setup.uninstallFailed', { code: code as number }),
      ])
      if (code === 0) {
        setTimeout(() => {
          detectEnv()
          setInstallVisible(false)
        }, 1500)
      }
      unsubOutput()
      unsubExit()
    })

    electron.uninstallOpenclaw().catch(() => {
      setInstalling(false)
      setInstallOutput((prev) => [...prev, t('setup.uninstallProcessError')])
      unsubOutput()
      unsubExit()
    })
  }

  const handleStartDaemon = async () => {
    setStartingDaemon(true)
    setStartError(null)
    try {
      await electron.startGateway()
      setEnvInfo({ ...envInfo!, gatewayRunning: true })
      navigate({ to: '/dashboard' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('setup.failedToStart')
      setStartError(msg)
    } finally {
      setStartingDaemon(false)
    }
  }

  const handleStopDaemon = async () => {
    setStartingDaemon(true)
    setStartError(null)
    try {
      await electron.stopGateway()
      // Re-detect to verify it actually stopped
      const env = await electron.detectEnv()
      setEnvInfo(env)
      if (env.gatewayRunning) {
        setStartError(t('setup.gatewayStillRunning'))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('setup.failedToStop')
      setStartError(msg)
    } finally {
      setStartingDaemon(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('setup.description')}
        </p>
      </div>

      {/* Section 1: Installation */}
      <CollapsibleSection
        title={t('setup.step.install')}
        step={1}
        status={installStatus}
      >
        <div className="flex flex-col gap-3">
          <StatusRow
            item={nodeStatus}
            onInstall={handleInstallNode}
            installLabel={t('setup.download')}
          />
          <StatusRow
            item={openclawStatus}
            onInstall={handleInstallOpenclaw}
            onUninstall={handleUninstallOpenclaw}
            installLabel={t('setup.install')}
            uninstallLabel={t('setup.uninstall')}
            installing={installing}
          />
        </div>

        {/* Install Log */}
        {installVisible && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('setup.installLog')}</span>
              {!installing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInstallVisible(false)}
                >
                  {t('setup.close')}
                </Button>
              )}
            </div>
            <div
              ref={logRef}
              className="h-48 overflow-y-auto rounded-md bg-background border p-3 font-mono text-xs leading-5 whitespace-pre-wrap"
            >
              {installOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {installing && <InstallingIndicator />}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Section 2: API Authentication */}
      <CollapsibleSection
        title={t('setup.step.providers')}
        step={2}
        status={providerStatus}
      >
        {openclawStatus.status === 'installed' ? (
          <ApiAuthSection onStatusChange={setAuthSecStatus} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('channels.installFirst')}</p>
        )}
      </CollapsibleSection>

      {/* Section 3: Channels */}
      <CollapsibleSection
        title={t('setup.step.channels')}
        step={3}
        status={channelStatus}
      >
        {openclawStatus.status === 'installed' ? (
          <ChannelSection onStatusChange={setHasChannels} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('channels.installFirst')}</p>
        )}
      </CollapsibleSection>

      {/* Run Control — always visible */}
      <Card>
        <CardContent className="py-4">
          {daemonRunning ? (
            <Button
              size="lg"
              variant="destructive"
              className="w-full"
              onClick={handleStopDaemon}
              disabled={startingDaemon}
            >
              {startingDaemon ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {t('setup.stopOpenclaw')}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full"
              onClick={handleStartDaemon}
              disabled={!allReady || startingDaemon}
            >
              {startingDaemon ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('setup.runOpenclaw')}
            </Button>
          )}
          {!allReady && !daemonRunning && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {t('setup.notReady')}
            </p>
          )}
          {startingDaemon && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {daemonRunning ? t('setup.stopping') : t('setup.starting')}
            </p>
          )}
          {startError && (
            <p className="text-xs text-destructive mt-2 text-center">
              {startError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// StatusRow sub-component
// ---------------------------------------------------------------------------

function StatusRow({
  item,
  onInstall,
  onUninstall,
  installLabel,
  uninstallLabel,
  installing = false,
}: {
  item: EnvItem
  onInstall: () => void
  onUninstall?: () => void
  installLabel: string
  uninstallLabel?: string
  installing?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <StatusIcon status={item.status} />
        <div>
          <div>
            <span className="text-sm font-medium">{item.label}</span>
            {item.version && (
              <span className="ml-2 text-xs text-muted-foreground">v{item.version}</span>
            )}
          </div>
          {item.path && (
            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs" title={item.path}>
              {item.path}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.status === 'not-installed' && (
          <Button size="sm" variant="outline" onClick={onInstall} disabled={installing}>
            {installing && <Loader2 className="h-3 w-3 animate-spin" />}
            {installLabel}
          </Button>
        )}
        {item.status === 'installed' && onUninstall && (
          <Button size="sm" variant="ghost" onClick={onUninstall} disabled={installing} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
            {uninstallLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

function InstallingIndicator() {
  const { t } = useTranslation()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{t('setup.installing', { seconds: elapsed })}</span>
    </span>
  )
}

function StatusIcon({ status }: { status: DetectStatus }) {
  switch (status) {
    case 'checking':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    case 'installed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'not-installed':
      return <XCircle className="h-4 w-4 text-destructive" />
    default:
      return <div className="h-4 w-4 rounded-full bg-muted" />
  }
}
