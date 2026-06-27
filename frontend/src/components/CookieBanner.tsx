'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent')
    if (!consent) {
      // Small delay so it doesn't pop up immediately on load and startle the user
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setIsVisible(false)
  }

  // Very minimalist, non-intrusive floating banner in bottom-left
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-4 left-4 z-[9999] max-w-sm w-[calc(100%-2rem)] md:w-auto"
        >
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
            
            <div className="flex items-center gap-3 flex-1 pl-2">
              <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0 text-cyan-600 dark:text-cyan-400">
                <Cookie className="w-4 h-4" />
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {useLanguage().lang === 'ru' 
                  ? <>Мы используем файлы cookie для улучшения работы сайта. Продолжая пользоваться сайтом, вы соглашаетесь с нашей <a href="/privacy" className="text-cyan-600 dark:text-cyan-400 hover:underline">Политикой конфиденциальности</a>.</>
                  : useLanguage().lang === 'cs'
                  ? <>Používáme soubory cookie ke zlepšení funkčnosti webu. Pokračováním v používání webu souhlasíte s naší <a href="/privacy" className="text-cyan-600 dark:text-cyan-400 hover:underline">Zásadou ochrany osobních údajů</a>.</>
                  : <>We use cookies to improve website functionality. By continuing to use the site, you agree to our <a href="/privacy" className="text-cyan-600 dark:text-cyan-400 hover:underline">Privacy Policy</a>.</>
                }
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors whitespace-nowrap"
              >
                ОК
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
