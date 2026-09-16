'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { translations, Language, TranslationKey } from '@/lib/i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('massapro-language') as Language
      if (saved === 'en' || saved === 'es' || saved === 'he') return saved
    }
    return 'en'
  })

  // Sync document direction (RTL for Hebrew) so the whole UI flips
  // right-to-left when Hebrew is selected, including all shadcn/ui
  // components that listen to the <html dir> attribute.
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
      document.documentElement.lang = language
    }
  }, [language])

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('massapro-language', lang)
  }, [])

  // Translate with English fallback: if the selected language's dictionary
  // doesn't have the key (Hebrew only covers the new feature + essentials
  // so far), fall back to the English value, then to the raw key.
  const t = useCallback((key: string): string => {
    const dict = translations[language] || translations.en
    return dict[key as TranslationKey] || translations.en[key as TranslationKey] || key
  }, [language])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
