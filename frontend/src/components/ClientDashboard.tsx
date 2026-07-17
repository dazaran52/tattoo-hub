'use client'

import { useState, useEffect } from 'react'
import { Profile, supabase } from '@/lib/supabase'
import { PlusCircle, Heart, Clock, X, MoreVertical, Edit2, Pause, Play, Trash2, MessageCircle } from 'lucide-react'
import { LeadForm } from '@/components/LeadForm'
import { ChatModal } from '@/components/ChatModal'
import { MessagesList } from '@/components/MessagesList'
import { useLanguage } from '@/i18n/LanguageContext'

export function ClientDashboard({ profile }: { profile: Profile }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'leads' | 'favorites' | 'top_masters' | 'messages'>('leads')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedMasterForDirectBooking, setSelectedMasterForDirectBooking] = useState<string | null>(null)
  const [isMasterSelectModalOpen, setIsMasterSelectModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [topMasters, setTopMasters] = useState<any[]>([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [editingLead, setEditingLead] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedChatTitle, setSelectedChatTitle] = useState('')
  const [selectedChatMaster, setSelectedChatMaster] = useState('')

  const handlePauseResume = async (leadId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'open' ? 'archived' : 'open'
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

    fetchLeads()
    fetchTopMasters()
  }, [])

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
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Heart className="w-4 h-4 inline-block mr-2" />
            {t('favoriteMasters')}
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
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'messages'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline-block mr-2" />
            {t('messages') || 'Сообщения'}
          </button>
        </div>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <PlusCircle className="w-8 h-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Найти мне мастера</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm">
                Отправьте заявку в общую ленту маркетплейса. Подходящие мастера откликнутся сами.
              </p>
              <button 
                onClick={() => { setSelectedMasterForDirectBooking(null); setIsFormOpen(true) }}
                className="px-6 py-3 w-full max-w-[200px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
              >
                Создать заявку
              </button>
            </div>
            
            <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Heart className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Записаться к конкретному</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-sm">
                Выберите мастера из списка всех мастеров и запишитесь к нему напрямую.
              </p>
              <button 
                onClick={() => { setIsMasterSelectModalOpen(true) }}
                className="px-6 py-3 w-full max-w-[200px] bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-colors"
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
            <div key={lead.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                  {lead.status === 'open' ? t('statusSearching') || 'Searching' : 
                   lead.status === 'accepted' ? t('statusAccepted') || 'Accepted' : 
                   lead.status === 'completed' ? t('statusCompleted') || 'Completed' : 
                   lead.status === 'archived' ? t('statusArchived') || 'Archived' : lead.status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(lead.created_at).toLocaleDateString()}</span>
                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)}
                      className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === lead.id && (
                      <>
                        <div className="fixed inset-0 z-[5]" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg overflow-hidden z-10">
                        <button 
                          onClick={() => { setOpenMenuId(null); handlePauseResume(lead.id, lead.status) }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {lead.status === 'open' ? <><Pause className="w-4 h-4" /> {t('pause') || 'Pause'}</> : <><Play className="w-4 h-4" /> {t('resume') || 'Resume'}</>}
                        </button>
                        <button 
                          onClick={() => { setOpenMenuId(null); handleDelete(lead.id) }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" /> {t('delete') || 'Delete'}
                        </button>
                      </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-3">{lead.title || t('tattooLead')}</h4>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {lead.style && lead.style !== 'Не определился' && (
                  <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold rounded-md">
                    {lead.style}
                  </span>
                )}
                {lead.body_place && lead.body_place !== 'Не определился' && (
                  <span className="px-2 py-1 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-semibold rounded-md">
                    {lead.body_place}
                  </span>
                )}
                {lead.size && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-md">
                    {lead.size}
                  </span>
                )}
              </div>
              
              {lead.image_urls && Array.isArray(lead.image_urls) && lead.image_urls.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700">
                  {lead.image_urls.map((url: any, i: number) => {
                    const imgSrc = typeof url === 'string' ? url : (url?.url || '');
                    if (!imgSrc) return null;
                    return (
                      <div key={i} className="snap-center shrink-0 w-24 h-24 relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-sm group">
                        <img src={imgSrc} alt="Reference" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    )
                  })}
                </div>
              )}
              
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5 line-clamp-3 leading-relaxed bg-neutral-50 dark:bg-neutral-950/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/50">
                {lead.description || t('noDescription')}
              </p>

              {lead.master && (
                <div className="mb-5 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={lead.master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(lead.master.name || 'Master')}`} 
                      alt="Master" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-neutral-800 shadow-sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">{t('assignedMaster') || 'Ваш мастер'}</p>
                      <h5 className="font-bold text-sm text-neutral-900 dark:text-white">{lead.master.name}</h5>
                      <a href={`/book/${lead.master.username}`} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-500 hover:text-indigo-500 transition-colors">@{lead.master.username}</a>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                    {lead.session && lead.session.session_date ? (
                      <div className="text-left sm:text-right bg-white dark:bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-100 dark:border-neutral-800 shadow-sm">
                        <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-0.5">{t('sessionDate') || 'Сеанс'}</p>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          {new Date(lead.session.session_date).toLocaleDateString()}
                          {lead.session.start_time && ` ${lead.session.start_time}`}
                        </p>
                      </div>
                    ) : lead.chat_id ? (
                       <div className="text-left sm:text-right">
                         <p className="text-xs text-neutral-500 font-medium whitespace-nowrap">Ожидает назначения даты</p>
                       </div>
                    ) : null}
                    
                    {lead.chat_id && (
                      <button 
                        onClick={() => {
                          setSelectedChatId(lead.chat_id)
                          setSelectedChatTitle(lead.title)
                          setSelectedChatMaster(lead.master.name)
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Чат
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center text-sm border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-auto">
                <span className="text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg">
                  {t('budgetLabel') || 'Бюджет:'} <strong className="text-neutral-900 dark:text-white ml-1">{lead.display_budget || lead.client_budget ? `${lead.client_budget} ${lead.client_currency || 'CZK'}` : t('negotiableBudget')}</strong>
                </span>
                {!lead.master && (
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg">
                    {lead.unlock_count || 0} {
                      (lead.unlock_count || 0) === 1 ? (t('response_one') || 'отклик') :
                      (lead.unlock_count || 0) >= 2 && (lead.unlock_count || 0) <= 4 ? (t('response_few') || 'отклика') :
                      (t('response_many') || 'откликов')
                    }
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'favorites' ? (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-500 mb-2">{t('noFavorites')}</h3>
          <p className="text-neutral-400">{t('saveMastersDesc')}</p>
        </div>
      ) : activeTab === 'messages' ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm h-[600px] flex">
          <MessagesList />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 max-w-2xl">
              <h3 className="text-3xl font-extrabold mb-4">Найти идеального мастера стало проще</h3>
              <p className="text-indigo-100 font-medium mb-6 text-lg">
                Оставьте одну заявку, и лучшие мастера вашего города сами предложат вам свои условия, цены и эскизы. Выбирайте того, кто подходит именно вам!
              </p>
              <button 
                onClick={() => setIsFormOpen(true)}
                className="px-8 py-4 bg-white text-indigo-900 font-extrabold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg hover:shadow-xl hover:scale-105"
              >
                Оставить заявку всем мастерам
              </button>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-12 mb-6">Рейтинг мастеров</h3>
          
          {isLoadingMasters ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl h-[400px] animate-pulse"></div>
              ))}
            </div>
          ) : topMasters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topMasters.map(master => (
                <div key={master.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow group flex flex-col">
                  <div className="p-6 pb-4 flex items-start gap-4">
                    <img 
                      src={master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(master.display_name || master.username || 'M')}`}
                      alt="Avatar"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-neutral-100 dark:border-neutral-800"
                    />
                    <div>
                      <h4 className="font-bold text-lg text-neutral-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {master.display_name || master.username}
                      </h4>
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
                          <img src={post.media?.[0]?.url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt="Portfolio" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="px-6 pb-6 mt-auto">
                    <a 
                      href={`/book/${master.username}?source=platform`}
                      target="_blank"
                      className="block w-full py-3 text-center bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600 text-neutral-900 dark:text-white font-bold rounded-xl transition-all"
                    >
                      Смотреть портфолио
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-12 text-neutral-500">Нет доступных мастеров</div>
          )}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setIsFormOpen(false) }}>
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-50 dark:bg-neutral-950 rounded-3xl p-6 md:p-10 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 z-50 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full bg-neutral-200/50 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-4">
              <LeadForm masterId={selectedMasterForDirectBooking || undefined} />
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
                      <img 
                        src={master.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(master.display_name || master.username || 'M')}`}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover"
                      />
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
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
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
    </div>
  )
}
