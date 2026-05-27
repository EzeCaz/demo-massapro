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
      if (saved === 'en' || saved === 'es') return saved
    }
    return 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('massapro-language', lang)
  }, [])

  const t = useCallback((key: string): string => {
    const dict = translations[language] || translations.en
    return dict[key as TranslationKey] || key
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
