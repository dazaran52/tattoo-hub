'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { SkeletonCard } from '@/components/SkeletonCard'
import { supabase, Profile } from '@/lib/supabase'
import { LeadsFeed } from '@/components/LeadsFeed'
import { AuctionsFeed } from '@/components/AuctionsFeed'
import { getTranslation, Language } from '@/lib/i18n'
import { toast } from 'react-hot-toast'
import { ClientDashboard } from '@/components/ClientDashboard'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [language, setLanguage] = useState<string>('cs')
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'feed' | 'my-leads' | 'auctions'>('feed')

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

    // Realtime subscription for balance updates
    let channel: any;
    
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        channel = supabase.channel('realtime_user_balance')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${session.user.id}` },
            (payload) => {
              if (payload.new && 'credits' in payload.new) {
                setProfile(prev => prev ? { ...prev, credits: payload.new.credits } : null)
                toast('Баланс обновлен!', { icon: '💳' })
              }
            }
          )
          .subscribe()
      }
    }
    
    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
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
      
      setCurrentSession(session)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
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
        {profile.role === 'client' ? (
          <ClientDashboard profile={profile} />
        ) : (
          <>
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
              
              {/* Tabs */}
              {profile.status === 'approved' && (
                <div className="mt-4 md:mt-0 flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                  <button
                    id="tour-leads"
                    onClick={() => setActiveTab('feed')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'feed'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Все лиды
                  </button>
                  <button
                    onClick={() => setActiveTab('my-leads')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'my-leads'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Мои лиды
                  </button>
                  <button
                    id="tour-auctions"
                    onClick={() => setActiveTab('auctions')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'auctions'
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Аукционы
                  </button>
                </div>
              )}
            </div>

            {/* Leads Feed or Status Message */}
            {profile.role === 'master' && !profile.is_verified_master ? (
              <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 shadow-2xl relative overflow-hidden mt-8">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)] pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-950 rounded-full mx-auto mb-6 flex items-center justify-center border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                    <span className="text-4xl">🔒</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mb-4 tracking-tight">Кабинет заблокирован</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto mb-10 text-lg leading-relaxed">
                    Мы создаем премиальный продукт и заботимся о качестве. Пожалуйста, перейдите в настройки профиля, загрузите портфолио и сертификаты, чтобы получить статус верифицированного мастера и доступ к горячим заявкам.
                  </p>
                  <button
                    onClick={() => router.push('/profile')}
                    className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full font-bold text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-600/25"
                  >
                    Заполнить профиль
                  </button>
                </div>
              </div>
            ) : profile.status === 'pending' ? (
              <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-amber-200 dark:border-amber-900 shadow-sm">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{t('pendingReviewTitle')}</h3>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                  {t('pendingReviewDesc')}
                </p>
              </div>
            ) : profile.status === 'rejected' ? (
              <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-xl border border-red-200 dark:border-red-900 shadow-sm">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl text-red-600">❌</span>
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{t('rejectedTitle')}</h3>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
                  {t('rejectedDesc')}
                </p>
              </div>
            ) : activeTab === 'auctions' ? (
              <AuctionsFeed />
            ) : (
              <LeadsFeed 
                onUnlockSuccess={handleUnlockSuccess} 
                isAdmin={profile.is_admin} 
                showOnlyUnlocked={activeTab === 'my-leads'}
                userCities={profile.city_ids || []}
              />
            )}

          </>
        )}
      </main>
    </div>
  )
}
