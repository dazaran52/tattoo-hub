'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { SkeletonCard } from '@/components/SkeletonCard'
import { supabase, Profile } from '@/lib/supabase'
import { LeadsFeed } from '@/components/LeadsFeed'
import { AuctionsFeed } from '@/components/AuctionsFeed'
import { CRMBoard } from '@/components/CRMBoard'
import { MessagesList } from '@/components/MessagesList'
import { toast } from 'react-hot-toast'
import { ClientDashboard } from '@/components/ClientDashboard'
import { useLanguage } from '@/i18n/LanguageContext'
import { MessageCircle, LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { t, lang: language } = useLanguage()
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'feed' | 'my-leads' | 'auctions' | 'crm' | 'messages'>('feed')

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
              if (payload.new && 'balance' in payload.new) {
                setProfile(prev => prev ? { ...prev, balance: payload.new.balance } : null)
                toast(t('balanceUpdated'), { icon: '💳' })
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
      let response;
      let retries = 3;
      while (retries > 0) {
        response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (response.ok) break;
        await new Promise(r => setTimeout(r, 1000));
        retries--;
      }

      if (!response || !response.ok) {
        throw new Error('Failed to fetch profile')
      }

      const profileData = await response.json()
      
      // Fallback to session metadata if backend doesn't return role
      if (!profileData.role && session.user.user_metadata?.role) {
        profileData.role = session.user.user_metadata.role
      }
      
      // Redirect to onboarding if critical profile info is missing
      if (!profileData.country_ids || profileData.country_ids.length === 0) {
        router.push('/onboarding')
        return
      }

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

  const handleUnlockSuccess = (newBalance: number) => {
    if (profile) {
      setProfile({ ...profile, balance: newBalance })
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
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">{t('profileLoadError')}</h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            {t('profileLoadErrorDesc')}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3 rounded-xl font-bold"
          >
            {t('tryAgain')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        {profile.role === 'master' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
          </>
        )}
      </div>

      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {profile.role === 'client' ? (
          <ClientDashboard profile={profile} />
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('welcome')}, {profile.username || profile.email.split('@')[0]}
                </h2>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                  {t('availableLeads')}
                </p>
              </div>
              
              {/* Tabs */}
              <div className="mt-4 md:mt-0 flex overflow-x-auto p-1 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 rounded-xl shadow-sm gap-1 no-scrollbar">
                  <button
                    id="tour-leads"
                    onClick={() => setActiveTab('feed')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'feed'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    {t('allLeads')}
                  </button>
                  <button
                    onClick={() => setActiveTab('my-leads')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'my-leads'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    {t('myLeads')}
                  </button>
                  <button
                    onClick={() => setActiveTab('auctions')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                      activeTab === 'auctions'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    {t('auctions')}
                  </button>
                  <div className="w-px h-6 bg-neutral-200 dark:bg-white/10 self-center mx-1"></div>
                  <button
                    onClick={() => setActiveTab('crm')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'crm'
                        ? 'bg-violet-600 text-white shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t('myCrm')}
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'messages'
                        ? 'bg-violet-600 text-white shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('messages')}
                  </button>
                </div>
              
            </div>

            {/* Content Rendering based on Tab */}
            {['feed', 'my-leads', 'auctions'].includes(activeTab) ? (
              profile.role === 'master' && !profile.is_verified_master ? (
                <div className="text-center p-12 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-3xl border border-indigo-200 dark:border-indigo-900/30 shadow-2xl relative overflow-hidden mt-8">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.1)_0%,transparent_70%)] pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-indigo-100/50 dark:bg-indigo-950/50 rounded-full mx-auto mb-6 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.15)]">
                    <span className="text-4xl">🔒</span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mb-4 tracking-tight">{t('cabinetLocked')}</h3>
                  <p className="text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto mb-10 text-lg leading-relaxed font-medium">
                    {t('cabinetLockedDesc')}
                  </p>
                  <button
                    onClick={() => router.push('/profile')}
                    className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full font-extrabold text-lg transition-all hover:scale-105 shadow-xl shadow-indigo-600/25"
                  >
                    {t('fillProfile')}
                  </button>
                </div>
              </div>
            ) : profile.status === 'pending' ? (
              <div className="text-center p-12 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-3xl border border-amber-200 dark:border-amber-900/30 shadow-xl max-w-2xl mx-auto mt-8">
                <div className="w-20 h-20 bg-amber-100/50 dark:bg-amber-900/30 rounded-full mx-auto mb-6 flex items-center justify-center border border-amber-500/20">
                  <span className="text-3xl">⏳</span>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">{t('pendingReviewTitle')}</h3>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto font-medium">
                  {t('pendingReviewDesc')}
                </p>
              </div>
            ) : profile.status === 'rejected' ? (
              <div className="text-center p-12 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-3xl border border-red-200 dark:border-red-900/30 shadow-xl max-w-2xl mx-auto mt-8">
                <div className="w-20 h-20 bg-red-100/50 dark:bg-red-900/30 rounded-full mx-auto mb-6 flex items-center justify-center border border-red-500/20">
                  <span className="text-3xl text-red-600">❌</span>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3 tracking-tight">{t('rejectedTitle')}</h3>
                <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto font-medium">
                  {t('rejectedDesc')}
                </p>
              </div>
            ) : (
              <>
                {['feed', 'my-leads', 'auctions'].includes(activeTab) && !profile.is_admin ? (
                  <div className="text-center p-12 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-3xl border border-indigo-200 dark:border-indigo-900/30 shadow-xl max-w-2xl mx-auto mt-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.05)_0%,transparent_70%)] pointer-events-none" />
                    <div className="relative z-10">
                      <div className="w-20 h-20 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-full mx-auto mb-6 flex items-center justify-center border border-indigo-500/20 shadow-[0_0_30px_rgba(79,70,229,0.1)]">
                        <span className="text-3xl text-indigo-600 dark:text-indigo-400">🚀</span>
                      </div>
                      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4 tracking-tight">
                        Маркетплейс заявок на стадии тестирования
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed mb-6">
                        Скоро вы сможете получать здесь новых клиентов! А пока используйте нашу мощную CRM для ведения своих текущих записей и работы с клиентами.
                        <br/><br/>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Доступно 1 июля в 12:00!</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'feed' && <LeadsFeed onUnlockSuccess={handleUnlockSuccess} isAdmin={profile.is_admin} userCities={profile.city_ids || []} />}
                    {activeTab === 'my-leads' && <LeadsFeed onUnlockSuccess={handleUnlockSuccess} isAdmin={profile.is_admin} showOnlyUnlocked={true} userCities={profile.city_ids || []} />}
                    {activeTab === 'auctions' && <AuctionsFeed />}
                  </>
                )}
              </>
            )
          ) : null}

          {activeTab === 'crm' && <CRMBoard />}
          {activeTab === 'messages' && <MessagesList />}
        </>
        )}
      </main>
    </div>
  )
}
