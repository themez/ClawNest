import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useElectron } from '@/hooks/useElectron'
import { useTranslation } from '@/i18n'
import { CHANNEL_REGISTRY, DM_POLICIES } from '@shared/channel-meta'
import type { ChannelMeta, DmPolicy } from '@shared/channel-meta'
import type { TranslationKey } from '@/i18n'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ExternalLink, PartyPopper, RotateCw } from 'lucide-react'

type Step = 'select' | 'configure' | 'policy' | 'done'

interface AddChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  configuredChannelIds: string[]
  onSuccess: () => void
}

export function AddChannelModal({
  open,
  onOpenChange,
  configuredChannelIds,
  onSuccess,
}: AddChannelModalProps) {
  const electron = useElectron()
  const { t } = useTranslation()
  const markChannelPaired = useAppStore((s) => s.markChannelPaired)

  const [step, setStep] = useState<Step>('select')
  const [selectedChannel, setSelectedChannel] = useState<ChannelMeta | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [accountId, setAccountId] = useState('default')
  const [displayName, setDisplayName] = useState('')
  const [dmPolicy, setDmPolicy] = useState<DmPolicy>('pairing')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [restarting, setRestarting] = useState(false)
  const [restarted, setRestarted] = useState(false)
  const [restartError, setRestartError] = useState('')
  const [pairCode, setPairCode] = useState('')
  const [pairing, setPairing] = useState(false)
  const [pairError, setPairError] = useState('')
  const [paired, setPaired] = useState(false)

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('select')
      setSelectedChannel(null)
      setFieldValues({})
      setAccountId('default')
      setDisplayName('')
      setDmPolicy('pairing')
      setSaving(false)
      setSaveError('')
      setRestarting(false)
      setRestarted(false)
      setRestartError('')
      setPairCode('')
      setPairing(false)
      setPairError('')
      setPaired(false)
    }
  }, [open])

  const handleSelectChannel = (meta: ChannelMeta) => {
    if (meta.fields.length === 0) {
      // No configurable fields (e.g. WhatsApp) — show CLI guidance
      setSelectedChannel(meta)
      setStep('configure')
      return
    }
    setSelectedChannel(meta)
    setStep('configure')
  }

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }))
  }

  const isConfigValid = () => {
    if (!selectedChannel) return false
    return selectedChannel.fields.every(
      (f) => !f.required || fieldValues[f.key]?.trim(),
    )
  }

  const handleNext = () => {
    if (step === 'configure' && selectedChannel?.dmPolicies) {
      setStep('policy')
    } else {
      handleSave()
    }
  }

  const handleSave = async () => {
    if (!selectedChannel) return
    setSaving(true)
    setSaveError('')

    const config: Record<string, string> = { ...fieldValues }
    if (displayName.trim()) config.name = displayName.trim()
    if (selectedChannel.dmPolicies) config.dmPolicy = dmPolicy

    try {
      const result = await electron.saveChannelConfig(
        selectedChannel.id,
        accountId.trim() || 'default',
        config,
      )
      if (result.success) {
        onSuccess()
        setStep('done')
      } else {
        setSaveError(result.error ?? 'Failed to save')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePair = async () => {
    if (pairCode.length < 8 || !selectedChannel) return
    setPairing(true)
    setPairError('')
    try {
      const result = await electron.pairChannel(selectedChannel.id, pairCode)
      if (result.success) {
        setPaired(true)
        const key = `${selectedChannel.id}:${accountId.trim() || 'default'}`
        markChannelPaired(key)
      } else {
        setPairError(result.error ?? 'Pairing failed')
      }
    } catch (err) {
      setPairError(err instanceof Error ? err.message : 'Pairing failed')
    } finally {
      setPairing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && t('channels.modal.selectType')}
            {step === 'configure' && t('channels.modal.configure')}
            {step === 'policy' && t('channels.modal.accessPolicy')}
            {step === 'done' && t('channels.modal.doneTitle')}
          </DialogTitle>
          <DialogClose />
        </DialogHeader>

        {/* Step 1: Select Channel Type */}
        {step === 'select' && (
          <div className="grid gap-2 grid-cols-2">
            {CHANNEL_REGISTRY.map((meta) => {
              const isConfigured = configuredChannelIds.includes(meta.id)
              return (
                <button
                  key={meta.id}
                  className="flex flex-col items-start gap-1 rounded-md border p-3 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => handleSelectChannel(meta)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="font-medium text-sm">{meta.label}</span>
                    {isConfigured && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t(meta.blurb as TranslationKey)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Step 2: Configure Channel */}
        {step === 'configure' && selectedChannel && (
          <div className="space-y-4">
            {selectedChannel.fields.length === 0 ? (
              // No fields — CLI guidance
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  {t('channels.cliOnly')}
                </p>
                <code className="mt-2 block text-xs font-mono text-muted-foreground">
                  openclaw channels add {selectedChannel.id}
                </code>
              </div>
            ) : (
              <>
                {selectedChannel.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t(field.labelKey as TranslationKey)}
                      {field.required && <span className="text-destructive ml-0.5">*</span>}
                    </label>
                    {field.type === 'select' && field.options ? (
                      <select
                        className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                        value={fieldValues[field.key] ?? field.options[0]?.value ?? ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      >
                        {field.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholderKey ? t(field.placeholderKey as TranslationKey) : ''}
                        className="w-full h-8 rounded-md border bg-background px-3 text-sm"
                        value={fieldValues[field.key] ?? ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      />
                    )}
                    {field.helpKey && (
                      <p className="text-xs text-muted-foreground">
                        {t(field.helpKey as TranslationKey)}
                        {field.helpUrl && (
                          <button
                            className="inline-flex items-center gap-0.5 ml-1 text-blue-500 hover:underline"
                            onClick={() => electron.openLink(field.helpUrl!)}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                ))}

                {/* Account ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('channels.accountId')}
                  </label>
                  <input
                    type="text"
                    placeholder="default"
                    className="w-full h-8 rounded-md border bg-background px-3 text-sm"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  />
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('channels.displayName')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('channels.displayNamePlaceholder')}
                    className="w-full h-8 rounded-md border bg-background px-3 text-sm"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </>
            )}

            {saveError && <p className="text-xs text-destructive">{saveError}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('select')}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('channels.modal.back')}
              </Button>
              {selectedChannel.fields.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!isConfigValid() || saving}
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : selectedChannel.dmPolicies ? (
                    <>
                      {t('channels.modal.next')}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    t('auth.save')
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: DM Access Policy */}
        {step === 'policy' && selectedChannel && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('channels.policy.description')}
            </p>
            <div className="space-y-2">
              {DM_POLICIES.map((policy) => (
                <label
                  key={policy}
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                    dmPolicy === policy ? 'border-blue-500 bg-blue-500/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="dmPolicy"
                    value={policy}
                    checked={dmPolicy === policy}
                    onChange={() => setDmPolicy(policy)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium">{t(`channels.policy.${policy}` as TranslationKey)}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t(`channels.policy.${policy}Desc` as TranslationKey)}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {saveError && <p className="text-xs text-destructive">{saveError}</p>}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('channels.modal.back')}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('auth.save')}
              </Button>
            </div>
          </div>
        )}
        {/* Step 4: Done — Next Steps & Pairing */}
        {step === 'done' && selectedChannel && (
          <div className="space-y-4">
            {/* Success banner */}
            <div className="flex items-center gap-3 rounded-md border border-green-500/30 bg-green-500/5 p-3">
              <PartyPopper className="h-5 w-5 text-green-500 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">
                {t('channels.done.saved', { channel: selectedChannel.label })}
              </p>
            </div>

            {/* Step 1: Restart gateway */}
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">1</span>
                <span className="text-sm text-muted-foreground">{t('channels.done.stepRestart')}</span>
              </div>
              <div className="ml-7">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setRestarting(true)
                    setRestartError('')
                    try {
                      await electron.restartGateway()
                      const envInfo = useAppStore.getState().envInfo
                      if (envInfo) useAppStore.getState().setEnvInfo({ ...envInfo, gatewayRunning: true })
                      setRestarted(true)
                    } catch (err) {
                      setRestartError(err instanceof Error ? err.message : 'Restart failed')
                    } finally {
                      setRestarting(false)
                    }
                  }}
                  disabled={restarting || restarted}
                >
                  {restarting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : restarted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <RotateCw className="h-3.5 w-3.5" />
                  )}
                  {restarted ? t('channels.done.restarted') : t('auth.restart')}
                </Button>
                {restartError && <p className="text-xs text-destructive mt-1">{restartError}</p>}
              </div>
            </div>

            {/* Step 2: Open platform */}
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">2</span>
              <span className="text-sm text-muted-foreground">
                {t(`channels.done.stepOpen.${selectedChannel.id}` as TranslationKey)}
              </span>
            </div>

            {/* Step 3: Pairing input (only when dmPolicy is pairing) */}
            {dmPolicy === 'pairing' && selectedChannel.dmPolicies && (
              <div className="space-y-2">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">3</span>
                  <span className="text-sm text-muted-foreground">{t('channels.done.stepPairing')}</span>
                </div>
                <div className="ml-7 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t('channels.done.pairingFlow1')}
                  </p>
                  {paired ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {t('channels.done.pairingSuccess')}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t('channels.done.pairCodePlaceholder')}
                        className="w-44 h-8 rounded-md border bg-background px-3 text-sm font-mono tracking-widest text-center"
                        value={pairCode}
                        maxLength={8}
                        onChange={(e) => {
                          setPairCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8))
                          setPairError('')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && pairCode.length === 8) handlePair()
                        }}
                        disabled={!restarted}
                      />
                      <Button
                        size="sm"
                        onClick={handlePair}
                        disabled={pairCode.length < 8 || pairing || !restarted}
                      >
                        {pairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('channels.done.pair')}
                      </Button>
                    </div>
                  )}
                  {!restarted && !paired && (
                    <p className="text-xs text-muted-foreground">{t('channels.done.restartFirst')}</p>
                  )}
                  {pairError && <p className="text-xs text-destructive">{pairError}</p>}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => onOpenChange(false)}>
                {t('channels.done.close')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
