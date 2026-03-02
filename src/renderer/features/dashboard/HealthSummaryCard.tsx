import { Heart, RefreshCw, Bot, MessageSquare } from 'lucide-react'
import type { HealthSummary } from '@shared/openclaw-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18n'

type HealthLevel = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

function deriveOverallHealth(health: HealthSummary | null): HealthLevel {
  if (!health) return 'unknown'
  if (!health.ok) return 'unhealthy'

  const channels = Object.values(health.channels ?? {})
  if (channels.length === 0) return 'healthy' // no channels configured is fine

  const allOk = channels.every((ch) => ch.configured && ch.linked)
  const anyOk = channels.some((ch) => ch.configured && ch.linked)

  if (allOk) return 'healthy'
  if (anyOk) return 'degraded'
  return 'unhealthy'
}

const HEALTH_COLORS: Record<HealthLevel, string> = {
  healthy: 'text-green-500',
  degraded: 'text-yellow-500',
  unhealthy: 'text-destructive',
  unknown: 'text-muted-foreground',
}

const HEALTH_LABEL_KEYS: Record<HealthLevel, TranslationKey> = {
  healthy: 'health.healthy',
  degraded: 'health.degraded',
  unhealthy: 'health.unhealthy',
  unknown: 'health.unknown',
}

export function HealthSummaryCard({
  health,
  onRefresh,
}: {
  health: HealthSummary | null
  onRefresh: () => void
}) {
  const { t } = useTranslation()
  const overall = deriveOverallHealth(health)
  const channelCount = Object.keys(health?.channels ?? {}).length
  const agentCount = health?.agents?.length ?? 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('health.title')}</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Heart className={`h-4 w-4 ${HEALTH_COLORS[overall]}`} />
          <span className="text-sm">{t('health.overall')}</span>
          <span className={`ml-auto text-xs font-medium capitalize ${HEALTH_COLORS[overall]}`}>
            {t(HEALTH_LABEL_KEYS[overall])}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{t('health.channels')}</span>
          <span className="ml-auto text-sm text-muted-foreground">{channelCount}</span>
        </div>
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{t('health.agents')}</span>
          <span className="ml-auto text-sm text-muted-foreground">{agentCount}</span>
        </div>
      </CardContent>
    </Card>
  )
}
