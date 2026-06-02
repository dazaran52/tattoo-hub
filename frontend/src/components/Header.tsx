'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Gem, Menu, X, LayoutDashboard, Settings, Plus, Moon, Sun, Globe, Ticket, Copy, Bell, BarChart2 } from 'lucide-react'
import { Profile } from '@/lib/supabase'
import { subscribeToPush } from '@/lib/push'
import { getTranslation, Language } from '@/lib/i18n'
import { TransactionHistoryModal } from '@/components/TransactionHistoryModal'
import { NotificationsMenu } from '@/components/NotificationsMenu'
import { toast } from 'react-hot-toast'

interface HeaderProps {
  profile: Profile
  onLogout: () => void
}

export function Header({ profile, onLogout }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const [language, setLanguage] = useState<string>('cs')
  const [showHistory, setShowHistory] = useState(false)
  const [isSubscribing, setIsSubscribing] = useState(false)

  const handleSubscribe = async () => {
    try {
      setIsSubscribing(true)
      await subscribeToPush()
      toast.success('Уведомления успешно включены!')
    } catch (err: any) {
      if (Notification.permission === 'denied') {
        toast.error('Вы заблокировали уведомления в браузере. Разрешите их в настройках.')
      } else {
        toast.error('Не удалось включить уведомления')
      }
    } finally {
      setIsSubscribing(false)
    }
  }
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
      const savedTheme = localStorage.getItem('theme') || 'dark'
      setTheme(savedTheme as 'dark' | 'light')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    const root = document.documentElement
    if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
  }

  const toggleLanguage = () => {
    const newLang = language === 'cs' ? 'en' : 'cs'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
    window.location.reload()
  }
  
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)
  
  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
              Tattoo
            </h1>
            <div className="w-[3.25rem] h-8 bg-gradient-to-br from-neutral-800 to-neutral-900 dark:from-neutral-100 dark:to-neutral-400 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white dark:text-neutral-950 font-bold text-sm tracking-widest">HUB</span>
            </div>
          </button>

          {/* Right Section */}
          <div className="flex items-center gap-6">
            {/* Email */}
            <span className="hidden sm:block text-sm text-neutral-600 dark:text-neutral-300">
              {profile.email}
            </span>

            {/* Notifications Button */}
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="p-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              title="Включить Push-уведомления"
            >
              <Bell className={`w-5 h-5 ${isSubscribing ? 'animate-pulse' : ''}`} />
            </button>

            {/* Credits Counter & Top-up */}
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowHistory(true)}
                title="История пополнений"
                className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 transition-colors pl-4 pr-3 py-2 rounded-l-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer"
              >
                <Gem className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                <span className="font-bold text-neutral-900 dark:text-white">{profile.credits}</span>
                <span className="text-sm text-neutral-600 dark:text-neutral-300 pr-1">{t('credit_plural')}</span>
                
                {profile.discount_tokens > 0 && (
                  <div className="flex items-center gap-1 ml-2 pl-2 border-l border-neutral-300 dark:border-neutral-600" title="Скидочные токены (50% скидка на лид)">
                    <Ticket className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-neutral-900 dark:text-white">{profile.discount_tokens}</span>
                  </div>
                )}
              </button>
              <button
                onClick={() => router.push('/top-up')}
                className="flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white px-2 py-2 rounded-r-lg transition-colors border border-cyan-500 dark:border-cyan-600"
                title="Пополнить баланс"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Change Language"
            >
              <Globe className="w-5 h-5" />
              <span className="uppercase">{language}</span>
            </button>

            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications Menu */}
            <NotificationsMenu />

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
                  <a href="/analytics" className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <BarChart2 className="w-4 h-4" />
                    Аналитика
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
                  {profile.own_referral_code && (
                    <>
                      <div className="border-t border-neutral-200 dark:border-neutral-800 my-1"></div>
                      <div className="px-4 py-2 flex items-center justify-between group cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
                           onClick={() => {
                             navigator.clipboard.writeText(profile.own_referral_code || '');
                             import('react-hot-toast').then(mod => mod.default.success('Реферальный код скопирован!'));
                           }}
                           title="Скопировать реферальный код">
                        <div className="flex flex-col">
                          <span className="text-xs text-neutral-500">Реферальный код</span>
                          <span className="text-sm font-mono font-bold text-neutral-900 dark:text-white">{profile.own_referral_code}</span>
                        </div>
                        <Copy className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
                      </div>
                    </>
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

      <TransactionHistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </header>
  )
}
