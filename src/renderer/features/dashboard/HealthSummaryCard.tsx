import { Heart, RefreshCw, Users, MessageSquare } from 'lucide-react'
import type { HealthSummary } from '@shared/openclaw-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function deriveOverallHealth(
  health: HealthSummary | null,
): 'healthy' | 'degraded' | 'unhealthy' | 'unknown' {
  if (!health) return 'unknown'
  const channels = Object.values(health.channels ?? {})
  if (channels.length === 0) return 'unknown'

  const allOk = channels.every((ch) => ch.configured && ch.linked)
  const anyOk = channels.some((ch) => ch.configured && ch.linked)

  if (allOk) return 'healthy'
  if (anyOk) return 'degraded'
  return 'unhealthy'
}

const HEALTH_COLORS = {
  healthy: 'text-green-500',
  degraded: 'text-yellow-500',
  unhealthy: 'text-destructive',
  unknown: 'text-muted-foreground',
}

export function HealthSummaryCard({
  health,
  onRefresh,
}: {
  health: HealthSummary | null
  onRefresh: () => void
}) {
  const overall = deriveOverallHealth(health)
  const channelCount = Object.keys(health?.channels ?? {}).length
  const sessionCount = health?.sessions ?? 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Health</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Heart className={`h-4 w-4 ${HEALTH_COLORS[overall]}`} />
          <span className="text-sm">Overall</span>
          <span className={`ml-auto text-xs font-medium capitalize ${HEALTH_COLORS[overall]}`}>
            {overall}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Channels</span>
          <span className="ml-auto text-sm text-muted-foreground">{channelCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Sessions</span>
          <span className="ml-auto text-sm text-muted-foreground">{sessionCount}</span>
        </div>
      </CardContent>
    </Card>
  )
}
