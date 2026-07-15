import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Clock, CheckCircle, Calendar, Flag, MessageCircle, UserPlus, LayoutGrid, CalendarDays, Search, Users, PlayCircle, Palette, Trash2, X, Pencil, Send, Phone, Settings2 } from 'lucide-react'
import * as Icons from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SessionModal } from '@/components/SessionModal'
import { CalendarView } from '@/components/CalendarView'
import { ClientsDatabase } from '@/components/ClientsDatabase'
import { CompleteSessionModal } from '@/components/CompleteSessionModal'
import { ClientDetailsModal } from '@/components/ClientDetailsModal'
import { SessionsList } from '@/components/SessionsList'
import { LeadAcceptWizardModal } from '@/components/LeadAcceptWizardModal'
import { KanbanColumnEditor } from '@/components/KanbanColumnEditor'
import { LeadDetailsModal } from '@/components/LeadDetailsModal'
import { ImageViewerModal } from '@/components/ImageViewerModal'

export interface CRMSession {
  id: string
  created_at: string
  session_date: string
  start_time?: string
  end_time?: string
  price?: number
  style?: string
  notes?: string
  body_place?: string
  size?: string
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

const COLOR_STYLES: Record<string, { bg: string, border: string, leftBorder: string, ring: string, checkboxBg: string, checkboxHover: string, cardBg: string }> = {
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200', border: 'border-emerald-500/50', leftBorder: 'border-l-emerald-500', ring: 'ring-emerald-500', checkboxBg: 'bg-emerald-500', checkboxHover: 'hover:border-emerald-400', cardBg: 'bg-emerald-50/50 dark:bg-emerald-900/10' },
  violet: { bg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200', border: 'border-violet-500/50', leftBorder: 'border-l-violet-500', ring: 'ring-violet-500', checkboxBg: 'bg-violet-500', checkboxHover: 'hover:border-violet-400', cardBg: 'bg-violet-50/50 dark:bg-violet-900/10' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200', border: 'border-blue-500/50', leftBorder: 'border-l-blue-500', ring: 'ring-blue-500', checkboxBg: 'bg-blue-500', checkboxHover: 'hover:border-blue-400', cardBg: 'bg-blue-50/50 dark:bg-blue-900/10' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200', border: 'border-yellow-500/50', leftBorder: 'border-l-yellow-500', ring: 'ring-yellow-500', checkboxBg: 'bg-yellow-500', checkboxHover: 'hover:border-yellow-400', cardBg: 'bg-yellow-50/50 dark:bg-yellow-900/10' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200', border: 'border-green-500/50', leftBorder: 'border-l-green-500', ring: 'ring-green-500', checkboxBg: 'bg-green-500', checkboxHover: 'hover:border-green-400', cardBg: 'bg-green-50/50 dark:bg-green-900/10' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200', border: 'border-red-500/50', leftBorder: 'border-l-red-500', ring: 'ring-red-500', checkboxBg: 'bg-red-500', checkboxHover: 'hover:border-red-400', cardBg: 'bg-red-50/50 dark:bg-red-900/10' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200', border: 'border-pink-500/50', leftBorder: 'border-l-pink-500', ring: 'ring-pink-500', checkboxBg: 'bg-pink-500', checkboxHover: 'hover:border-pink-400', cardBg: 'bg-pink-50/50 dark:bg-pink-900/10' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200', border: 'border-orange-500/50', leftBorder: 'border-l-orange-500', ring: 'ring-orange-500', checkboxBg: 'bg-orange-500', checkboxHover: 'hover:border-orange-400', cardBg: 'bg-orange-50/50 dark:bg-orange-900/10' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200', border: 'border-cyan-500/50', leftBorder: 'border-l-cyan-500', ring: 'ring-cyan-500', checkboxBg: 'bg-cyan-500', checkboxHover: 'hover:border-cyan-400', cardBg: 'bg-cyan-50/50 dark:bg-cyan-900/10' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 border-slate-200', border: 'border-slate-500/50', leftBorder: 'border-l-slate-500', ring: 'ring-slate-500', checkboxBg: 'bg-slate-500', checkboxHover: 'hover:border-slate-400', cardBg: 'bg-slate-50/50 dark:bg-slate-900/10' },
}

export function CRMBoard() {
  const [sessions, setSessions] = useState<CRMSession[]>([])
  const [loading, setLoading] = useState(true)
  
  const [mainTab, setMainTab] = useState<'sessions' | 'clients'>('sessions')
  const [sessionView, setSessionView] = useState<'kanban' | 'list' | 'calendar'>('kanban')
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  
  // Custom drag ghost position tracking
  const dragGhostX = useMotionValue(0)
  const dragGhostY = useMotionValue(0)

  
  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null)
  const [sessionToEdit, setSessionToEdit] = useState<CRMSession | null>(null)
  const [sessionToAccept, setSessionToAccept] = useState<CRMSession | null>(null)
  const [sessionDetails, setSessionDetails] = useState<CRMSession | null>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [clientToView, setClientToView] = useState<any | null>(null)
  const [clientsForModal, setClientsForModal] = useState([])
  
  const handleSessionClick = (session: CRMSession) => {
    if (session.status === 'new') {
      setSessionDetails(session)
    } else {
      setSessionToEdit(session)
    }
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all'|'today'|'this_week'|'this_month'>('this_month')
  const [selectedKanbanIds, setSelectedKanbanIds] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS)
  const [isEditingColumns, setIsEditingColumns] = useState(false)
  
  const dateFilteredSessions = useMemo(() => {
    if (dateFilter === 'all') return sessions
    return sessions.filter(i => {
      if (!i.session_date) return false
      const d = new Date(i.session_date)
      const now = new Date()
      if (dateFilter === 'today') {
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      } else if (dateFilter === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      } else if (dateFilter === 'this_week') {
        const day = now.getDay() || 7
        const diff = now.getDate() - day + 1
        const monday = new Date(now)
        monday.setDate(diff)
        monday.setHours(0,0,0,0)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23,59,59,999)
        return d >= monday && d <= sunday
      }
      return true
    })
  }, [sessions, dateFilter])

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
          .select('*, master_clients(*, leads(title, description, image_urls, client_priority, body_place, size))')
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
    if (selectedKanbanIds.has(sessionId) && selectedKanbanIds.size > 1) {
      setDraggingGroupId(sessionId)
      e.dataTransfer.setData('sessionIds', JSON.stringify(Array.from(selectedKanbanIds)))
      
      // Update our custom drag layer coordinates
      dragGhostX.set(e.clientX)
      dragGhostY.set(e.clientY)
      
      // Hide the default browser drag image
      const emptyImage = new Image()
      emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
      e.dataTransfer.setDragImage(emptyImage, 0, 0)
    } else {
      e.dataTransfer.setData('sessionIds', JSON.stringify([sessionId]))
    }
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
    const rawIds = e.dataTransfer.getData('sessionIds')
    if (!rawIds) return
    let sessionIds: string[] = []
    try {
      sessionIds = JSON.parse(rawIds)
    } catch {
      sessionIds = [rawIds]
    }

    sessionIds.forEach(sessionId => {
      const item = sessions.find(i => i.id === sessionId)
      if (item && item.status !== colId) {
        if (item.status === 'new' && colId !== 'cancelled') {
          // If moving multiple new leads, we can only safely accept one via modal right now
          if (sessionIds.length === 1) setSessionDetails(item)
        } else {
          updateSessionStatus(sessionId, colId)
        }
      }
    })
    setSelectedKanbanIds(new Set())
    setDraggingGroupId(null)
  }

  const handleDragEnd = () => {
    setDraggingGroupId(null)
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
              {(sessionView === 'kanban' || sessionView === 'list') && (
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none font-medium"
                >
                  <option value="today">Сегодня</option>
                  <option value="this_week">Эта неделя</option>
                  <option value="this_month">Этот месяц</option>
                  <option value="all">Все время</option>
                </select>
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
          onSessionClick={handleSessionClick}
          onCreateSession={() => setIsSessionModalOpen(true)}
          onSessionComplete={setSessionToComplete}
        />
      ) : sessionView === 'list' ? (
        <SessionsList 
          sessions={dateFilteredSessions} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onStatusChange={updateSessionStatus}
          onSessionClick={handleSessionClick}
          onUpdate={fetchData}
        />
      ) : isEditingColumns ? (
        <KanbanColumnEditor 
          columns={columns} 
          onSave={saveColumns} 
          onCancel={() => setIsEditingColumns(false)} 
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
              {columns.map(col => {
                const styles = COLOR_STYLES[col.color] || COLOR_STYLES.slate
                const Icon = (Icons as any)[col.iconName] || Icons.Star
                
                const colItems = dateFilteredSessions.filter(i => {
                  const search = searchQuery.toLowerCase().replace(/\s/g, '')
                  const cName = (i.master_clients?.name || '').toLowerCase().replace(/\s/g, '')
                  const cContact = (i.master_clients?.contact_info || '').toLowerCase().replace(/\s/g, '')
                  const matchesSearch = cName.includes(search) || cContact.includes(search)
                  
                  return (i.status === col.id || (i.status === 'scheduled' && col.id === 'booked')) && matchesSearch
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
                          const isDraggedGroupItem = draggingGroupId && selectedKanbanIds.has(item.id) && draggingGroupId !== item.id
                          const clientName = item.master_clients?.name || 'Неизвестный'
                          const initial = clientName.charAt(0).toUpperCase()
                          const images = item.reference_images && item.reference_images.length > 0 ? item.reference_images : (item.master_clients?.leads?.image_urls || [])
                          
                          return (
                          <motion.div
                            layout
                            initial={false}
                            animate={isDraggedGroupItem ? { scale: 0.5, opacity: 0, height: 0, marginTop: 0, marginBottom: 0, padding: 0, borderWidth: 0 } : { opacity: 1, scale: 1, height: 'auto', marginBottom: 12, padding: 16 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            style={{ overflow: isDraggedGroupItem ? 'hidden' : 'visible' }}
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e as any, item.id)}
                            onDrag={(e: any) => {
                              if (isDraggedGroupItem || item.id === draggingGroupId) {
                                if (e.clientX !== 0 && e.clientY !== 0) {
                                  dragGhostX.set(e.clientX)
                                  dragGhostY.set(e.clientY)
                                }
                              }
                            }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              const target = e.target as HTMLElement
                              if (target.closest('button') || target.closest('.no-select-click')) return
                              const newSet = new Set(selectedKanbanIds)
                              if (newSet.has(item.id)) newSet.delete(item.id)
                              else newSet.add(item.id)
                              setSelectedKanbanIds(newSet)
                            }}
                            className={`rounded-2xl border-2 ${styles.border} ${styles.cardBg} ${isSelected ? `!bg-neutral-100 dark:!bg-neutral-700 shadow-inner scale-[1.01] z-10` : 'hover:scale-[1.01] shadow-sm'} cursor-pointer transition-all duration-300 relative group overflow-hidden`}
                          >
                            <div className="absolute top-3 right-3 flex items-center gap-2 z-10 no-select-click">

                              <div
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const newSet = new Set(selectedKanbanIds)
                                  if (newSet.has(item.id)) newSet.delete(item.id)
                                  else newSet.add(item.id)
                                  setSelectedKanbanIds(newSet)
                                }}
                                className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors ${isSelected ? `${styles.checkboxBg} text-white shadow-sm` : `border-2 border-neutral-300 dark:border-neutral-600 ${styles.checkboxHover} bg-white/50 dark:bg-neutral-800/50`}`}
                              >
                                {isSelected && <Icons.Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mb-3 pr-14">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${styles.bg.split('border')[0]}`}>
                                {initial}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                                  {clientName}
                                </h4>
                                <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                                  {item.master_clients?.phone || item.master_clients?.telegram || item.master_clients?.email || 'Нет контактов'}
                                </p>
                              </div>
                            </div>
                            
                            {images.length > 0 && (
                              <div className={`grid gap-2 mb-3 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {images.slice(0, 2).map((img, idx) => (
                                  <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                                    <img 
                                      src={img} 
                                      alt="" 
                                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" 
                                      draggable={false} 
                                      onClick={(e) => { e.stopPropagation(); setViewerImage(img); }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-1.5 rounded-lg w-fit">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    {new Date(item.session_date).toLocaleDateString('ru-RU')}
                                    {(item.start_time || item.end_time) && (
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
                              
                              {(item.style || item.notes || item.body_place || item.size) && (
                                <div className="flex flex-col gap-1.5 mt-1 border-t border-dashed border-neutral-100 dark:border-white/5 pt-2">
                                  {item.style && (
                                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                      <Palette className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                      {item.style}
                                    </div>
                                  )}
                                  {item.body_place && (
                                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                      Место: {item.body_place}
                                    </div>
                                  )}
                                  {item.size && (
                                    <span className="text-neutral-500 dark:text-neutral-400">
                                      Размер: {item.size}
                                    </span>
                                  )}
                                  {item.notes && (
                                    <div className="text-xs text-neutral-500 italic line-clamp-3 leading-relaxed mt-0.5">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/5 flex">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isNewLead) {
                                    setSessionDetails(item);
                                  } else {
                                    setClientToView(item.master_clients);
                                  }
                                }}
                                className={`w-full py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-colors ${isNewLead ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700 dark:bg-violet-600/90 dark:hover:bg-violet-600'}`}
                              >
                                Посмотреть
                              </button>
                            </div>
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

      {/* Animated Custom Drag Ghost for Groups */}
      {draggingGroupId && typeof document !== 'undefined' && createPortal(
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            x: dragGhostX,
            y: dragGhostY,
            translateX: '-50%',
            translateY: '-50%',
            pointerEvents: 'none',
            zIndex: 9999999,
            width: 200,
            height: 60
          }}
        >
          <div className="relative w-full h-full drop-shadow-2xl">
            <div className="absolute w-full h-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 top-3 left-3 -z-20"></div>
            <div className="absolute w-full h-full bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 top-1.5 left-1.5 -z-10"></div>
            <div className="absolute w-full h-full bg-white dark:bg-neutral-800 rounded-xl border-2 border-emerald-500 z-10 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
              Заявок: {selectedKanbanIds.size}
            </div>
          </div>
        </motion.div>,
        document.body
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
          allSessions={sessions}
          onSessionClick={(s) => setSessionDetails(s)}
        />
      )}
      <LeadDetailsModal
        isOpen={!!sessionDetails}
        onClose={() => setSessionDetails(null)}
        session={sessionDetails}
        chatId={clientsForModal.find(c => c.id === sessionDetails?.client_id)?.chat_id}
        onAccept={() => {
          if (sessionDetails) setSessionToAccept(sessionDetails)
        }}
        onReject={() => {
          if (sessionDetails) updateSessionStatus(sessionDetails.id, 'rejected')
        }}
      />

      {clientToView && (
        <ClientDetailsModal
          isOpen={!!clientToView}
          onClose={() => setClientToView(null)}
          client={clientToView}
          onUpdate={fetchData}
          onSessionClick={handleSessionClick}
          chatId={clientToView.chat_id || null}
        />
      )}

      {viewerImage && (
        <ImageViewerModal
          isOpen={!!viewerImage}
          onClose={() => setViewerImage(null)}
          imageUrl={viewerImage}
          showActions={true}
        />
      )}
    </div>
  )
}
