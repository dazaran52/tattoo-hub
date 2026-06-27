'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { X, Download } from 'lucide-react'

export function InstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Update UI notify the user they can install the PWA
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (e) {
        console.error('Notification permission error:', e)
      }
    }

    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    // We no longer need the prompt. Clear it up.
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  // Don't show on landing or login pages
  if (pathname === '/' || pathname === '/login') return null

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-28 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[400px] z-[9999] animate-fade-in-up">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Установить приложение</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Для быстрого доступа и уведомлений</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
          >
            Установить
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
