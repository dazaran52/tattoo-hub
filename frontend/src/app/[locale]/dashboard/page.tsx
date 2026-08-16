'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { SkeletonCard } from '@/components/SkeletonCard'
import { supabase, Profile } from '@/lib/supabase'
import { LeadsFeed } from '@/components/LeadsFeed'
import { CRMBoard } from '@/components/CRMBoard'
import { MessagesList } from '@/components/MessagesList'
import { LeadDetailsModal } from '@/components/LeadDetailsModal'
import { toast } from 'react-hot-toast'
import { ClientDashboard } from '@/components/ClientDashboard'
import { PortfolioTab } from '@/components/PortfolioTab'
import { useTranslations, useLocale } from 'next-intl'
import { MessageCircle, LayoutDashboard, Share2, Link as LinkIcon, Image as ImageIcon, ShoppingBag } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { CommandPaletteModal } from '@/components/CommandPaletteModal'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [messagesViewLead, setMessagesViewLead] = useState<any>(null)
  const t = useTranslations()
  const language = useLocale()
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'feed' | 'crm' | 'messages' | 'portfolio'>('crm')
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [viewLeadId, setViewLeadId] = useState<string | null>(null)
  const [viewSessionId, setViewSessionId] = useState<string | null>(null)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab && ['feed', 'crm', 'messages', 'portfolio'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [])
  
  useEffect(() => {
    if (!profile || profile.role !== 'master') return
    
    const fetchUnreadCount = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${apiUrl}/api/chat/unread-count`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        if (res.ok) {
          const { count } = await res.json()
          setUnreadMessages(count)
        }
      } catch (e) {
        console.error('Failed to fetch unread count', e)
      }
    }
    
    fetchUnreadCount()

    // Realtime subscription for balance updates and chats
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
          
        channel.on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
          fetchUnreadCount()
        })
        
        channel.subscribe()
      }
    }
    
    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [profile?.role])

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
            cache: 'no-store',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
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
      
      setProfile(profileData)
      setCurrentSession(session)
      
      // Redirect admin to admin panel
      if (profileData.is_admin) {
        window.location.href = '/admin'
        return
      }

      // Force onboarding for clients without a city
      if (profileData.role === 'client' && (!profileData.city_ids || profileData.city_ids.length === 0)) {
        window.location.href = '/onboarding'
        return
      }
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

  const copyPublicLink = () => {
    if (!profile?.username) {
      toast.error(language === 'ru' ? 'Сначала установите username в профиле' : 'Set username in profile first')
      return
    }
    const url = `${window.location.origin}/book/${profile.username}`
    navigator.clipboard.writeText(url)
    toast.success(language === 'ru' ? 'Ссылка на визитку скопирована!' : 'Booking link copied!')
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
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 py-3 rounded-xl font-bold"
            >
              {t('tryAgain')}
            </button>
            <button 
              onClick={handleLogout} 
              className="w-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 py-3 rounded-xl font-bold hover:bg-red-500/20 transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-x-clip">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        {profile.role === 'master' ? (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[120px]" />
          </>
        ) : (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-[120px]" />
          </>
        )}
      </div>

      <Header profile={profile} onLogout={handleLogout} maxWidthClass={activeTab === 'crm' ? 'max-w-[1600px]' : 'max-w-7xl'} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />

      <main className={`mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 md:pb-8 relative ${activeTab === 'crm' ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
        {profile.role === 'client' ? (
          <ClientDashboard profile={profile} activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <>
            {/* Welcome Section */}
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                  {t('welcome')}, {profile.username || profile.email.split('@')[0]}
                </h2>
                <div className="mt-2 flex items-center gap-3">
                  <button 
                    onClick={copyPublicLink}
                    className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 px-3 py-1.5 rounded-full hover:bg-primary-200 dark:hover:bg-primary-500/30 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {language === 'ru' ? 'Поделиться визиткой' : 'Share Booking Link'}
                  </button>
                </div>
              </div>
              
              {/* Tabs */}
                <div className="mt-4 md:mt-0 hidden md:flex overflow-x-auto p-1 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 rounded-xl shadow-sm gap-1 no-scrollbar">
                  <button
                    id="tour-crm"
                    onClick={() => setActiveTab('crm')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'crm'
                        ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t('myCrm')}
                  </button>
                  <button
                    id="tour-feed"
                    onClick={() => setActiveTab('feed')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'feed'
                        ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Маркетплейс
                  </button>
                  <button
                    id="tour-portfolio"
                    onClick={() => setActiveTab('portfolio')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'portfolio'
                        ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {language === 'ru' ? 'Портфолио' : 'Portfolio'}
                  </button>
                  <button
                    id="tour-messages"
                    onClick={() => setActiveTab('messages')}
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === 'messages'
                        ? 'bg-primary-600 text-white shadow-md scale-[1.02]'
                        : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-white/50 dark:hover:bg-neutral-800/50'
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('messages')}
                    {unreadMessages > 0 && (
                      <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    )}
                  </button>
                </div>
              
            </div>

            {/* Content Rendering based on Tab */}
            {activeTab === 'feed' && (
              profile.can_create_leads === false ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50/50 dark:bg-red-950/20 rounded-3xl border border-red-200/50 dark:border-red-900/30 backdrop-blur-sm mt-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4 border border-red-200 dark:border-red-800">
                    <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-red-900 dark:text-red-300 mb-2">Доступ к Маркетплейсу ограничен</h3>
                  <p className="text-sm font-medium text-red-700/80 dark:text-red-400/80 max-w-md">
                    Ваш доступ к маркетплейсу был отозван администратором. Если вы считаете, что произошла ошибка, пожалуйста, обратитесь в поддержку.
                  </p>
                </div>
              ) : (
                <LeadsFeed onUnlockSuccess={handleUnlockSuccess} isAdmin={profile.is_admin} userCities={profile.city_ids || []} />
              )
            )}

          {activeTab === 'crm' && <CRMBoard initialViewLeadId={viewLeadId} initialViewSessionId={viewSessionId} />}
          {activeTab === 'portfolio' && <PortfolioTab profile={profile} />}
          {activeTab === 'messages' && (
            <>
              <MessagesList 
                onViewLead={(lead, chat) => {
                  const sessionObj = {
                    id: chat?.client_session_id || lead?.id,
                    lead_id: lead?.id,
                    status: chat?.kanban_status || lead?.status || 'new',
                    style: lead?.style || lead?.title,
                    body_place: lead?.body_place,
                    size: lead?.size,
                    notes: lead?.description,
                    session_date: lead?.session_date,
                    reference_images: lead?.image_urls,
                    master_clients: {
                      id: chat?.id,
                      lead_id: lead?.id,
                      name: chat?.other_user_name || lead?.client_name || 'Неизвестный клиент',
                      email: chat?.other_user_email || lead?.email,
                      phone: chat?.other_user_phone || lead?.contact,
                      telegram: chat?.other_user_telegram,
                      leads: lead
                    }
                  }
                  setMessagesViewLead(sessionObj)
                }}
                onViewSession={(sessionId) => {
                  setViewSessionId(sessionId)
                  setViewLeadId(null)
                  setActiveTab('crm')
                }}
              />
              <LeadDetailsModal
                isOpen={!!messagesViewLead}
                onClose={() => setMessagesViewLead(null)}
                session={messagesViewLead}
                onAccept={async () => {
                  try {
                    const sessionId = messagesViewLead?.id
                    if (sessionId) {
                      const { data: { session: authSession } } = await supabase.auth.getSession()
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}`, {
                        method: 'PUT',
                        headers: {
                          'Authorization': `Bearer ${authSession?.access_token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'in_progress' })
                      })
                      toast.success('Заявка принята в работу!')
                    }
                  } catch (e) {
                    console.error(e)
                  } finally {
                    setMessagesViewLead(null)
                  }
                }}
                onReject={async (reason) => {
                  try {
                    const sessionId = messagesViewLead?.id
                    if (sessionId) {
                      const { data: { session: authSession } } = await supabase.auth.getSession()
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}`, {
                        method: 'PUT',
                        headers: {
                          'Authorization': `Bearer ${authSession?.access_token}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ status: 'cancelled', reject_reason: reason })
                      })
                      toast.success('Заявка отклонена')
                    }
                  } catch (e) {
                    console.error(e)
                  } finally {
                    setMessagesViewLead(null)
                  }
                }}
                onUpdate={() => setMessagesViewLead(null)}
              />
            </>
          )}
        </>
        )}
      </main>
      {profile && (
        <>
          <BottomNav 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            unreadMessagesCount={unreadMessages} 
            userRole={profile.role as 'master' | 'client'} 
          />
          <CommandPaletteModal 
            isOpen={isCommandPaletteOpen} 
            onClose={() => setIsCommandPaletteOpen(false)} 
            onSelectTab={setActiveTab} 
          />
        </>
      )}
    </div>
  )
}
