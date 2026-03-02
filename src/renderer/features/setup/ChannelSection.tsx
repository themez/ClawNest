import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useElectron } from '@/hooks/useElectron'
import { useTranslation } from '@/i18n'
import { getChannelMeta } from '@shared/channel-meta'
import type { ConfiguredChannelInfo, HealthSummary, ChannelHealthSummary } from '@shared/openclaw-types'
import {
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  CheckCircle2,
  RotateCw,
  Link2,
} from 'lucide-react'
import { AddChannelModal } from './AddChannelModal'

/** Channel is "linked" when the probe succeeded (bot reachable) or gateway reports linked */
function isChannelLinked(ch?: ChannelHealthSummary): boolean {
  return ch?.linked === true || ch?.probe?.ok === true
}

interface ChannelSectionProps {
  onStatusChange?: (hasChannels: boolean) => void
}

export function ChannelSection({ onStatusChange }: ChannelSectionProps) {
  const electron = useElectron()
  const { t } = useTranslation()

  const [channels, setChannels] = useState<ConfiguredChannelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [needsRestart, setNeedsRestart] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [restartError, setRestartError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [channelHealth, setChannelHealth] = useState<Record<string, ChannelHealthSummary>>({})
  const [pairCode, setPairCode] = useState<Record<string, string>>({})
  const [pairing, setPairing] = useState<Record<string, boolean>>({})
  const [pairError, setPairError] = useState<Record<string, string>>({})
  const [paired, setPaired] = useState<Record<string, boolean>>({})

  const fetchChannels = useCallback(async () => {
    try {
      const list = await electron.getChannelsList()
      setChannels(list)
    } catch {
      setChannels([])
    } finally {
      setLoading(false)
    }
  }, [electron])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // Auto-expand first unpaired channel (only on initial load)
  const [autoExpandDone, setAutoExpandDone] = useState(false)
  useEffect(() => {
    if (autoExpandDone || channels.length === 0 || Object.keys(channelHealth).length === 0) return
    setAutoExpandDone(true)
    const firstUnpaired = channels.find((ch) => {
      const key = `${ch.id}:${ch.accountId}`
      const health = channelHealth[`${ch.id}:${ch.accountId}`] ?? channelHealth[ch.id]
      return health?.configured && !isChannelLinked(health) && !paired[key]
    })
    if (firstUnpaired) {
      setExpandedChannel(`${firstUnpaired.id}:${firstUnpaired.accountId}`)
    }
  }, [autoExpandDone, channels, channelHealth, paired])

  // Report status: complete only when channels exist AND all are paired/linked
  useEffect(() => {
    if (loading) return
    if (channels.length === 0) {
      onStatusChange?.(false)
      return
    }
    const allLinked = channels.every((ch) => {
      const key = `${ch.id}:${ch.accountId}`
      const health = channelHealth[key] ?? channelHealth[ch.id]
      return isChannelLinked(health) || paired[key]
    })
    onStatusChange?.(allLinked)
  }, [channels, channelHealth, paired, loading, onStatusChange])

  const updateHealth = useCallback((channels: Record<string, ChannelHealthSummary>) => {
    setChannelHealth(channels)
  }, [])

  const refreshHealth = useCallback(() => {
    electron.gatewayRpcCall('health').then((h) => {
      const health = h as HealthSummary | null
      if (health?.channels) updateHealth(health.channels)
    }).catch(() => {})
  }, [electron, updateHealth])

  // Subscribe to gateway health updates for channel linked status
  useEffect(() => {
    refreshHealth()

    const unsub = electron.onGatewayHealthUpdate((_e, h) => {
      const health = h as HealthSummary
      if (health?.channels) updateHealth(health.channels)
    })
    return unsub
  }, [electron, refreshHealth, updateHealth])

  const handlePair = async (channelKey: string, code: string) => {
    if (code.length < 8) return
    const channelId = channelKey.split(':')[0]
    setPairing((p) => ({ ...p, [channelKey]: true }))
    setPairError((p) => ({ ...p, [channelKey]: '' }))
    try {
      const result = await electron.pairChannel(channelId, code)
      if (result.success) {
        setPaired((p) => ({ ...p, [channelKey]: true }))
        // Re-fetch health after a short delay to pick up updated linked status
        setTimeout(refreshHealth, 1500)
      } else {
        setPairError((p) => ({ ...p, [channelKey]: result.error ?? 'Pairing failed' }))
      }
    } catch (err) {
      setPairError((p) => ({ ...p, [channelKey]: err instanceof Error ? err.message : 'Pairing failed' }))
    } finally {
      setPairing((p) => ({ ...p, [channelKey]: false }))
    }
  }

  const handleDelete = async (channelId: string, accountId: string) => {
    const key = `${channelId}:${accountId}`
    setDeleting((p) => ({ ...p, [key]: true }))
    try {
      const result = await electron.deleteChannelConfig(channelId, accountId)
      if (result.success) {
        setExpandedChannel(null)
        setNeedsRestart(true)
        await fetchChannels()
      }
    } catch {
      // silent
    } finally {
      setDeleting((p) => ({ ...p, [key]: false }))
    }
  }

  const handleRestart = async () => {
    setRestarting(true)
    setRestartError('')
    try {
      await electron.restartGateway()
      setNeedsRestart(false)
    } catch (err) {
      setRestartError(err instanceof Error ? err.message : 'Gateway restart failed')
    } finally {
      setRestarting(false)
    }
  }

  const handleAddSuccess = () => {
    setNeedsRestart(true)
    fetchChannels()
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('channels.loading')}
      </div>
    )
  }

  const configuredChannelIds = channels.map((c) => c.id)

  return (
    <>
      <div className="space-y-3">
        {/* Restart banner */}
        {needsRestart && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
              <span className="text-sm text-yellow-600 dark:text-yellow-400">
                {t('channels.restartBanner')}
              </span>
              <Button size="sm" variant="outline" onClick={handleRestart} disabled={restarting}>
                {restarting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCw className="h-3 w-3" />
                )}
                {t('auth.restart')}
              </Button>
            </div>
            {restartError && (
              <p className="text-xs text-destructive">{restartError}</p>
            )}
          </div>
        )}

        {/* Configured channels */}
        {channels.length > 0 ? (
          <div className="space-y-2">
            {channels.map((ch) => {
              const key = `${ch.id}:${ch.accountId}`
              const meta = getChannelMeta(ch.id)
              const label = meta?.label ?? ch.id
              const isExpanded = expandedChannel === key

              // Find health info — try "channelId:accountId" first, then just "channelId"
              const health = channelHealth[`${ch.id}:${ch.accountId}`] ?? channelHealth[ch.id]
              const isLinked = isChannelLinked(health) || paired[key]
              const isConfigured = health?.configured === true

              return (
                <div key={key} className="border rounded-md">
                  <div
                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedChannel(isExpanded ? null : key)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">{label}</span>
                      {ch.accountId !== 'default' && (
                        <span className="text-xs text-muted-foreground">({ch.accountId})</span>
                      )}
                      {ch.name && (
                        <span className="text-xs text-muted-foreground">— {ch.name}</span>
                      )}
                    </div>
                    {isLinked ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('health.channelLinked')}
                      </span>
                    ) : isConfigured ? (
                      <span className="flex items-center gap-1 text-xs text-yellow-600">
                        <Link2 className="h-3.5 w-3.5" />
                        {t('channels.notPaired')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('channels.statusConfigured')}
                      </span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t('channels.channelType')}: {ch.id}</span>
                        <span>|</span>
                        <span>{t('channels.accountId')}: {ch.accountId}</span>
                      </div>

                      {/* Inline pairing — show when channel is configured but not linked */}
                      {isConfigured && !isLinked && (
                        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {t('channels.done.pairingFlow1')}
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={t('channels.done.pairCodePlaceholder')}
                              className="w-44 h-8 rounded-md border bg-background px-3 text-sm font-mono tracking-widest text-center"
                              value={pairCode[key] ?? ''}
                              maxLength={8}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
                                setPairCode((p) => ({ ...p, [key]: v }))
                                setPairError((p) => ({ ...p, [key]: '' }))
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (pairCode[key]?.length ?? 0) === 8) {
                                  handlePair(key, pairCode[key])
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handlePair(key, pairCode[key] ?? '')}
                              disabled={(pairCode[key]?.length ?? 0) < 8 || pairing[key]}
                            >
                              {pairing[key] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                t('channels.done.pair')
                              )}
                            </Button>
                          </div>
                          {pairError[key] && (
                            <p className="text-xs text-destructive">{pairError[key]}</p>
                          )}
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(ch.id, ch.accountId)}
                        disabled={deleting[key]}
                      >
                        {deleting[key] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        {t('auth.remove')}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('channels.empty')}
          </p>
        )}

        {/* Add Channel button */}
        <Button
          size="sm"
          variant="ghost"
          className="w-full"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3 w-3" />
          {t('channels.addChannel')}
        </Button>
      </div>

      <AddChannelModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        configuredChannelIds={configuredChannelIds}
        onSuccess={handleAddSuccess}
      />
    </>
  )
}
