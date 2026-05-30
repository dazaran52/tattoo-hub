'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { SkeletonCard } from '@/components/SkeletonCard'
import { supabase, Profile } from '@/lib/supabase'
import { LeadsFeed } from '@/components/LeadsFeed'
import { getTranslation, Language } from '@/lib/i18n'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<string>('cs')

  // Load language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

  // Translation helper
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        window.location.href = '/login'
        return
      }

      // Fetch profile from backend API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const profileData = await response.json()
      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleUnlockSuccess = (newCredits: number) => {
    if (profile) {
      setProfile({ ...profile, credits: newCredits })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 h-16 animate-pulse" />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-xl max-w-md w-full mx-4 border border-red-100 dark:border-red-900">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Ошибка загрузки профиля</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Не удалось загрузить данные вашего профиля. Убедитесь, что сервер запущен (Render может просыпаться до 50 секунд) и переменная NEXT_PUBLIC_API_URL настроена на Vercel.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3 rounded-xl font-bold"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {t('welcome')}, {profile.email.split('@')[0]}
            </h2>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">
              {t('availableLeads')}
            </p>
          </div>
          
        </div>

        {/* Leads Feed or Status Message */}
        {profile.status === 'pending' ? (
          <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-amber-200 dark:border-amber-900 shadow-sm">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Заявка на рассмотрении</h3>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Ваш профиль мастера находится на ручной модерации. Как только администратор одобрит заявку, вы получите доступ к базе лидов.
            </p>
          </div>
        ) : profile.status === 'rejected' ? (
          <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-red-200 dark:border-red-900 shadow-sm">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl">🚫</span>
            </div>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Доступ запрещен</h3>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Ваша заявка была отклонена администратором. Вы не можете просматривать или покупать лиды.
            </p>
          </div>
        ) : (
          <LeadsFeed onUnlockSuccess={handleUnlockSuccess} />
        )}
      </main>
    </div>
  )
}
