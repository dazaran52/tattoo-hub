import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Clock, CheckCircle, Calendar, Flag, MessageCircle, UserPlus, LayoutGrid, CalendarDays, Search, Users, PlayCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionModal } from '@/components/SessionModal'
import { CalendarView } from '@/components/CalendarView'
import { ClientsDatabase } from '@/components/ClientsDatabase'
import { CompleteSessionModal } from '@/components/CompleteSessionModal'
import { SessionsList } from '@/components/SessionsList'

export interface CRMSession {
  id: string
  created_at: string
  session_date: string
  start_time?: string
  end_time?: string
  price?: number
  style?: string
  reference_images?: string[]
  result_image_urls?: string[]
  status: string
  master_clients?: {
    id: string
    name: string
    contact_info?: string
    phone?: string
    telegram?: string
    email?: string
    leads?: {
      title: string
      image_urls: string[]
    }
  }
}

const COLUMNS = [
  { id: 'new', title: 'Новые', icon: <UserPlus className="w-4 h-4" />, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200' },
  { id: 'discussing', title: 'В диалоге', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200' },
  { id: 'booked', title: 'Записан', icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200' },
  { id: 'in_progress', title: 'В процессе', icon: <PlayCircle className="w-4 h-4" />, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200' },
  { id: 'completed', title: 'Завершено', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200' },
  { id: 'cancelled', title: 'Отмена', icon: <Flag className="w-4 h-4" />, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200' },
]

export function CRMBoard() {
  const [sessions, setSessions] = useState<CRMSession[]>([])
  const [loading, setLoading] = useState(true)
  
  const [mainTab, setMainTab] = useState<'sessions' | 'clients'>('sessions')
  const [sessionView, setSessionView] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [cardView, setCardView] = useState<'normal' | 'expanded'>('normal')
  
  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null)
  const [sessionToEdit, setSessionToEdit] = useState<CRMSession | null>(null)
  const [clientsForModal, setClientsForModal] = useState([])
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [kanbanDateFilter, setKanbanDateFilter] = useState<'all'|'this_week'|'this_month'>('all')
  const [selectedKanbanIds, setSelectedKanbanIds] = useState<Set<string>>(new Set())

  // Scroll ref for drag and drop
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      let sessionsData = null;
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('master_sessions')
          .select('*, master_clients(*, leads(title, description, image_urls, client_priority))')
          .eq('master_id', user.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
        
        if (data) {
           sessionsData = data.filter(s => s.master_clients && !s.master_clients.is_deleted)
        } else {
           sessionsData = []
        }
      } else {
        sessionsData = []
      }
      setSessions(sessionsData)

      const clientsRes = await fetch(`${apiUrl}/api/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (clientsRes.ok) setClientsForModal(await clientsRes.json())
        
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const { error } = await supabase.from('master_sessions')
        .update({ status: newStatus })
        .eq('id', sessionId)
      if (error) throw error
      
      setSessions(prev => prev.map(item => 
        item.id === sessionId ? { ...item, status: newStatus } : item
      ))
      
      // If moved to completed, open the portfolio modal
      if (newStatus === 'completed') {
        setSessionToComplete(sessionId)
      } else {
        toast.success('Статус обновлен')
      }
    } catch (err) {
      toast.error('Ошибка обновления статуса')
    }
  }

  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData('sessionId', sessionId)
  }

  const handleDragOver = (e: React.DragEvent, direction: 'left' | 'right' | 'none') => {
    e.preventDefault()
    if (scrollContainerRef.current && direction !== 'none') {
      const scrollAmount = direction === 'right' ? 10 : -10
      scrollContainerRef.current.scrollLeft += scrollAmount
    }
  }

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    const sessionId = e.dataTransfer.getData('sessionId')
    const item = sessions.find(i => i.id === sessionId)
    // Avoid double trigger if it's already in the same column
    if (item && item.status !== colId) {
      updateSessionStatus(sessionId, colId)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  return (
    <div className="w-full pb-4 relative">
      {/* Main Navigation Tabs */}
      <div className="flex gap-4 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setMainTab('sessions')}
          className={`text-lg font-bold pb-2 border-b-2 transition-all ${mainTab === 'sessions' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Сеансы
        </button>
        <button
          onClick={() => setMainTab('clients')}
          className={`text-lg font-bold pb-2 border-b-2 transition-all ${mainTab === 'clients' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          База клиентов
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-4">
          {mainTab === 'sessions' && (
            <>
              <div className="bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-xl flex items-center">
                <button
                  onClick={() => setSessionView('kanban')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${sessionView === 'kanban' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <LayoutGrid className="w-4 h-4"/>
                  Канбан
                </button>
                <button 
                  onClick={() => setSessionView('list')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${sessionView === 'list' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <Users className="w-4 h-4"/>
                  Список
                </button>
                <button 
                  onClick={() => setSessionView('calendar')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${sessionView === 'calendar' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <CalendarDays className="w-4 h-4"/>
                  Календарь
                </button>
              </div>
              
              {(sessionView === 'kanban' || sessionView === 'list') && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    type="text" 
                    placeholder="Поиск сеансов..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none w-64 transition-all"
                  />
                </div>
              )}
              {sessionView === 'kanban' && (
                <select 
                  value={kanbanDateFilter}
                  onChange={(e) => setKanbanDateFilter(e.target.value as any)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none font-medium"
                >
                  <option value="all">Все время</option>
                  <option value="this_week">Эта неделя</option>
                  <option value="this_month">Этот месяц</option>
                </select>
              )}
              {(sessionView === 'kanban' || sessionView === 'list') && (
                <div className="flex items-center bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-xl">
                  <button
                    onClick={() => setCardView('normal')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${cardView === 'normal' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                  >
                    Обычный
                  </button>
                  <button
                    onClick={() => setCardView('expanded')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${cardView === 'expanded' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                  >
                    Расширенный
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        {mainTab === 'sessions' && sessionView !== 'calendar' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4" />
              Новый сеанс
            </button>
          </div>
        )}
      </div>

      {mainTab === 'clients' ? (
        <ClientsDatabase />
      ) : sessionView === 'calendar' ? (
        <CalendarView 
          sessions={sessions} 
          onUpdate={fetchData} 
        />
      ) : sessionView === 'list' ? (
        <SessionsList 
          sessions={sessions} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onStatusChange={updateSessionStatus}
          onSessionClick={setSessionToEdit}
          onUpdate={fetchData}
          cardView={cardView}
        />
      ) : (
        <div className="relative">
          {/* Scroll zones for dragging */}
          <div 
            className="absolute left-0 top-0 w-16 h-full z-10" 
            onDragOver={(e) => handleDragOver(e, 'left')} 
          />
          <div 
            className="absolute right-0 top-0 w-16 h-full z-10" 
            onDragOver={(e) => handleDragOver(e, 'right')} 
          />

          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 custom-scrollbar"
          >
            <div className="flex gap-4 min-w-[1500px]">
              {COLUMNS.map(col => {
                const colItems = sessions.filter(i => {
                  const search = searchQuery.toLowerCase().replace(/\s/g, '')
                  const cName = (i.master_clients?.name || '').toLowerCase().replace(/\s/g, '')
                  const cContact = (i.master_clients?.contact_info || '').toLowerCase().replace(/\s/g, '')
                  const matchesSearch = cName.includes(search) || cContact.includes(search)
                  
                  let matchesDate = true
                  if (kanbanDateFilter !== 'all') {
                    const d = new Date(i.session_date)
                    const now = new Date()
                    if (kanbanDateFilter === 'this_month') {
                      matchesDate = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
                    } else if (kanbanDateFilter === 'this_week') {
                      const day = now.getDay() || 7
                      const diff = now.getDate() - day + 1
                      const monday = new Date(now.setDate(diff))
                      monday.setHours(0,0,0,0)
                      const sunday = new Date(monday)
                      sunday.setDate(monday.getDate() + 6)
                      sunday.setHours(23,59,59,999)
                      matchesDate = d >= monday && d <= sunday
                    }
                  }
                  
                  return (i.status === col.id || (i.status === 'scheduled' && col.id === 'booked')) && matchesSearch && matchesDate
                })
                
                return (
                  <div 
                    key={col.id} 
                    className="flex-1 min-w-[320px] max-w-[350px] bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-neutral-200 dark:border-white/5 p-4 flex flex-col h-[75vh]"
                    onDragOver={(e) => handleDragOver(e, 'none')}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    <div className={`px-4 py-3 rounded-2xl border flex items-center justify-between mb-4 ${col.color}`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {col.icon}
                        {col.title}
                      </div>
                      <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">
                        {colItems.length}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {colItems.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400 text-sm italic border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                          Перетащите сюда
                        </div>
                      ) : (
                        colItems.map(item => (
                          <motion.div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e as any, item.id)}
                            onClick={() => setSessionToEdit(item)}
                            className={`bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-sm border ${selectedKanbanIds.has(item.id) ? 'border-violet-500 ring-2 ring-violet-500' : 'border-neutral-200 dark:border-white/5'} cursor-pointer hover:shadow-md transition-shadow relative`}
                          >
                            <input 
                              type="checkbox"
                              checked={selectedKanbanIds.has(item.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedKanbanIds)
                                if (newSet.has(item.id)) newSet.delete(item.id)
                                else newSet.add(item.id)
                                setSelectedKanbanIds(newSet)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-3 right-3 w-4 h-4 rounded border-neutral-300 text-violet-600 focus:ring-violet-500 z-10"
                            />
                            <div className="flex gap-3 mb-3 pr-6">
                              {item.reference_images && item.reference_images.length > 0 ? (
                                <img src={item.reference_images[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                              ) : item.master_clients?.leads?.image_urls && item.master_clients.leads.image_urls.length > 0 ? (
                                <img src={item.master_clients.leads.image_urls[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                              ) : (
                                <div className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700 text-neutral-400 rounded-xl">
                                  <UserPlus className="w-5 h-5" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                                  {item.master_clients?.name || 'Неизвестный'}
                                </h4>
                                <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                                  {item.master_clients?.phone || item.master_clients?.telegram || item.master_clients?.email || 'Нет контактов'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-1.5 rounded-lg w-fit">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(item.session_date).toLocaleDateString('ru-RU')}
                                  {cardView === 'expanded' && (item.start_time || item.end_time) && (
                                    <span className="opacity-75">
                                      • {item.start_time?.slice(0, 5)} {item.end_time ? `- ${item.end_time.slice(0, 5)}` : ''}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-400 font-medium">
                                  Создано: {new Date(item.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                </span>
                              </div>
                              <div className="font-bold text-neutral-900 dark:text-white text-sm">
                                {item.price ? `${item.price} Kč` : '—'}
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isSessionModalOpen && (
        <SessionModal
          isOpen={isSessionModalOpen}
          onClose={() => setIsSessionModalOpen(false)}
          onSuccess={() => {
            setIsSessionModalOpen(false)
            fetchData()
          }}
          existingClients={clientsForModal}
        />
      )}

      {sessionToEdit && (
        <SessionModal
          isOpen={!!sessionToEdit}
          onClose={() => setSessionToEdit(null)}
          onSuccess={() => {
            setSessionToEdit(null)
            fetchData()
          }}
          editSession={sessionToEdit}
          existingClients={clientsForModal}
        />
      )}

      {sessionToComplete && (
        <CompleteSessionModal
          isOpen={!!sessionToComplete}
          onClose={() => setSessionToComplete(null)}
          sessionId={sessionToComplete}
          onSuccess={() => {
            setSessionToComplete(null)
            fetchData()
          }}
        />
      )}

      {sessionView === 'kanban' && selectedKanbanIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <span className="font-bold text-violet-600 dark:text-violet-400">Выбрано: {selectedKanbanIds.size}</span>
          <select 
            onChange={(e) => { 
              if(e.target.value) {
                Array.from(selectedKanbanIds).forEach(id => updateSessionStatus(id, e.target.value))
                setSelectedKanbanIds(new Set())
              }
              e.target.value=''
            }}
            className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none font-bold"
          >
            <option value="">Сменить статус...</option>
            <option value="new">Новые</option>
            <option value="discussing">В диалоге</option>
            <option value="booked">Записан</option>
            <option value="in_progress">В процессе</option>
            <option value="completed">Завершено</option>
            <option value="cancelled">Отмена</option>
          </select>
        </div>
      )}
    </div>
  )
}
