'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'

export function LanguageSelector() {
  const lang = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'cs', label: 'CS', name: 'Čeština' },
    { code: 'ru', label: 'RU', name: 'Русский' },
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'uk', label: 'UK', name: 'Українська' }
  ]

  const currentLang = languages.find(l => l.code === lang) || languages[0]

  const handleLanguageSelect = (newLang: string) => {
    setIsOpen(false)
    if (newLang === lang) return

    // Set cookie so middleware always remembers the choice
    document.cookie = `NEXT_LOCALE=${newLang}; path=/; max-age=31536000`

    // Replace locale in current path
    const newPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${newLang}/`)
    router.push(newPath || `/${newLang}`)
  }

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors"
      >
        <span>{currentLang.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full right-0 mt-2 w-36 py-1 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageSelect(l.code)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    lang === l.code ? 'text-white bg-white/10 font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
