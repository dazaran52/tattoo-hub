import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Clock, CheckCircle, Calendar, Flag, MessageCircle, UserPlus, LayoutGrid, CalendarDays, Search, Users, PlayCircle, Palette, Trash2, X, Pencil, Send, Phone, Settings2 } from 'lucide-react'
import * as Icons from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionModal } from '@/components/SessionModal'
import { CalendarView } from '@/components/CalendarView'
import { ClientsDatabase } from '@/components/ClientsDatabase'
import { CompleteSessionModal } from '@/components/CompleteSessionModal'
import { SessionsList } from '@/components/SessionsList'
import { LeadAcceptWizardModal } from '@/components/LeadAcceptWizardModal'
import { KanbanColumnEditor } from '@/components/KanbanColumnEditor'

export interface CRMSession {
  id: string
  created_at: string
  session_date: string
  start_time?: string
  end_time?: string
  price?: number
  style?: string
  notes?: string
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
    is_deleted?: boolean
    leads?: {
      title: string
      image_urls: string[]
    }
  }
}

export interface KanbanColumn {
  id: string
  title: string
  iconName: string
  color: string
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'new', title: 'Новые', iconName: 'UserPlus', color: 'emerald' },
  { id: 'discussing', title: 'В диалоге', iconName: 'MessageCircle', color: 'violet' },
  { id: 'booked', title: 'Записан', iconName: 'Calendar', color: 'blue' },
  { id: 'in_progress', title: 'В процессе', iconName: 'PlayCircle', color: 'yellow' },
  { id: 'completed', title: 'Завершено', iconName: 'CheckCircle', color: 'green' },
  { id: 'cancelled', title: 'Отмена', iconName: 'Flag', color: 'red' },
]

const COLOR_STYLES: Record<string, { bg: string, border: string, leftBorder: string }> = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200', border: 'border-emerald-500/50', leftBorder: 'border-l-emerald-500' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200', border: 'border-violet-500/50', leftBorder: 'border-l-violet-500' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200', border: 'border-blue-500/50', leftBorder: 'border-l-blue-500' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200', border: 'border-yellow-500/50', leftBorder: 'border-l-yellow-500' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200', border: 'border-green-500/50', leftBorder: 'border-l-green-500' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200', border: 'border-red-500/50', leftBorder: 'border-l-red-500' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200', border: 'border-pink-500/50', leftBorder: 'border-l-pink-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200', border: 'border-orange-500/50', leftBorder: 'border-l-orange-500' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200', border: 'border-cyan-500/50', leftBorder: 'border-l-cyan-500' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 border-slate-200', border: 'border-slate-500/50', leftBorder: 'border-l-slate-500' },
}

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
  const [sessionToAccept, setSessionToAccept] = useState<CRMSession | null>(null)
  const [clientsForModal, setClientsForModal] = useState([])
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [kanbanDateFilter, setKanbanDateFilter] = useState<'all'|'this_week'|'this_month'>('all')
  const [selectedKanbanIds, setSelectedKanbanIds] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS)
  const [isEditingColumns, setIsEditingColumns] = useState(false)

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
      
      const profileRes = await fetch(`${apiUrl}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        if (profileData.kanban_columns && profileData.kanban_columns.length > 0) {
          setColumns(profileData.kanban_columns)
        }
      }
        
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
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
      if (item.status === 'new' && colId !== 'cancelled') {
        setSessionToAccept(item)
      } else {
        updateSessionStatus(sessionId, colId)
      }
    }
  }

  const saveColumns = async (newCols: KanbanColumn[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const res = await fetch(`${apiUrl}/api/profile`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ kanban_columns: newCols })
      })
      
      if (res.ok) {
        setColumns(newCols)
        setIsEditingColumns(false)
        toast.success('Настройки колонок сохранены')
      } else {
        throw new Error('Failed to save columns')
      }
    } catch (err) {
      toast.error('Ошибка при сохранении колонок')
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
              {sessionView === 'kanban' && !isEditingColumns && (
                <button
                  onClick={() => setIsEditingColumns(true)}
                  className="px-3 py-1.5 text-xs font-bold text-neutral-500 bg-neutral-200/50 hover:bg-neutral-200 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Settings2 className="w-4 h-4" />
                  Настроить колонки
                </button>
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
      ) : isEditingColumns ? (
        <KanbanColumnEditor 
          columns={columns} 
          onSave={saveColumns} 
          onCancel={() => setIsEditingColumns(false)} 
        />
      ) : (
        <div className="relative w-[100vw] left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] px-4 sm:px-6 lg:px-8">
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
              {columns.map(col => {
                const styles = COLOR_STYLES[col.color] || COLOR_STYLES.slate
                const Icon = (Icons as any)[col.iconName] || Icons.Star
                
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
                    className="flex-1 min-w-[280px] max-w-[300px] bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-neutral-200 dark:border-white/5 p-4 flex flex-col h-[75vh]"
                    onDragOver={(e) => handleDragOver(e, 'none')}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    <div className={`px-4 py-3 rounded-2xl border flex items-center justify-between mb-4 ${styles.bg}`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Icon className="w-4 h-4" />
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
                        colItems.map(item => {
                          const isNewLead = item.status === 'new'
                          const isSelected = selectedKanbanIds.has(item.id)
                          return (
                          <motion.div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e as any, item.id)}
                            onClick={() => !isNewLead && setSessionToEdit(item)}
                            className={`p-4 rounded-2xl shadow-sm border-y border-r border-l-4 ${styles.leftBorder} ${isSelected ? 'ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/20 border-y-neutral-200 border-r-neutral-200 dark:border-y-white/5 dark:border-r-white/5' : isNewLead ? 'border-y-emerald-400/50 border-r-emerald-400/50 bg-emerald-50/70 dark:bg-emerald-900/20 ring-1 ring-emerald-500/30' : 'bg-white dark:bg-neutral-800 border-y-neutral-200 border-r-neutral-200 dark:border-y-white/5 dark:border-r-white/5'} ${!isNewLead ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} relative overflow-hidden`}
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
                            
                            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-1.5 rounded-lg w-fit">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    {new Date(item.session_date).toLocaleDateString('ru-RU')}
                                    {cardView === 'expanded' && (item.start_time || item.end_time) && (
                                      <span className="opacity-75 whitespace-nowrap">
                                        • {item.start_time?.slice(0, 5)} {item.end_time ? `- ${item.end_time.slice(0, 5)}` : ''}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-neutral-400 font-medium ml-1">
                                    Создано: {new Date(item.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                  </span>
                                </div>
                                <div className="font-bold text-neutral-900 dark:text-white text-sm whitespace-nowrap mt-1">
                                  {item.price ? `${item.price} Kč` : '—'}
                                </div>
                              </div>
                              
                              {cardView === 'expanded' && (item.style || item.notes) && (
                                <div className="flex flex-col gap-1.5 mt-1 border-t border-dashed border-neutral-100 dark:border-white/5 pt-2">
                                  {item.style && (
                                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                      <Palette className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                      {item.style}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div className="text-xs text-neutral-500 italic line-clamp-3 leading-relaxed">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                              )}

                              {cardView === 'expanded' && (
                                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setSessionToEdit(item); }}
                                    className="p-1.5 text-neutral-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/20 rounded-lg transition-colors flex-1 flex justify-center"
                                    title="Редактировать сеанс"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  
                                  {item.master_clients?.leads && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); window.location.href = '/messages'; }}
                                      className="p-1.5 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors flex-1 flex justify-center"
                                      title="Чат платформы"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                  
                                  {item.master_clients?.telegram && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); window.open(`https://t.me/${item.master_clients!.telegram!.replace('@', '')}`, '_blank'); }}
                                      className="p-1.5 text-neutral-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/20 rounded-lg transition-colors flex-1 flex justify-center"
                                      title="Telegram"
                                    >
                                      <Send className="w-4 h-4" />
                                    </button>
                                  )}

                                  {item.master_clients?.phone && !item.master_clients?.telegram && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${item.master_clients!.phone!.replace(/[^0-9]/g, '')}`, '_blank'); }}
                                      className="p-1.5 text-neutral-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-lg transition-colors flex-1 flex justify-center"
                                      title="WhatsApp"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {isNewLead && (
                              <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/30 flex gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateSessionStatus(item.id, 'cancelled'); }}
                                  className="px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-colors"
                                >
                                  Отклонить
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSessionToAccept(item); }}
                                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-md transition-colors text-center"
                                >
                                  Принять в работу
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )})
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[99999] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
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
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800"></div>
          <button
            onClick={async () => {
              if (!window.confirm(`Вы уверены, что хотите удалить ${selectedKanbanIds.size} выбранных сеансов?`)) return;
              try {
                const { data: { session } } = await supabase.auth.getSession()
                const token = session?.access_token
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
                
                for (const id of Array.from(selectedKanbanIds)) {
                  await fetch(`${apiUrl}/api/crm/sessions/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                  })
                }
                toast.success(`Удалено сеансов: ${selectedKanbanIds.size}`)
                setSelectedKanbanIds(new Set())
                fetchData()
              } catch (err) {
                toast.error('Ошибка при удалении')
              }
            }}
            className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            title="Удалить выбранные"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedKanbanIds(new Set())}
            className="flex items-center justify-center p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Отменить выбор"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {sessionToAccept && (
        <LeadAcceptWizardModal
          isOpen={!!sessionToAccept}
          onClose={() => setSessionToAccept(null)}
          onSuccess={() => {
            fetchData()
            setSessionToAccept(null)
          }}
          session={sessionToAccept}
        />
      )}
    </div>
  )
}
