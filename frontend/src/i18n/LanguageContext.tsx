'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import ru from './dictionaries/ru.json'
import en from './dictionaries/en.json'
import cs from './dictionaries/cs.json'
import uk from './dictionaries/uk.json'

type Language = 'ru' | 'en' | 'cs' | 'uk'
type Dictionary = Record<string, any>

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string, defaultValue?: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (key, defaultValue) => defaultValue !== undefined ? defaultValue : key,
})

const dictionaries: Record<Language, any> = {
  ru,
  en,
  cs,
  uk,
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ru')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // `language` was used by the old auth screen. Migrate it once so every
    // route now reads the same preference.
    const supportedLanguages: Language[] = ['ru', 'en', 'cs', 'uk']
    const appLang = localStorage.getItem('app_lang') as Language | null
    const legacyLang = localStorage.getItem('language') as Language | null
    const savedLang = appLang && supportedLanguages.includes(appLang)
      ? appLang
      : legacyLang && supportedLanguages.includes(legacyLang)
        ? legacyLang
        : null
    let resolvedLang: Language

    if (savedLang) {
      resolvedLang = savedLang
    } else {
      const browserLang = navigator.language.slice(0, 2)
      resolvedLang = browserLang === 'ru' || browserLang === 'uk' || browserLang === 'cs'
        ? browserLang
        : 'en'
    }

    setLangState(resolvedLang)
    // Keep the legacy key synchronized until every older dashboard widget has
    // migrated to LanguageContext. app_lang remains the canonical value.
    localStorage.setItem('app_lang', resolvedLang)
    localStorage.setItem('language', resolvedLang)
    document.documentElement.lang = resolvedLang
    setIsLoaded(true)
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('app_lang', newLang)
    localStorage.setItem('language', newLang)
    document.documentElement.lang = newLang
  }

  const t = (path: string, defaultValue?: string): string => {
    const keys = path.split('.')
    let current: any = dictionaries[lang]
    for (const key of keys) {
      if (current === undefined || current === null || current[key] === undefined) {
        console.warn(`Translation missing for key: ${path} in lang: ${lang}`)
        return defaultValue !== undefined ? defaultValue : path
      }
      current = current[key]
    }
    return current as string
  }

  // Prevent hydration mismatch by not rendering children until language is determined
  // But to be SEO friendly we can render with default RU and suppress hydration warning in body
  // We'll just render it
  
  if (!isLoaded) return null // Optional: hide until lang loaded, prevents flash

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
