import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, XCircle, Loader2, Play, Square, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useElectron } from '@/hooks/useElectron'
import { useAppStore } from '@/stores/app-store'
import type { EnvironmentInfo } from '@shared/openclaw-types'

type DetectStatus = 'idle' | 'checking' | 'installed' | 'not-installed'

interface EnvItem {
  label: string
  status: DetectStatus
  version?: string
  path?: string
}

function envToItems(env: EnvironmentInfo | null, checking: boolean): { node: EnvItem; openclaw: EnvItem } {
  if (!env) {
    const status = checking ? 'checking' : 'idle'
    return {
      node: { label: 'Node.js', status },
      openclaw: { label: 'OpenClaw', status },
    }
  }
  return {
    node: {
      label: 'Node.js',
      status: env.nodeInstalled ? 'installed' : 'not-installed',
      version: env.nodeVersion,
      path: env.nodePath,
    },
    openclaw: {
      label: 'OpenClaw',
      status: env.openclawInstalled ? 'installed' : 'not-installed',
      version: env.openclawVersion,
      path: env.openclawPath,
    },
  }
}

export function SetupPage() {
  const electron = useElectron()
  const navigate = useNavigate()

  const envInfo = useAppStore((s) => s.envInfo)
  const envChecking = useAppStore((s) => s.envChecking)
  const setEnvInfo = useAppStore((s) => s.setEnvInfo)
  const setEnvChecking = useAppStore((s) => s.setEnvChecking)

  const [installOutput, setInstallOutput] = useState<string[]>([])
  const [installVisible, setInstallVisible] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [startingDaemon, setStartingDaemon] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
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

  const { node: nodeStatus, openclaw: openclawStatus } = envToItems(envInfo, envChecking)
  const daemonRunning = envInfo?.gatewayRunning ?? false
  const allReady = nodeStatus.status === 'installed' && openclawStatus.status === 'installed'

  const handleInstallNode = () => {
    electron.openLink('https://nodejs.org/')
  }

  const handleInstallOpenclaw = () => {
    setInstalling(true)
    setInstallVisible(true)
    setInstallOutput(['$ npm install -g openclaw', 'Resolving dependencies, please wait...\n'])

    const unsubOutput = electron.onOpenclawInstallOutput((_e, data) => {
      setInstallOutput((prev) => [...prev, data as string])
    })

    const unsubExit = electron.onOpenclawInstallExit((_e, code) => {
      setInstalling(false)
      setInstallOutput((prev) => [
        ...prev,
        code === 0 ? '\n--- Install complete ---' : `\n--- Install failed (exit ${code}) ---`,
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
      setInstallOutput((prev) => [...prev, 'Error: Failed to start install process'])
      unsubOutput()
      unsubExit()
    })
  }

  const handleUninstallOpenclaw = () => {
    setInstalling(true)
    setInstallVisible(true)
    setInstallOutput(['$ npm uninstall -g openclaw\n'])

    const unsubOutput = electron.onOpenclawInstallOutput((_e, data) => {
      setInstallOutput((prev) => [...prev, data as string])
    })

    const unsubExit = electron.onOpenclawInstallExit((_e, code) => {
      setInstalling(false)
      setInstallOutput((prev) => [
        ...prev,
        code === 0 ? '\n--- Uninstall complete ---' : `\n--- Uninstall failed (exit ${code}) ---`,
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
      setInstallOutput((prev) => [...prev, 'Error: Failed to start uninstall process'])
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
      const msg = err instanceof Error ? err.message : 'Failed to start gateway'
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
      setEnvInfo({ ...envInfo!, gatewayRunning: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to stop gateway'
      setStartError(msg)
    } finally {
      setStartingDaemon(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Setup</h1>
        <p className="text-muted-foreground mt-1">
          Check your environment and install OpenClaw to get started.
        </p>
      </div>

      {/* Environment Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <StatusRow
            item={nodeStatus}
            onInstall={handleInstallNode}
            installLabel="Download"
          />
          <StatusRow
            item={openclawStatus}
            onInstall={handleInstallOpenclaw}
            onUninstall={handleUninstallOpenclaw}
            installLabel="Install"
            installing={installing}
          />
        </CardContent>
      </Card>

      {/* Install Log */}
      {installVisible && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Install Log</CardTitle>
              {!installing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInstallVisible(false)}
                >
                  Close
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={logRef}
              className="h-48 overflow-y-auto rounded-md bg-background border p-3 font-mono text-xs leading-5 whitespace-pre-wrap"
            >
              {installOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {installing && <InstallingIndicator />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run OpenClaw</CardTitle>
        </CardHeader>
        <CardContent>
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
              Stop OpenClaw
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
              Run OpenClaw
            </Button>
          )}
          {!allReady && !daemonRunning && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Install Node.js and OpenClaw first to enable this button.
            </p>
          )}
          {startingDaemon && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {daemonRunning ? 'Stopping...' : 'Starting gateway, this may take up to 20 seconds...'}
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
  installLabel = 'Install',
  installing = false,
}: {
  item: EnvItem
  onInstall: () => void
  onUninstall?: () => void
  installLabel?: string
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
            Uninstall
          </Button>
        )}
      </div>
    </div>
  )
}

function InstallingIndicator() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>Installing... {elapsed}s</span>
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
