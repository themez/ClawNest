import { useEffect, useState, useRef, useCallback } from 'react'
// Card wrapper removed — parent CollapsibleSection provides the Card shell
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { useElectron } from '@/hooks/useElectron'
import { useAppStore } from '@/stores/app-store'
import { useTranslation } from '@/i18n'
import {
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  Globe,
  RotateCw,
  Trash2,
} from 'lucide-react'
import type { ModelsAuthStatus, AuthProviderStatus } from '@shared/openclaw-types'

/* ================================================================== */
/*  Add Provider Modal                                                 */
/* ================================================================== */

interface AddProviderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oauthProviders: string[]
  knownProviders: string[]
  electron: ReturnType<typeof useElectron>
  onSuccess: () => void
}

function AddProviderModal({
  open,
  onOpenChange,
  oauthProviders,
  knownProviders,
  electron,
  onSuccess,
}: AddProviderModalProps) {
  const { t, translatePrompt } = useTranslation()
  const [oauthRunning, setOauthRunning] = useState(false)
  const [oauthOutput, setOauthOutput] = useState<string[]>([])
  const [oauthExitCode, setOauthExitCode] = useState<number | null>(null)
  const [promptMessage, setPromptMessage] = useState<string | null>(null)
  const [promptPlaceholder, setPromptPlaceholder] = useState('')
  const [promptInput, setPromptInput] = useState('')
  const [newProviderInput, setNewProviderInput] = useState('')
  const [isCustomProvider, setIsCustomProvider] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [endpointOptions, setEndpointOptions] = useState<{ label: string; value: string }[] | null>(null)
  const [selectedEndpoint, setSelectedEndpoint] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  // Keep stable refs for callbacks so IPC listeners never detach mid-OAuth
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setOauthRunning(false)
      setOauthOutput([])
      setOauthExitCode(null)
      setPromptMessage(null)
      setPromptInput('')
      setNewProviderInput('')
      setIsCustomProvider(false)
      setTokenInput('')
      setSaving(false)
      setSaveError('')
      setEndpointOptions(null)
      setSelectedEndpoint('')
    }
  }, [open])

  // Streaming output listeners for OAuth progress
  // Only depend on `open` and `electron` — callbacks accessed via refs
  useEffect(() => {
    if (!open) return

    const unsubOutput = electron.onAuthLoginOutput((_event: unknown, data: string) => {
      setOauthOutput((prev) => [...prev, data])
      if (logRef.current) {
        requestAnimationFrame(() => {
          logRef.current?.scrollTo(0, logRef.current.scrollHeight)
        })
      }
    })
    const unsubExit = electron.onAuthLoginExit((_event: unknown, code: number) => {
      setOauthRunning(false)
      setOauthExitCode(code)
      setPromptMessage(null)
      setPromptInput('')
      if (code === 0) {
        // Show success briefly, then close
        setTimeout(() => {
          onOpenChangeRef.current(false)
          onSuccessRef.current()
        }, 1000)
      }
    })
    const unsubPrompt = electron.onAuthLoginPrompt(
      (_event: unknown, message: string, placeholder?: string) => {
        setPromptMessage(message)
        setPromptPlaceholder((placeholder as string) ?? '')
        // Pre-fill with placeholder for device-code confirmations so user can just click Submit
        setPromptInput((placeholder as string) ?? '')
      },
    )
    return () => {
      unsubOutput()
      unsubExit()
      unsubPrompt()
    }
  }, [open, electron])

  const handleOAuthLogin = async (provider: string) => {
    setOauthRunning(true)
    setOauthOutput([])
    setOauthExitCode(null)
    try {
      await electron.startOAuthLogin(provider)
    } catch {
      setOauthOutput((prev) => [...prev, t('auth.oauthFailed') + '\n'])
      setOauthRunning(false)
      setOauthExitCode(1)
    }
  }

  const handleCancelOAuth = async () => {
    try {
      await electron.cancelOAuthLogin()
    } catch {
      // Force-reset UI state if cancel IPC fails
      setOauthRunning(false)
      setOauthExitCode(1)
    }
  }

  const handleSaveToken = async () => {
    const provider = newProviderInput.trim()
    const token = tokenInput.trim()
    if (!provider || !token) return

    setSaving(true)
    setSaveError('')
    try {
      const result = await electron.saveModelAuthToken(provider, token, selectedEndpoint || undefined)
      if (result.success) {
        onOpenChange(false)
        onSuccess()
      } else {
        setSaveError(result.error ?? 'Failed to save token')
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save token')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent preventClose={oauthRunning}>
        <DialogHeader>
          <DialogTitle>{t('auth.addProvider')}</DialogTitle>
          {!oauthRunning && <DialogClose />}
        </DialogHeader>

        {/* OAuth Login buttons */}
        {oauthProviders.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{t('auth.oauthLogin')}</label>
            <div className="grid gap-1.5 grid-cols-2">
              {oauthProviders.map((provider) => (
                <Button
                  key={provider}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => handleOAuthLogin(provider)}
                  disabled={oauthRunning}
                >
                  {oauthRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  {provider}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Separator */}
        {oauthProviders.length > 0 && (
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
            </div>
          </div>
        )}

        {/* API Key / Token entry */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">{t('auth.apiKeyToken')}</label>
          <div className="flex gap-2">
            {knownProviders.length > 0 && !isCustomProvider ? (
              <select
                className="w-40 h-8 rounded-md border bg-background px-2 text-sm"
                value={newProviderInput}
                onChange={(e) => {
                  if (e.target.value === '__other__') {
                    setIsCustomProvider(true)
                    setNewProviderInput('')
                    setEndpointOptions(null)
                    setSelectedEndpoint('')
                  } else {
                    setNewProviderInput(e.target.value)
                    // Fetch endpoint variants for this provider
                    if (e.target.value) {
                      electron.getProviderEndpoints(e.target.value).then((eps) => {
                        setEndpointOptions(eps)
                        setSelectedEndpoint(eps?.[0]?.value ?? '')
                      }).catch(() => {
                        setEndpointOptions(null)
                        setSelectedEndpoint('')
                      })
                    } else {
                      setEndpointOptions(null)
                      setSelectedEndpoint('')
                    }
                  }
                }}
              >
                <option value="">{t('auth.providerPlaceholder')}</option>
                {knownProviders.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
                <option value="__other__">{t('auth.otherProvider')}</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder={t('auth.providerIdPlaceholder')}
                className="w-40 h-8 rounded-md border bg-background px-3 text-sm"
                value={newProviderInput}
                onChange={(e) => setNewProviderInput(e.target.value)}
                autoFocus={isCustomProvider}
              />
            )}
            {endpointOptions && endpointOptions.length > 0 && (
              <select
                className="w-32 h-8 rounded-md border bg-background px-2 text-sm"
                value={selectedEndpoint}
                onChange={(e) => setSelectedEndpoint(e.target.value)}
              >
                {endpointOptions.map((ep) => (
                  <option key={ep.value} value={ep.value}>{ep.label}</option>
                ))}
              </select>
            )}
            <input
              type="password"
              placeholder={t('auth.pasteApiKey')}
              className="flex-1 h-8 rounded-md border bg-background px-3 text-sm"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveToken()
              }}
            />
            <Button
              size="sm"
              onClick={handleSaveToken}
              disabled={!newProviderInput.trim() || !tokenInput.trim() || saving}
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : t('auth.save')}
            </Button>
          </div>
          {saveError && <p className="text-xs text-destructive">{saveError}</p>}
        </div>

        {/* OAuth progress area — visible whenever OAuth is active or has output */}
        {(oauthRunning || oauthOutput.length > 0 || oauthExitCode !== null) && (
          <div className="space-y-2 mt-3">
            {/* Log output */}
            <div
              ref={logRef}
              className="h-36 overflow-y-auto rounded-md bg-background border p-2 font-mono text-xs leading-5 whitespace-pre-wrap"
            >
              {oauthOutput.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {oauthRunning && !promptMessage && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                  {oauthOutput.length === 0 && t('auth.startingOAuth')}
                </span>
              )}
            </div>

            {/* Cancel button */}
            {oauthRunning && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleCancelOAuth}
              >
                {t('auth.cancel')}
              </Button>
            )}

            {/* Prompt input — always rendered when prompt is active, independent of log output */}
            {oauthRunning && promptMessage && (() => {
              const isDeviceCodeConfirm = /Your verification code is:/i.test(promptMessage)
              const translatedPrompt = translatePrompt(promptMessage)
              return (
                <div className="space-y-1.5 rounded-md border border-blue-500/30 bg-blue-500/5 p-2">
                  <p className="text-xs font-medium whitespace-pre-line">{translatedPrompt}</p>
                  <div className="flex gap-2">
                    {!isDeviceCodeConfirm && (
                      <input
                        type="text"
                        placeholder={promptPlaceholder}
                        className="flex-1 h-8 rounded-md border bg-background px-3 text-sm font-mono"
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && promptInput.trim()) {
                            electron.replyAuthPrompt(promptInput.trim())
                            setPromptMessage(null)
                            setPromptInput('')
                          }
                        }}
                        autoFocus
                      />
                    )}
                    <Button
                      size="sm"
                      className={isDeviceCodeConfirm ? 'w-full' : ''}
                      onClick={() => {
                        const value = promptInput.trim() || 'confirm'
                        electron.replyAuthPrompt(value)
                        setPromptMessage(null)
                        setPromptInput('')
                      }}
                      disabled={!isDeviceCodeConfirm && !promptInput.trim()}
                    >
                      {isDeviceCodeConfirm ? (
                        <>
                          <Globe className="h-3 w-3" />
                          {t('auth.openBrowser')}
                        </>
                      ) : t('auth.submit')}
                    </Button>
                  </div>
                </div>
              )
            })()}

            {!oauthRunning && oauthExitCode !== null && oauthExitCode !== 0 && (
              <p className="text-xs text-destructive">{t('auth.oauthLoginFailed', { code: oauthExitCode })}</p>
            )}
            {!oauthRunning && oauthExitCode === 0 && (
              <p className="text-xs text-green-600">{t('auth.loginSuccessful')}</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================== */
/*  ApiAuthSection — Main Card                                         */
/* ================================================================== */

export type AuthSectionStatus = 'no-provider' | 'no-model' | 'ok'

interface ApiAuthSectionProps {
  onStatusChange?: (status: AuthSectionStatus) => void
}

export function ApiAuthSection({ onStatusChange }: ApiAuthSectionProps) {
  const electron = useElectron()
  const { t } = useTranslation()
  const cachedAuthStatus = useAppStore((s) => s.authStatus)
  const setCachedAuthStatus = useAppStore((s) => s.setAuthStatus)
  const envInfo = useAppStore((s) => s.envInfo)
  const setEnvInfo = useAppStore((s) => s.setEnvInfo)
  const [authStatus, setAuthStatus] = useState<ModelsAuthStatus | null>(cachedAuthStatus)
  const [loading, setLoading] = useState(!cachedAuthStatus)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [needsRestart, setNeedsRestart] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [allModels, setAllModels] = useState<{ key: string; name: string; available: boolean }[]>(
    [],
  )
  const [modelInput, setModelInput] = useState('')
  const [settingModel, setSettingModel] = useState(false)
  const [modelError, setModelError] = useState('')
  const [restartError, setRestartError] = useState('')
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [dialogOpen, setDialogOpen] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const status = await electron.getModelsAuthStatus()
      setAuthStatus(status)
      setCachedAuthStatus(status)
    } catch {
      const empty: ModelsAuthStatus = {
        defaultModel: null,
        missingProvidersInUse: [],
        providersWithOAuth: [],
        providers: [],
      }
      setAuthStatus(empty)
    } finally {
      setLoading(false)
    }
  }, [electron, setCachedAuthStatus])

  const [modelsLoaded, setModelsLoaded] = useState(allModels.length > 0)

  const refreshModelsTracked = useCallback(() => {
    electron.listModels().then((models) => {
      setAllModels(models)
      setModelsLoaded(true)
    }).catch(() => {
      setModelsLoaded(true) // mark loaded even on error to avoid stuck state
    })
  }, [electron])

  useEffect(() => {
    fetchStatus()
    if (!modelsLoaded) {
      refreshModelsTracked()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Derived: is the default model usable with a configured provider?
  const hasConfiguredProvider = (authStatus?.providers ?? []).some((p) => p.status === 'ok')
  const defaultModelAvailable = authStatus?.defaultModel
    ? allModels.some((m) => m.available && m.key === authStatus.defaultModel)
    : false
  // Only report status after both authStatus and models have loaded
  const ready = !loading && modelsLoaded
  const authSectionStatus: AuthSectionStatus = !hasConfiguredProvider
    ? 'no-provider'
    : !defaultModelAvailable
      ? 'no-model'
      : 'ok'

  useEffect(() => {
    if (ready) onStatusChange?.(authSectionStatus)
  }, [authSectionStatus, ready, onStatusChange])

  const handleSaveToken = async (provider: string, endpoint?: string) => {
    const token = tokenInputs[provider]?.trim()
    if (!token) return

    setSaving((p) => ({ ...p, [provider]: true }))
    setSaveErrors((p) => ({ ...p, [provider]: '' }))

    try {
      const result = await electron.saveModelAuthToken(provider, token, endpoint)
      if (result.success) {
        setTokenInputs((p) => ({ ...p, [provider]: '' }))
        setExpandedProvider(null)
        setNeedsRestart(true)
        await fetchStatus()
      } else {
        setSaveErrors((p) => ({ ...p, [provider]: result.error ?? 'Failed to save token' }))
      }
    } catch (err) {
      setSaveErrors((p) => ({
        ...p,
        [provider]: err instanceof Error ? err.message : 'Failed to save token',
      }))
    } finally {
      setSaving((p) => ({ ...p, [provider]: false }))
    }
  }

  const setModelTo = async (model: string) => {
    setSettingModel(true)
    setModelError('')
    try {
      const result = await electron.setDefaultModel(model)
      if (result.success) {
        setModelInput('')
        setNeedsRestart(true)
        await fetchStatus()
        refreshModelsTracked()
      } else {
        setModelError(result.error ?? 'Failed to set model')
      }
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Failed to set model')
    } finally {
      setSettingModel(false)
    }
  }

  const handleSetModel = () => {
    const model = modelInput.trim()
    if (model) setModelTo(model)
  }

  const handleRestart = async () => {
    setRestarting(true)
    setRestartError('')
    try {
      await electron.restartGateway()
      if (envInfo) setEnvInfo({ ...envInfo, gatewayRunning: true })
      setNeedsRestart(false)
      await fetchStatus()
      refreshModelsTracked()
    } catch (err) {
      setRestartError(err instanceof Error ? err.message : 'Gateway restart failed')
    } finally {
      setRestarting(false)
    }
  }

  const handleAddProviderSuccess = useCallback(() => {
    setNeedsRestart(true)
    fetchStatus()
    refreshModelsTracked()
  }, [fetchStatus, refreshModelsTracked])

  const handleDeleteProvider = async (provider: string) => {
    setDeleting((p) => ({ ...p, [provider]: true }))
    try {
      const result = await electron.deleteModelAuth(provider)
      if (result.success) {
        setExpandedProvider(null)
        setNeedsRestart(true)
        await fetchStatus()
      }
    } catch {
      // Deletion failed silently
    } finally {
      setDeleting((p) => ({ ...p, [provider]: false }))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('auth.loading')}
      </div>
    )
  }

  // OAuth provider set from backend
  const oauthProviderSet = new Set(authStatus?.providersWithOAuth ?? [])

  // Configured providers: those returned by `models status` with status info
  const configuredProviders = (authStatus?.providers ?? []).filter((p) => p.status === 'ok')
  const missingProviders = (authStatus?.providers ?? []).filter((p) => p.status !== 'ok')
  // Also include missingProvidersInUse that aren't in provider list yet
  const knownProviderIds = new Set((authStatus?.providers ?? []).map((p) => p.provider))
  const extraMissing: AuthProviderStatus[] = (authStatus?.missingProvidersInUse ?? [])
    .filter((name) => !knownProviderIds.has(name))
    .map((name) => ({ provider: name, status: 'missing' as const, profiles: [] }))

  const allMissing = [...missingProviders, ...extraMissing]

  // Available models for the dropdown
  const availableModels = allModels.filter((m) => m.available)

  const renderProviderRow = (p: AuthProviderStatus) => {
    const isMissing = p.status !== 'ok'
    const isExpanded = expandedProvider === p.provider
    const supportsOAuth = oauthProviderSet.has(p.provider)

    return (
      <div key={p.provider} className="border rounded-md">
        <div
          className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
          onClick={() => setExpandedProvider(isExpanded ? null : p.provider)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">{p.provider}</span>
          </div>
          <div className="flex items-center gap-2">
            {isMissing ? (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5" />
                {p.status === 'expired' ? t('auth.statusExpired') : t('auth.statusMissing')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('auth.statusOk')}
              </span>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t space-y-3">
            {/* Token / API Key input */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" />
                {t('auth.apiKeyToken')}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={t('auth.pasteYourApiKey')}
                  className="flex-1 h-8 rounded-md border bg-background px-3 text-sm"
                  value={tokenInputs[p.provider] ?? ''}
                  onChange={(e) =>
                    setTokenInputs((prev) => ({ ...prev, [p.provider]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveToken(p.provider)
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleSaveToken(p.provider)}
                  disabled={!tokenInputs[p.provider]?.trim() || saving[p.provider]}
                >
                  {saving[p.provider] ? <Loader2 className="h-3 w-3 animate-spin" /> : t('auth.save')}
                </Button>
              </div>
              {saveErrors[p.provider] && (
                <p className="text-xs text-destructive">{saveErrors[p.provider]}</p>
              )}
            </div>

            {/* OAuth Login */}
            {supportsOAuth && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {t('auth.oauthLogin')}
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(true)
                  }}
                >
                  <Globe className="h-3 w-3" />
                  {t('auth.loginWithBrowser')}
                </Button>
              </div>
            )}

            {/* Delete */}
            <div className="pt-1 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteProvider(p.provider)}
                disabled={deleting[p.provider]}
              >
                {deleting[p.provider] ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                {t('auth.remove')}
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
          {/* Default Model */}
          <div className={`space-y-2 ${authSectionStatus === 'no-model' ? 'rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3' : ''}`}>
            <label className="text-xs font-medium text-muted-foreground">{t('auth.defaultModel')}</label>
            {authSectionStatus === 'no-model' && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {availableModels.length > 0 ? t('auth.selectModelPrompt') : t('auth.modelNotAvailable')}
              </p>
            )}
            {authStatus?.defaultModel && (
              <p className="text-sm font-mono">{authStatus.defaultModel}</p>
            )}
            {availableModels.length > 0 && (
              <select
                className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setModelInput(e.target.value)
                    setModelTo(e.target.value)
                  }
                }}
                disabled={settingModel}
              >
                <option value="">{t('auth.selectModel')}</option>
                {availableModels.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.name} ({m.key})
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('auth.modelInputPlaceholder')}
                className="flex-1 h-8 rounded-md border bg-background px-3 text-sm"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetModel()
                }}
              />
              <Button
                size="sm"
                onClick={handleSetModel}
                disabled={!modelInput.trim() || settingModel}
              >
                {settingModel ? <Loader2 className="h-3 w-3 animate-spin" /> : t('auth.set')}
              </Button>
            </div>
            {modelError && <p className="text-xs text-destructive">{modelError}</p>}
          </div>

          {/* Restart prompt */}
          {needsRestart && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
                <span className="text-sm text-yellow-600 dark:text-yellow-400">
                  {t('auth.restartBanner')}
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

          {/* Configured providers (status ok) */}
          {configuredProviders.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t('auth.configuredProviders')}
              </label>
              {configuredProviders.map(renderProviderRow)}
            </div>
          )}

          {/* Missing / needs attention */}
          {allMissing.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{t('auth.needsAttention')}</label>
              {allMissing.map(renderProviderRow)}
            </div>
          )}

          {configuredProviders.length === 0 && allMissing.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('auth.noProviders')}
            </p>
          )}

          {/* Add Provider button — opens modal */}
          <Button
            size="sm"
            variant="ghost"
            className="w-full"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3 w-3" />
            {t('auth.addProvider')}
          </Button>
      </div>

      {/* Add Provider Modal */}
      <AddProviderModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        oauthProviders={Array.from(oauthProviderSet)}
        knownProviders={Array.from(new Set([
          // Dynamic: from models list, auth status, and OAuth providers
          ...allModels.map((m) => m.key.split('/')[0]),
          ...(authStatus?.providers ?? []).map((p) => p.provider),
          ...(authStatus?.missingProvidersInUse ?? []),
          ...(authStatus?.providersWithOAuth ?? []),
          // Well-known openclaw provider IDs (paste-token compatible)
          'anthropic', 'openai-codex', 'moonshot', 'kimi-coding',
          'zai', 'google', 'xai', 'mistral', 'minimax',
          'qwen-portal', 'minimax-portal', 'together', 'huggingface',
          'openrouter', 'venice', 'qianfan', 'xiaomi', 'volcengine',
          'kilocode', 'opencode', 'chutes',
        ].filter(Boolean))).sort()}
        electron={electron}
        onSuccess={handleAddProviderSuccess}
      />
    </>
  )
}
