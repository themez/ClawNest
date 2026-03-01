import { useEffect, useState, useCallback } from 'react'
import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import type { HealthSummary, StatusSummary } from '@shared/openclaw-types'
import { HEALTH_POLL_INTERVAL } from '@shared/constants'
import { useElectron } from '@/hooks/useElectron'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GatewayStatusCard } from './GatewayStatusCard'
import { HealthSummaryCard } from './HealthSummaryCard'

export function DashboardView() {
  const electron = useElectron()
  const setGatewayConnected = useAppStore((s) => s.setGatewayConnected)
  const gatewayConnected = useAppStore((s) => s.gatewayConnected)

  const [health, setHealth] = useState<HealthSummary | null>(null)
  const [statusSummary, setStatusSummary] = useState<StatusSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const [healthData, statusData] = await Promise.all([
        electron.gatewayRpcCall('health') as Promise<HealthSummary>,
        electron.gatewayRpcCall('status') as Promise<StatusSummary>,
      ])
      setHealth(healthData)
      setStatusSummary(statusData)
      setGatewayConnected(true)
      setLastChecked(new Date())
    } catch {
      setGatewayConnected(false)
    } finally {
      setLoading(false)
    }
  }, [electron, setGatewayConnected])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, HEALTH_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchHealth])

  // Listen for push events
  useEffect(() => {
    const unsubHealth = electron.onGatewayHealthUpdate((_e, h) => {
      setHealth(h as HealthSummary)
      setLastChecked(new Date())
    })
    const unsubDisconnect = electron.onGatewayDisconnected(() => {
      setGatewayConnected(false)
    })
    const unsubConnect = electron.onGatewayConnected(() => {
      setGatewayConnected(true)
      fetchHealth()
    })
    return () => {
      unsubHealth()
      unsubDisconnect()
      unsubConnect()
    }
  }, [electron, setGatewayConnected, fetchHealth])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your OpenClaw gateway status.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHealth}>
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Connection status banner */}
      <Card className={gatewayConnected ? 'border-green-500/30' : 'border-destructive/30'}>
        <CardContent className="flex items-center gap-3 py-3">
          {gatewayConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Gateway Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Gateway Disconnected</span>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => electron.startGateway().then(fetchHealth)}
              >
                Connect
              </Button>
            </>
          )}
          {lastChecked && (
            <span className="ml-auto text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Status cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <GatewayStatusCard status={statusSummary} />
        <HealthSummaryCard health={health} onRefresh={fetchHealth} />
      </div>
    </div>
  )
}
