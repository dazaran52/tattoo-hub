'use client'
import { useTranslations } from "next-intl";


import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

export function OfflineIndicator() {
    const t = useTranslations();
  const [isOnline, setIsOnline] = useState(true)
  const [showRestored, setShowRestored] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      setShowRestored(true)
      const timer = setTimeout(() => setShowRestored(false), 3000)
      return () => clearTimeout(timer)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowRestored(false)
    }

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] glass-dock px-4 py-2 rounded-full flex items-center gap-2 border border-red-500/30 text-red-400 text-xs font-bold shadow-[0_8px_30px_rgba(239,68,68,0.3)]"
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>{t('offlineModeNoNetwork')}</span>
        </motion.div>
      )}

      {isOnline && showRestored && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] glass-dock px-4 py-2 rounded-full flex items-center gap-2 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-[0_8px_30px_rgba(16,185,129,0.3)]"
        >
          <Wifi className="w-4 h-4" />
          <span>{t('connectionRestored')}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
