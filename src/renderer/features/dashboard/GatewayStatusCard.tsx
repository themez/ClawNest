import { Activity, Clock, Users, Bot } from 'lucide-react'
import type { StatusSummary } from '@shared/openclaw-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/stores/app-store'

function formatAge(ms: number): string {
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
  const connected = useAppStore((s) => s.gatewayConnected)

  const sessionCount = status?.sessions?.count ?? 0
  const model = status?.sessions?.defaults?.model ?? '—'
  const agents = status?.heartbeat?.agents ?? []

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
              connected
                ? 'bg-green-500/10 text-green-500'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {connected ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Sessions</span>
          <span className="ml-auto text-sm text-muted-foreground">{sessionCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Model</span>
          <span className="ml-auto text-sm text-muted-foreground">{model}</span>
        </div>
        {agents.map((a) => (
          <div key={a.agentId} className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Heartbeat ({a.agentId})</span>
            <span className="ml-auto text-sm text-muted-foreground">
              {a.enabled ? `every ${a.every}` : 'disabled'}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
