import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import koTranslations from '../locales/ko.json'
import enTranslations from '../locales/en.json'

export type Language = 'ko' | 'en'
export type TimeFormat = '24h' | '12h'

interface I18nState {
  language: Language
  timeFormat: TimeFormat
  translations: Record<string, any>
  setLanguage: (language: Language) => void
  setTimeFormat: (format: TimeFormat) => void
  t: (key: string, params?: Record<string, string | number>) => string
  initializeI18n: () => void
}

const translations = {
  ko: koTranslations,
  en: enTranslations
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'ko',
      timeFormat: '24h',
      translations: koTranslations,
      
      setLanguage: (language: Language) => {
        set({ 
          language, 
          translations: translations[language] 
        })
      },
      
      setTimeFormat: (timeFormat: TimeFormat) => {
        set({ timeFormat })
      },
      
      t: (key: string, params?: Record<string, string | number>) => {
        const { translations } = get()
        const keys = key.split('.')
        let value: any = translations
        
        // Navigate through nested object
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k]
          } else {
            console.warn(`Translation key "${key}" not found`)
            return key // Return key if translation not found
          }
        }
        
        // Handle string interpolation
        if (typeof value === 'string' && params) {
          return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey]?.toString() || match
          })
        }
        
        return typeof value === 'string' ? value : key
      },
      
      initializeI18n: () => {
        const { language } = get()
        set({ translations: translations[language] })
      }
    }),
    {
      name: 'i18n-settings',
      partialize: (state) => ({
        language: state.language,
        timeFormat: state.timeFormat
      })
    }
  )
)

// Helper hook for easy translation access
export const useTranslation = () => {
  const { t, language, timeFormat } = useI18nStore()
  return { t, language, timeFormat }
}


