'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import ru from './dictionaries/ru.json'
import en from './dictionaries/en.json'
import cs from './dictionaries/cs.json'

type Language = 'ru' | 'en' | 'cs'
type Dictionary = Record<string, any>

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ru',
  setLang: () => {},
  t: (key) => key,
})

const dictionaries: Record<Language, Dictionary> = {
  ru,
  en,
  cs,
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('ru')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Detect system language or load from localStorage
    const savedLang = localStorage.getItem('app_lang') as Language
    if (savedLang && (savedLang === 'ru' || savedLang === 'en' || savedLang === 'cs')) {
      setLangState(savedLang)
    } else {
      const browserLang = navigator.language.slice(0, 2)
      if (browserLang === 'ru') {
        setLangState('ru')
      } else if (browserLang === 'cs') {
        setLangState('cs')
      } else {
        setLangState('en') // Default to EN for others to feel premium global
      }
    }
    setIsLoaded(true)
  }, [])

  const setLang = (newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem('app_lang', newLang)
  }

  const t = (path: string): string => {
    const keys = path.split('.')
    let current: any = dictionaries[lang]
    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation missing for key: ${path} in lang: ${lang}`)
        return path
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
