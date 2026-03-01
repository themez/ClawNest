import { Activity, Clock, Hash } from 'lucide-react'
import type { StatusSummary } from '@shared/openclaw-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatUptime(ms?: number): string {
  if (!ms) return '—'
  const seconds = Math.floor(ms / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}

export function GatewayStatusCard({ status }: { status: StatusSummary | null }) {
  const gw = status?.gateway

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Gateway</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Status</span>
          <span
            className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
              gw?.running
                ? 'bg-green-500/10 text-green-500'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {gw?.running ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Uptime</span>
          <span className="ml-auto text-sm text-muted-foreground">
            {formatUptime(gw?.uptime)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Port</span>
          <span className="ml-auto text-sm text-muted-foreground">
            {gw?.port ?? '—'}
          </span>
        </div>
        {status?.version && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground ml-6">Version</span>
            <span className="ml-auto text-sm text-muted-foreground">{status.version}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
