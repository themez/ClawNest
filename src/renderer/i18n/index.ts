import { useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'
import { en } from './locales/en'
import { zh } from './locales/zh'

export type TranslationKey = keyof typeof en
export type Translations = Record<TranslationKey, string>

const locales: Record<string, Translations> = { en, zh }

export function useTranslation() {
  const language = useAppStore((s) => s.language)
  const translations = locales[language] ?? locales.en

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      let value: string = translations[key] ?? en[key] ?? key
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v))
        }
      }
      return value
    },
    [translations],
  )

  /**
   * Translate a backend prompt message by matching known patterns.
   * Returns the translated message, or the original if no pattern matches.
   */
  const translatePrompt = useCallback(
    (message: string): string => {
      // Pattern: "Your verification code is: XXXX\nCopy this code, then click Submit to open the browser."
      const codeMatch = message.match(
        /Your verification code is:\s*(\S+)/,
      )
      if (codeMatch) {
        const code = codeMatch[1]
        const line1 = t('auth.prompt.verificationCode', { code })
        const line2 = t('auth.prompt.copyAndSubmit')
        return `${line1}\n${line2}`
      }

      return message
    },
    [t],
  )

  return { t, language, translatePrompt }
}
