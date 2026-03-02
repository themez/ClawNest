import { useState } from 'react'
import { Heart, RefreshCw, Bot, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import type { HealthSummary, ChannelHealthSummary } from '@shared/openclaw-types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/i18n'
import type { TranslationKey } from '@/i18n'

type HealthLevel = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

/** Channel is "linked" when the probe succeeded (bot reachable) or gateway reports linked */
function isChannelLinked(ch?: ChannelHealthSummary): boolean {
  return ch?.linked === true || ch?.probe?.ok === true
}

function deriveOverallHealth(health: HealthSummary | null): HealthLevel {
  if (!health) return 'unknown'
  if (!health.ok) return 'unhealthy'

  const channels = Object.values(health.channels ?? {})
  if (channels.length === 0) return 'healthy' // no channels configured is fine

  const hasError = channels.some((ch) => ch.error)
  const allLinked = channels.every((ch) => isChannelLinked(ch))
  const anyLinked = channels.some((ch) => isChannelLinked(ch))

  if (hasError) return 'unhealthy'
  if (allLinked) return 'healthy'
  if (anyLinked) return 'degraded'
  return 'degraded'
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
  const channelEntries = Object.entries(health?.channels ?? {})
  const channelLabels = health?.channelLabels ?? {}
  const channelOrder = health?.channelOrder ?? channelEntries.map(([k]) => k)
  const agentCount = health?.agents?.length ?? 0
  const [channelsExpanded, setChannelsExpanded] = useState(false)

  // Sort channels by channelOrder
  const sortedChannels = [...channelEntries].sort((a, b) => {
    const ai = channelOrder.indexOf(a[0])
    const bi = channelOrder.indexOf(b[0])
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

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

        {/* Channels — expandable */}
        <div>
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setChannelsExpanded(!channelsExpanded)}
          >
            {sortedChannels.length > 0 ? (
              channelsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )
            ) : (
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            )}
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{t('health.channels')}</span>
            <span className="ml-auto text-sm text-muted-foreground">{sortedChannels.length}</span>
          </div>

          {channelsExpanded && sortedChannels.length > 0 && (
            <div className="mt-2 ml-6 space-y-1.5">
              {sortedChannels.map(([channelKey, ch]) => {
                const label = channelLabels[channelKey] ?? channelKey
                let statusColor = 'text-muted-foreground'
                let statusText: TranslationKey = 'health.channelConfigured'

                if (isChannelLinked(ch)) {
                  statusColor = 'text-green-500'
                  statusText = 'health.channelLinked'
                } else if (ch.error) {
                  statusColor = 'text-destructive'
                  statusText = 'health.channelError'
                } else if (ch.configured) {
                  statusColor = 'text-yellow-500'
                  statusText = 'health.channelConfigured'
                }

                return (
                  <div key={channelKey} className="flex items-center justify-between">
                    <span className="text-xs">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${statusColor.replace('text-', 'bg-')}`} />
                      <span className={`text-xs ${statusColor}`}>{t(statusText)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
