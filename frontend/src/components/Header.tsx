'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Coins, Menu, X, LayoutDashboard, Settings } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import { getTranslation, Language } from '@/lib/i18n'

interface HeaderProps {
  profile: Profile
  onLogout: () => void
}

export function Header({ profile, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const [language, setLanguage] = useState<string>('cs')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])
  
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)
  
  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-100 dark:to-neutral-400 rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-neutral-950 font-bold text-sm">OUT</span>
            </div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight">
              OUT Tattoo Leads
            </h1>
          </button>

          {/* Right Section */}
          <div className="flex items-center gap-6">
            {/* Email */}
            <span className="hidden sm:block text-sm text-neutral-600 dark:text-neutral-300">
              {profile.email}
            </span>

            {/* Credits Counter */}
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800/50 px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="font-bold text-neutral-900 dark:text-white">{profile.credits}</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-300">{t('credit_plural')}</span>
            </div>

            {/* Menu Button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl py-1 z-50">
                  <a href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <LayoutDashboard className="w-4 h-4" />
                    {t('dashboard')}
                  </a>
                  <a href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <Settings className="w-4 h-4" />
                    {t('settings')}
                  </a>
                  {profile.is_admin && (
                    <a href="/admin" className="flex items-center gap-3 px-4 py-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Panel
                    </a>
                  )}
                  <div className="border-t border-neutral-200 dark:border-neutral-800 my-1"></div>
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 w-full text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
