'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Profile, supabase } from '@/lib/supabase'
import { PlusCircle, Heart, Clock, X, MoreVertical, Edit2, Pause, Play, Trash2, MessageCircle, DollarSign, ShieldCheck, Loader2, Filter, XCircle } from 'lucide-react'
import { LeadWizard } from '@/components/LeadWizard'
import { CityMultiSelect } from '@/components/CityMultiSelect'
import { ChatModal } from '@/components/ChatModal'
import { MessagesList } from '@/components/MessagesList'
import { MasterProfileModal } from '@/components/MasterProfileModal'
import { useLanguage } from '@/i18n/LanguageContext'
import { TATTOO_STYLES } from '@/lib/constants'
import { motion, AnimatePresence } from 'framer-motion'
import { OnlineIndicator } from '@/components/OnlineIndicator'
import { VerifiedMasterBadge } from '@/components/PublicMasterTrust'

export function ClientDashboard({ profile }: { profile: Profile }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'leads' | 'top_masters' | 'messages'>('leads')
  const [masterTab, setMasterTab] = useState<'rating' | 'favorites'>('rating')
  const [favoriteMasterIds, setFavoriteMasterIds] = useState<Set<string>>(new Set())
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedMasterForDirectBooking, setSelectedMasterForDirectBooking] = useState<string | null>(null)
  const [selectedMasterUsernameForModal, setSelectedMasterUsernameForModal] = useState<string | null>(null)
  const [isMasterSelectModalOpen, setIsMasterSelectModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [topMasters, setTopMasters] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedMasterCities, setSelectedMasterCities] = useState<string[]>([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [editingLead, setEditingLead] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedChatTitle, setSelectedChatTitle] = useState('')
  const [selectedChatMaster, setSelectedChatMaster] = useState('')
  const [selectedChatAvatar, setSelectedChatAvatar] = useState<string | null>(null)
  const [selectedChatLastSeen, setSelectedChatLastSeen] = useState<string | null>(null)
  const [acceptingProposalId, setAcceptingProposalId] = useState<string | null>(null)
  const [proposalToConfirm, setProposalToConfirm] = useState<{ leadId: string; proposal: any } | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [selectedMasterStyles, setSelectedMasterStyles] = useState<string[]>([])
  const [masterSortBy, setMasterSortBy] = useState<'rating_desc' | 'rating_asc' | 'reviews_desc'>('rating_desc')
  const [showMasterFilters, setShowMasterFilters] = useState(false)

  const toggleFavorite = async (masterId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const isFav = favoriteMasterIds.has(masterId)
      
      // Optimistic update
      setFavoriteMasterIds(prev => {
        const next = new Set(prev)
        if (isFav) next.delete(masterId)
        else next.add(masterId)
        return next
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/favorites/${masterId}`, {
        method: isFav ? 'DELETE' : 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      if (!response.ok) {
        // Revert on error
        setFavoriteMasterIds(prev => {
          const next = new Set(prev)
          if (!isFav) next.delete(masterId)
          else next.add(masterId)
          return next
        })
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }
  const handlePauseResume = async (leadId: string, currentStatus: string) => {
    if (!['new', 'active', 'paused'].includes(currentStatus)) return
    try {
      const newStatus = currentStatus === 'paused' ? 'active' : 'paused'
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
        import('react-hot-toast').then(mod => mod.default.success(t('success') || 'Success'))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm(t('confirmDeleteLead') || 'Are you sure?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (res.ok) {
        setLeads(leads.filter(l => l.id !== leadId))
        import('react-hot-toast').then(mod => mod.default.success(t('leadDeleted') || 'Deleted'))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleAcceptProposal = async (leadId: string, proposal: any) => {
    const proposalKey = `${leadId}:${proposal.master_id}`
    setAcceptingProposalId(proposalKey)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Войдите в аккаунт, чтобы выбрать мастера')
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/leads/client/${leadId}/proposals/${proposal.master_id}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.detail?.message || payload.detail || 'Не удалось выбрать мастера')
      setLeads(current => current.map(lead => lead.id !== leadId ? lead : {
        ...lead,
        status: 'accepted',
        assigned_master_id: proposal.master_id,
        proposals: (lead.proposals || []).map((item: any) => ({
          ...item,
          status: item.master_id === proposal.master_id ? 'accepted' : 'rejected'
        }))
      }))
      import('react-hot-toast').then(mod => mod.default.success('Мастер выбран. Приватный чат открыт.'))
      const refreshed = await fetch(`${apiUrl}/api/leads/client`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (refreshed.ok) setLeads(await refreshed.json())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось выбрать мастера'
      import('react-hot-toast').then(mod => mod.default.error(message))
    } finally {
      setAcceptingProposalId(null)
    }
  }

  useEffect(() => {
    if (isFormOpen || editingLead) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isFormOpen, editingLead])

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('pending_lead')) {
      const pendingLeadStr = localStorage.getItem('pending_lead')
      if (pendingLeadStr) {
        setIsFormOpen(true)
      }
    }

    async function fetchLeads() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) throw new Error('Failed to fetch leads')

        const data = await response.json()
        setLeads(data)
      } catch (err) {
        console.error('Error fetching leads:', err)
      } finally {
        setIsLoadingLeads(false)
      }
    }
    
    async function fetchTopMasters() {
      try {
        setIsLoadingMasters(true)
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/masters`)
        if (response.ok) {
          const data = await response.json()
          setTopMasters(data)
        }
      } catch (err) {
        console.error('Error fetching top masters:', err)
      } finally {
        setIsLoadingMasters(false)
      }
    }
    
    async function fetchFavorites() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/favorites`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setFavoriteMasterIds(new Set(data))
        }
      } catch (err) {
        console.error('Error fetching favorites:', err)
      }
    }
    
    async function fetchUnread() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/unread-count`, {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setUnreadMessages(data.count)
        }
      } catch (err) {
        console.error('Error fetching unread:', err)
      }
    }

    async function fetchCities() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/cities`)
        if (response.ok) {
          const data = await response.json()
          setCities(data)
        }
      } catch (err) {
        console.error('Error fetching cities:', err)
      }
    }

    fetchLeads()
    fetchTopMasters()
    fetchUnread()
    fetchFavorites()
    fetchCities()
    
    const channel = supabase.channel('client_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        fetchUnread()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  let filteredMasters = topMasters
    .filter(m => masterTab === 'rating' || favoriteMasterIds.has(m.id))
    .filter(m => selectedMasterCities.length === 0 || (m.city_ids && m.city_ids.some((id: string) => selectedMasterCities.includes(id))))

  if (selectedMasterStyles.length > 0) {
    filteredMasters = filteredMasters.filter(m => m.styles && m.styles.some((s: string) => selectedMasterStyles.includes(s)))
  }

  filteredMasters.sort((a, b) => {
    if (masterSortBy === 'rating_asc') return (a.rating || 0) - (b.rating || 0)
    if (masterSortBy === 'reviews_desc') return (b.review_count || 0) - (a.review_count || 0)
    return (b.rating || 0) - (a.rating || 0)
  })

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {t('clientDashboardTitle')}, {profile.email.split('@')[0]}
          </h2>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('manageYourLeads')}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'leads'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t('myLeads')}
          </button>

          <button
            onClick={() => setActiveTab('top_masters')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'top_masters'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t('masters') || 'Мастера'}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative flex items-center ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline-block mr-2" />
            {t('messages') || 'Сообщения'}
            {unreadMessages > 0 && (
              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <PlusCircle className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Найти мне мастера</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm">
                Отправьте заявку в общую ленту маркетплейса. Подходящие мастера откликнутся сами.
              </p>
              <button 
                onClick={() => { setSelectedMasterForDirectBooking(null); setIsFormOpen(true) }}
                className="px-6 py-3 w-full max-w-[200px] bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors"
              >
                Создать заявку
              </button>
            </div>
            
            <div className="bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Heart className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Записаться к конкретному</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm">
                Выберите мастера из списка всех мастеров и запишитесь к нему напрямую.
              </p>
              <button 
                onClick={() => { setActiveTab('top_masters') }}
                className="px-6 py-3 w-full max-w-[200px] bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors shadow-md shadow-primary-500/20"
              >
                Выбрать мастера
              </button>
            </div>
          </div>

          {isLoadingLeads ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[150px]">
              <p className="text-neutral-500 animate-pulse">{t('loadingLeads')}</p>
            </div>
          ) : leads.map(lead => (
            <div key={lead.id} className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-white/5 rounded-3xl p-6 shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-black/10 transition-all duration-300 relative overflow-hidden group">
              {/* Background accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary-500/10 transition-colors" />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex flex-wrap gap-2 items-center">
                    {lead.is_personal ? (
                      <span className="px-3 py-1 bg-fuchsia-100 dark:bg-fuchsia-500/10 border border-fuchsia-200 dark:border-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-400 text-xs font-extrabold tracking-wide uppercase rounded-full">
                        Личная заявка
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-extrabold tracking-wide uppercase rounded-full">
                        Маркетплейс
                      </span>
                    )}
                    
                    <span className={`px-3 py-1 border text-xs font-extrabold tracking-wide uppercase rounded-full ${
                      ['new', 'active'].includes(lead.status) ? 'bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400' :
                      ['accepted', 'booked'].includes(lead.status) ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                      'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-400'
                    }`}>
                      {['new', 'active'].includes(lead.status) ? (lead.is_personal ? t('statusPending', 'Ожидает ответа') : t('statusSearching', 'В поиске')) :
                       ['accepted', 'booked'].includes(lead.status) ? t('statusAccepted', 'В работе') :
                       lead.status === 'completed' ? t('statusCompleted', 'Завершено') :
                       lead.status === 'paused' ? t('statusPaused', 'Приостановлена') :
                       lead.status === 'closed' ? t('statusArchived', 'Закрыта') : lead.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-900 px-2.5 py-1 rounded-lg">
                      <Clock className="w-3.5 h-3.5" /> 
                      {new Date(lead.created_at).toLocaleDateString()}
                    </span>
                    <div className="relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)}
                        className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {openMenuId === lead.id && (
                        <>
                          <div className="fixed inset-0 z-[5]" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden z-10 py-1">
                          {['new', 'active', 'paused'].includes(lead.status) && (
                            <button 
                              onClick={() => { setOpenMenuId(null); setEditingLead(lead) }}
                              className="w-full text-left px-4 py-2.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" /> {t('editLead', 'Редактировать заявку')}
                            </button>
                          )}
                          {['new', 'active', 'paused'].includes(lead.status) && <>
                            <button
                              onClick={() => { setOpenMenuId(null); handlePauseResume(lead.id, lead.status) }}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                            >
                              {lead.status === 'paused' ? <><Play className="w-4 h-4" /> {t('resume') || 'Возобновить'}</> : <><Pause className="w-4 h-4" /> {t('pause') || 'Приостановить'}</>}
                            </button>
                            <div className="h-px w-full bg-neutral-100 dark:bg-neutral-800 my-1" />
                          </>}
                          {['new', 'active', 'paused', 'closed'].includes(lead.status) && (
                            <button
                              onClick={() => { setOpenMenuId(null); handleDelete(lead.id) }}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" /> <span className="text-red-500">{t('deleteLead', 'Удалить заявку')}</span>
                            </button>
                          )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-5">
                  {lead.style && lead.style !== 'Не определился' && (
                    <span className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-200/50 dark:border-white/5">
                      <span>🎨</span>
                      {lead.style}
                    </span>
                  )}
                  {lead.body_place && lead.body_place !== 'Не определился' && (
                    <span className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-200/50 dark:border-white/5">
                      <span>👤</span>
                      {lead.body_place}
                    </span>
                  )}
                  {lead.size && (
                    <span className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-neutral-200/50 dark:border-white/5">
                      <span>📏</span>
                      {lead.size}
                    </span>
                  )}
                </div>
                
                {lead.image_urls && Array.isArray(lead.image_urls) && lead.image_urls.length > 0 && (
                  <div className="flex gap-3 mb-5 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                    {lead.image_urls.map((url: any, i: number) => {
                      const img = typeof url === 'string' ? url : (url?.url || '');
                      if (!img) return null;
                      return (
                        <div key={i} className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                          <Image
                            src={img}
                            alt="Reference"
                            fill
                            className="object-cover rounded-xl group-hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                            sizes="120px"
                            onClick={(e) => { e.stopPropagation(); setLightboxImage(img) }}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
                
                <div className="mb-6 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 pl-4 line-clamp-3 leading-relaxed">
                    {lead.description?.replace(/\s*(Бюджет|Город):.*?(?=(\n|$))/gi, '') || t('noDescription')}
                  </p>
                </div>

                {lead.master && (
                  <div className="mb-6 p-1 rounded-2xl bg-gradient-to-r from-primary-500/10 via-primary-500/10 to-fuchsia-500/10">
                    <div className="bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md rounded-[14px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/20 dark:border-white/5">
                      <div className="flex items-center gap-4">
                        <div 
                          className="flex items-center gap-3 bg-neutral-100 dark:bg-[#111] p-3 rounded-2xl border border-neutral-200/50 dark:border-white/5 cursor-pointer hover:bg-neutral-200 dark:hover:bg-[#1a1a1a] transition-colors group/master w-fit"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedMasterUsernameForModal(lead.master.username || lead.assigned_master_id)
                          }}
                        >
                          <div className="relative shrink-0 w-14 h-14">
                            <Image 
                              src={lead.master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.master.name || 'Master')}`} 
                              alt="Master" 
                              className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white dark:border-neutral-800"
                              width={56} height={56} 
                            />
                            <OnlineIndicator lastSeen={lead.master.last_seen} />
                          </div>
                          <div>
                            <p className="text-xs font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-500 uppercase tracking-wider mb-1">{t('assignedMaster', 'Назначенный мастер')}</p>
                            <h5 className="font-bold text-base text-neutral-900 dark:text-white leading-tight">{lead.master.name}</h5>
                            <span className="text-xs font-medium text-neutral-500">@{lead.master.username}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        {lead.session && lead.session.session_date ? (
                          <div className="text-left sm:text-right bg-white dark:bg-neutral-900 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-start sm:items-end">
                            <p className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider mb-1">{t('sessionDate') || 'Сеанс'}</p>
                            <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-primary-500" />
                              {new Date(lead.session.session_date).toLocaleDateString()}
                              {lead.session.start_time && <span className="text-neutral-500 font-medium ml-1">{lead.session.start_time}</span>}
                            </p>
                          </div>
                        ) : lead.chat_id ? (
                           <div className="text-left sm:text-right bg-neutral-100 dark:bg-neutral-900 px-3 py-2 rounded-xl">
                             <p className="text-xs text-neutral-500 font-semibold whitespace-nowrap">Ожидает назначения даты</p>
                           </div>
                        ) : null}
                        
                        {lead.chat_id && (
                          <button 
                            onClick={() => {
                              setSelectedChatId(lead.chat_id)
                              setSelectedChatTitle(lead.title)
                              setSelectedChatMaster(lead.master.name)
                              setSelectedChatAvatar(lead.master.avatar_url || null)
                              setSelectedChatLastSeen(lead.master.last_seen || null)
                            }}
                            className="px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                          >
                            <MessageCircle className="w-5 h-5" />
                            Перейти в чат
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!lead.master && Array.isArray(lead.proposals) && lead.proposals.length > 0 && (
                  <div className="mb-6 rounded-2xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-500/20 dark:bg-primary-500/5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold text-neutral-900 dark:text-white">Предложения мастеров</p>
                        <p className="text-xs text-neutral-500">Сравните условия и выберите одного мастера</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-primary-700 shadow-sm dark:bg-neutral-900 dark:text-primary-300">{lead.proposals.length} / 5</span>
                    </div>
                    <div className="space-y-3">
                      {lead.proposals.map((proposal: any) => {
                        const proposalKey = `${lead.id}:${proposal.master_id}`
                        return (
                          <div key={proposalKey} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                            <div className="flex items-start gap-3">
                              <div className="relative">
                                <Image src={proposal.master_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(proposal.master_name)}`} alt="" className="h-11 w-11 rounded-xl object-cover"  width={44} height={44} />
                                <OnlineIndicator lastSeen={proposal.last_seen} size="sm" className="-bottom-1 -right-1" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-extrabold text-neutral-900 dark:text-white">{proposal.master_name}</p>
                                  {proposal.certificate_verified && <VerifiedMasterBadge verified={true} className="h-4 w-4 text-primary-500" />}
                                </div>
                                {proposal.proposed_dates && <p className="mt-1 text-xs text-neutral-500">{proposal.proposed_dates}</p>}
                                <p className="mt-2 text-base font-extrabold text-neutral-900 dark:text-white">{proposal.price_offer} {proposal.offer_currency}</p>
                              </div>
                            </div>
                            <div className="mt-4 flex gap-2">
                              {proposal.master_username && <button onClick={() => setSelectedMasterUsernameForModal(proposal.master_username)} className="flex-1 rounded-xl bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200">Портфолио</button>}
                              <button disabled={acceptingProposalId !== null} onClick={() => setProposalToConfirm({ leadId: lead.id, proposal })} className="flex-1 rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white hover:bg-primary-500 disabled:opacity-60">
                                {acceptingProposalId === proposalKey ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Выбираем</span> : 'Выбрать мастера'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-5 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-neutral-500 uppercase tracking-wider">{t('budgetLabel', 'Бюджет')}</p>
                      <p className="font-bold text-neutral-900 dark:text-white text-sm">
                        {lead.display_budget || lead.client_budget ? `${lead.client_budget} ${lead.client_currency || 'CZK'}` : t('negotiableBudget')}
                      </p>
                    </div>
                  </div>
                  
                  {!lead.master && (
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <span className="relative flex h-2 w-2 mr-1">
                        {(lead.unlock_count || 0) > 0 ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-400"></span>
                        )}
                      </span>
                      <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        {lead.unlock_count || 0}
                      </span>
                      <span className="text-xs font-medium text-neutral-500">
                        {
                          (lead.unlock_count || 0) === 1 ? t('response_one', 'отклик мастера') :
                          (lead.unlock_count || 0) >= 2 && (lead.unlock_count || 0) <= 4 ? t('response_few', 'отклика мастеров') :
                          t('response_many', 'откликов мастеров')
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'messages' ? (
        <div className="w-full">
          <MessagesList userRole="client" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary-600 to-primary-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 max-w-2xl">
              <h3 className="text-3xl font-extrabold mb-4">Найти идеального мастера стало проще</h3>
              <p className="text-primary-100 font-medium mb-6 text-lg">
                Оставьте одну заявку, и лучшие мастера вашего города сами предложат вам свои условия, цены и эскизы. Выбирайте того, кто подходит именно вам!
              </p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="px-8 py-4 bg-white text-primary-900 font-extrabold rounded-xl hover:bg-primary-50 transition-colors shadow-lg hover:shadow-xl hover:scale-105"
              >
                Оставить заявку всем мастерам
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-12 mb-6 gap-4">
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">Мастера</h3>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-64 relative z-10">
                <CityMultiSelect 
                  cities={cities}
                  selectedCityIds={selectedMasterCities}
                  onChange={setSelectedMasterCities}
                />
              </div>
              <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setMasterTab('rating')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${masterTab === 'rating' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  Рейтинг мастеров
                </button>
                <button 
                  onClick={() => setMasterTab('favorites')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${masterTab === 'favorites' ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <Heart className={`w-4 h-4 ${masterTab === 'favorites' ? 'fill-red-500 text-red-500' : ''}`} />
                  Избранные
                </button>
              </div>
              <button
                onClick={() => setShowMasterFilters(!showMasterFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                  showMasterFilters 
                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-600 dark:text-primary-400' 
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-neutral-600'
                }`}
              >
                <Filter className="w-4 h-4" />
                Фильтры
              </button>
            </div>
          </div>
          
          <AnimatePresence>
            {showMasterFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-6"
              >
                <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase">Сортировка</label>
                    <select 
                      value={masterSortBy}
                      onChange={(e) => setMasterSortBy(e.target.value as any)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white"
                    >
                      <option value="rating_desc">Высокий рейтинг</option>
                      <option value="rating_asc">Низкий рейтинг</option>
                      <option value="reviews_desc">Больше отзывов</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 mb-2 uppercase">Стили ({selectedMasterStyles.length})</label>
                    <select
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-900 dark:text-white"
                      onChange={(e) => {
                        if (e.target.value && !selectedMasterStyles.includes(e.target.value)) {
                          setSelectedMasterStyles([...selectedMasterStyles, e.target.value])
                        }
                        e.target.value = ''
                      }}
                    >
                      <option value="">Добавить стиль...</option>
                      {TATTOO_STYLES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {selectedMasterStyles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedMasterStyles.map(s => (
                          <span key={s} className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-md flex items-center gap-1">
                            {s} <XCircle className="w-3 h-3 cursor-pointer hover:text-primary-900" onClick={() => setSelectedMasterStyles(selectedMasterStyles.filter(x => x !== s))} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {isLoadingMasters ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl h-[400px] animate-pulse"></div>
              ))}
            </div>
          ) : filteredMasters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMasters.map(master => (
                <div key={master.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group flex flex-col">
                  <div className="p-6 pb-4 flex items-start gap-4 relative">
                    <button 
                      onClick={(e) => toggleFavorite(master.id, e)}
                      className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <Heart className={`w-5 h-5 transition-colors ${favoriteMasterIds.has(master.id) ? 'fill-red-500 text-red-500' : 'text-neutral-400'}`} />
                    </button>
                    <div className="relative">
                      <Image 
                        src={master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(master.display_name || master.username || 'M')}`}
                        alt="Avatar"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-neutral-100 dark:border-neutral-800"
                        width={64} height={64} 
                      />
                      <OnlineIndicator lastSeen={master.last_seen} size="md" className="-bottom-1 -right-1" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-lg text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {master.display_name || master.username}
                        </h4>
                        <VerifiedMasterBadge verified={master.is_verified_master || master.certificate_status === 'approved'} className="h-4 w-4 text-primary-500" />
                      </div>
                      <p className="text-sm text-neutral-500 mb-2">@{master.username}</p>
                      
                      <div className="flex items-center gap-1.5 text-yellow-500">
                        <span className="text-sm font-bold">★ {master.rating}</span>
                        <span className="text-xs text-neutral-400">({master.review_count} отзывов)</span>
                      </div>
                    </div>
                  </div>
                  
                  {master.portfolio_posts && master.portfolio_posts.length > 0 && (
                    <div className="grid grid-cols-3 gap-1 px-6 mb-4">
                      {master.portfolio_posts.map((post: any) => (
                        <div key={post.id} className="aspect-square bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
                          <Image src={post.media?.[0]?.url || ''} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Portfolio"  width={800} height={800} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-6 pb-6 mt-auto">
                    <button 
                      onClick={() => setSelectedMasterUsernameForModal(master.username)}
                      className="block w-full py-3 text-center bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 text-neutral-900 dark:text-white font-bold rounded-xl transition-all"
                    >
                      Смотреть портфолио
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
              <Heart className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-neutral-500 mb-2">
                {masterTab === 'favorites' ? t('noFavorites') || 'Нет избранных мастеров' : 'Нет доступных мастеров'}
              </h3>
              {masterTab === 'favorites' && (
                <p className="text-neutral-400">{t('saveMastersDesc') || 'Сохраняйте понравившихся мастеров, чтобы не потерять их'}</p>
              )}
            </div>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6" onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false) }}>
          <div className="relative w-full max-w-4xl mx-auto my-10 bg-neutral-50 dark:bg-neutral-950 rounded-3xl p-6 md:p-10 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 z-50 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full bg-neutral-200/50 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-4">
              <LeadWizard
                masterId={selectedMasterForDirectBooking || undefined}
                source='platform'
                isLoggedIn={true}
                initialData={{
                  email: profile.email,
                  name: profile.display_name || profile.email.split('@')[0]
                }}
                onSuccess={() => {
                  setIsFormOpen(false)
                  supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
                        headers: {
                          'Authorization': `Bearer ${session.access_token}`,
                          'Content-Type': 'application/json',
                        },
                      }).then(res => res.ok ? res.json() : null).then(data => {
                        if (data) setLeads(data)
                      }).catch(err => console.error(err))
                    }
                  })
                }}
              />
            </div>
          </div>
        </div>
      )}

      {proposalToConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setProposalToConfirm(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="confirm-master-title" className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-7 shadow-2xl dark:bg-neutral-950">
            <div className="mb-5 flex items-center gap-4">
              <div className="relative">
                <Image src={proposalToConfirm.proposal.master_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(proposalToConfirm.proposal.master_name)}`} alt="" className="h-14 w-14 rounded-2xl object-cover"  width={56} height={56} />
                <OnlineIndicator lastSeen={proposalToConfirm.proposal.last_seen} size="md" className="-bottom-1 -right-1" />
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-primary-600">Финальный выбор</p>
                <h3 id="confirm-master-title" className="text-xl font-extrabold text-neutral-900 dark:text-white">Выбрать {proposalToConfirm.proposal.master_name}?</h3>
              </div>
            </div>
            <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-300">После подтверждения остальные предложения будут закрыты, а с выбранным мастером откроется приватный чат.</p>
            <p className="mb-6 text-sm font-bold text-neutral-900 dark:text-white">Стоимость: {proposalToConfirm.proposal.price_offer} {proposalToConfirm.proposal.offer_currency}</p>
            <div className="flex gap-3">
              <button onClick={() => setProposalToConfirm(null)} className="flex-1 rounded-2xl bg-neutral-100 px-4 py-3 font-bold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200">Отмена</button>
              <button onClick={() => { const choice = proposalToConfirm; setProposalToConfirm(null); handleAcceptProposal(choice.leadId, choice.proposal) }} className="flex-1 rounded-2xl bg-primary-600 px-4 py-3 font-bold text-white shadow-lg shadow-primary-500/20 hover:bg-primary-500">Подтвердить выбор</button>
            </div>
          </div>
        </div>
      )}

      <ChatModal
        isOpen={!!selectedChatId}
        onClose={() => setSelectedChatId(null)}
        chatId={selectedChatId}
        leadTitle={selectedChatTitle}
        currentUserRole="client"
        recipientName={selectedChatMaster}
        recipientAvatar={selectedChatAvatar}
        recipientLastSeen={selectedChatLastSeen}
      />
      
      {isMasterSelectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setIsMasterSelectModalOpen(false) }}>
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col max-h-[80vh]">
            <button 
              onClick={() => setIsMasterSelectModalOpen(false)}
              className="absolute top-6 right-6 z-50 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full bg-neutral-100 dark:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-white">Выберите мастера</h2>
            <div className="flex-1 overflow-y-auto space-y-4">
              {topMasters.length === 0 ? (
                <p className="text-neutral-500 text-center py-8">Мастера не найдены</p>
              ) : (
                topMasters.map(master => (
                  <div key={master.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Image 
                          src={master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(master.display_name || master.username || 'M')}`}
                          alt="Avatar"
                          className="w-12 h-12 rounded-full object-cover"
                          width={48} height={48} 
                        />
                        <OnlineIndicator lastSeen={master.last_seen} size="sm" className="bottom-0 right-0" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white">{master.display_name || master.username}</h4>
                        <p className="text-xs text-neutral-500">@{master.username} • ★ {master.rating}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMasterForDirectBooking(master.id)
                        setIsMasterSelectModalOpen(false)
                        setIsFormOpen(true)
                      }}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                    >
                      Выбрать
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}

      {selectedMasterUsernameForModal && (
        <MasterProfileModal 
          username={selectedMasterUsernameForModal} 
          onClose={() => setSelectedMasterUsernameForModal(null)} 
          onBook={(masterId) => {
            setSelectedMasterForDirectBooking(masterId)
            setIsFormOpen(true)
          }}
        />
      )}
    </div>
  )
}
