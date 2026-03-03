import { useEffect, useState } from 'react'
import { useTranslation } from '@/i18n'

type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }

export function UpdateBanner() {
  const { t } = useTranslation()
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api) return

    const unsubs = [
      api.onUpdaterAvailable((_e: unknown, version: string) => {
        setState({ status: 'available', version })
        setDismissed(false)
      }),
      api.onUpdaterDownloadProgress((_e: unknown, progress: { percent: number }) => {
        setState({ status: 'downloading', percent: Math.round(progress.percent) })
      }),
      api.onUpdaterDownloaded((_e: unknown, version: string) => {
        setState({ status: 'ready', version })
        setDismissed(false)
      }),
    ]

    return () => unsubs.forEach((unsub) => unsub())
  }, [])

  if (state.status === 'idle' || dismissed) return null

  return (
    <div className="flex items-center gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm dark:border-blue-800 dark:bg-blue-950">
      <span className="flex-1 text-blue-800 dark:text-blue-200">
        {state.status === 'available' && t('updater.available', { version: state.version })}
        {state.status === 'downloading' && t('updater.downloading', { percent: state.percent })}
        {state.status === 'ready' && t('updater.ready', { version: state.version })}
      </span>

      {state.status === 'ready' && (
        <button
          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
          onClick={() => window.electronAPI?.installUpdate()}
        >
          {t('updater.install')}
        </button>
      )}

      {state.status !== 'downloading' && (
        <button
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          onClick={() => setDismissed(true)}
        >
          {t('updater.later')}
        </button>
      )}
    </div>
  )
}
