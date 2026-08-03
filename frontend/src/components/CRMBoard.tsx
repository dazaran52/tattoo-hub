import Image from 'next/image'
import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Clock, CheckCircle, Calendar, Flag, MessageCircle, UserPlus, LayoutGrid, CalendarDays, Search, Users, PlayCircle, Palette, Trash2, X, Pencil, Send, Phone, Settings2, MapPin, Maximize2, FileText, RefreshCw, PersonStanding } from 'lucide-react'
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
import { MasterLeadModal } from '@/components/MasterLeadModal'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { SkeletonKanban, SkeletonTable } from '@/components/SkeletonCard'
import { CreateDisputeModal } from '@/components/CreateDisputeModal'
import { useLanguage } from '@/i18n/LanguageContext'

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
  source?: string
  lead_id?: string
  master_clients?: {
    id: string
    name: string
    contact_info?: string
    phone?: string
    telegram?: string
    email?: string
    is_deleted?: boolean
    is_unlocked?: boolean
    source?: string
    lead_id?: string
    is_lead?: boolean
    leads?: {
      id?: string
      title: string
      image_urls: string[]
      is_personal?: boolean
    }
  }
}

export interface KanbanColumn {
  id: string
  title: string
  iconName: string
  color: string
}

// NOTE: `title` here intentionally stays in Russian and is NOT read directly
// by the UI. It is only used as an internal "factory default" signature: at
// render time, getColumnTitle() compares a column's title against this array
// to decide whether to show it translated (t('crmBoard.columns.<id>')) or, if
// the master has renamed the column via the column editor, the custom title
// exactly as saved on the backend (kanban_columns on the profile). This keeps
// the persisted `id`/`title` values fully backend-compatible while still
// letting the board render localized labels for anyone who hasn't customized
// their columns.
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
  violet: { bg: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200', border: 'border-primary-500/50', leftBorder: 'border-l-primary-500', ring: 'ring-primary-500', checkboxBg: 'bg-primary-500', checkboxHover: 'hover:border-primary-400', cardBg: 'bg-primary-50/50 dark:bg-primary-900/10' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200', border: 'border-blue-500/50', leftBorder: 'border-l-blue-500', ring: 'ring-blue-500', checkboxBg: 'bg-blue-500', checkboxHover: 'hover:border-blue-400', cardBg: 'bg-blue-50/50 dark:bg-blue-900/10' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200', border: 'border-yellow-500/50', leftBorder: 'border-l-yellow-500', ring: 'ring-yellow-500', checkboxBg: 'bg-yellow-500', checkboxHover: 'hover:border-yellow-400', cardBg: 'bg-yellow-50/50 dark:bg-yellow-900/10' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200', border: 'border-green-500/50', leftBorder: 'border-l-green-500', ring: 'ring-green-500', checkboxBg: 'bg-green-500', checkboxHover: 'hover:border-green-400', cardBg: 'bg-green-50/50 dark:bg-green-900/10' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200', border: 'border-red-500/50', leftBorder: 'border-l-red-500', ring: 'ring-red-500', checkboxBg: 'bg-red-500', checkboxHover: 'hover:border-red-400', cardBg: 'bg-red-50/50 dark:bg-red-900/10' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 border-pink-200', border: 'border-pink-500/50', leftBorder: 'border-l-pink-500', ring: 'ring-pink-500', checkboxBg: 'bg-pink-500', checkboxHover: 'hover:border-pink-400', cardBg: 'bg-pink-50/50 dark:bg-pink-900/10' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200', border: 'border-orange-500/50', leftBorder: 'border-l-orange-500', ring: 'ring-orange-500', checkboxBg: 'bg-orange-500', checkboxHover: 'hover:border-orange-400', cardBg: 'bg-orange-50/50 dark:bg-orange-900/10' },
  cyan: { bg: 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-400 border-accent-200', border: 'border-accent-500/50', leftBorder: 'border-l-accent-500', ring: 'ring-accent-500', checkboxBg: 'bg-accent-500', checkboxHover: 'hover:border-accent-400', cardBg: 'bg-accent-50/50 dark:bg-accent-900/10' },
  slate: { bg: 'bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 border-slate-200', border: 'border-slate-500/50', leftBorder: 'border-l-slate-500', ring: 'ring-slate-500', checkboxBg: 'bg-slate-500', checkboxHover: 'hover:border-slate-400', cardBg: 'bg-slate-50/50 dark:bg-slate-900/10' },
}

const DATE_LOCALES: Record<string, string> = { ru: 'ru-RU', en: 'en-US', cs: 'cs-CZ', uk: 'uk-UA' }

export function CRMBoard({ initialViewLeadId, initialViewSessionId }: { initialViewLeadId?: string | null, initialViewSessionId?: string | null }) {
  const { t, lang } = useLanguage()
  const dateLocale = DATE_LOCALES[lang] || 'en-US'

  // Lightweight helper to interpolate simple {token} placeholders into
  // translated strings, since the shared t() function only does key lookup.
  const tc = (key: string, replacements: Record<string, string | number>) => {
    let result = t(key)
    Object.entries(replacements).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, String(v))
    })
    return result
  }

  // Default (non-customized) columns keep their canonical Russian title from
  // DEFAULT_COLUMNS as a signature. If a column's title still matches that
  // signature we show the translated label; custom titles set by the master
  // via the column editor are always shown verbatim.
  const getColumnTitle = (col: KanbanColumn) => {
    const defaultCol = DEFAULT_COLUMNS.find(d => d.id === col.id)
    if (defaultCol && defaultCol.title === col.title) {
      return t(`crmBoard.columns.${col.id}`)
    }
    return col.title
  }

  const [sessions, setSessions] = useState<CRMSession[]>([])
  const [loading, setLoading] = useState(true)
  
  const [mainTab, setMainTab] = useState<'sessions' | 'clients'>('sessions')
  // Default to list view on mobile (< md breakpoint): the Kanban board's wide
  // multi-column layout and native HTML5 drag-and-drop are unusable on
  // touchscreens. Desktop keeps the previous 'kanban' default. Users can still
  // manually switch to Kanban on mobile via the view switcher.
  const [sessionView, setSessionView] = useState<'kanban' | 'list' | 'calendar'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'list'
    return 'kanban'
  })
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null)
  
  // Custom drag ghost position tracking
  const dragGhostX = useMotionValue(0)
  const dragGhostY = useMotionValue(0)

  
  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null)
  const [selectedLeadSession, setSelectedLeadSession] = useState<any | null>(null)

  const [dateFilter, setDateFilter] = useState<'today'|'this_week'|'this_month'|'all'>('all')
  const [sessionToEdit, setSessionToEdit] = useState<CRMSession | null>(null)
  const [sellLeadSession, setSellLeadSession] = useState<CRMSession | null>(null)
  const [cities, setCities] = useState<any[]>([])
  const [countries, setCountries] = useState<any[]>([])

  // Fetch locations for sell lead modal when needed
  useEffect(() => {
    if (sellLeadSession && cities.length === 0) {
      supabase.from('cities').select('*').order('name_ru').then(res => {
        if (res.data) setCities(res.data)
      })
      supabase.from('countries').select('*').order('name_ru').then(res => {
        if (res.data) setCountries(res.data)
      })
    }
  }, [sellLeadSession, cities.length])

  const [sessionToAccept, setSessionToAccept] = useState<CRMSession | null>(null)
  const [sessionDetails, setSessionDetails] = useState<CRMSession | null>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [clientToView, setClientToView] = useState<any | null>(null)
  const [clientsForModal, setClientsForModal] = useState<any[]>([])
  
  const handleSessionClick = (session: CRMSession) => {
    if (session.master_clients?.is_lead) {
      setSelectedLeadSession(session)
    } else if (session.status === 'new') {
      setSessionDetails(session)
    } else {
      setSessionToEdit(session)
    }
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditingColumns, setIsEditingColumns] = useState(false)
  const [disputeLeadId, setDisputeLeadId] = useState<string | null>(null)
  const [selectedKanbanIds, setSelectedKanbanIds] = useState<Set<string>>(new Set())
  const [columns, setColumns] = useState<KanbanColumn[]>(DEFAULT_COLUMNS)
  
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
  }, [mainTab, sessionView])

  useEffect(() => {
    if (isSessionModalOpen || sessionToEdit) {
      fetchData()
    }
  }, [isSessionModalOpen, sessionToEdit])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const leadId = urlParams.get('view_client_lead_id');
    if (leadId && clientsForModal.length > 0) {
      const client = clientsForModal.find(c => c.lead_id === leadId || c.id === leadId);
      if (client) {
        setClientToView(client);
        window.history.replaceState({}, '', '/dashboard?tab=crm');
      }
    }
  }, [clientsForModal])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      let sessionsData = null;
      if (token) {
        const sessionsResponse = await fetch(`${apiUrl}/api/crm/sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!sessionsResponse.ok) {
          console.error('Failed to load CRM sessions', sessionsResponse.status)
          toast.error(t('crmBoard.loadSessionsError'))
          sessionsData = []
        } else {
          sessionsData = await sessionsResponse.json()
        }
      } else {
        sessionsData = []
      }

      const { data: { user } } = await supabase.auth.getUser()

      let leadSessions: any[] = []
      if (user) {
        try {
          const leadsRes = await fetch(`${apiUrl}/api/leads/personal`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (leadsRes.ok) {
            const personalLeads = await leadsRes.json()
            leadSessions = personalLeads
              .filter((lead: any) => lead.my_proposal_status === 'new' && !lead.my_chat_id)
              .map((lead: any) => ({
                id: `lead_${lead.id}`,
                master_id: user.id,
                client_id: lead.id,
                lead_id: lead.id,
                source: lead.is_personal ? 'direct' : 'marketplace',
                status: 'new',
                price: lead.price_credits || 0,
                session_date: lead.created_at,
                reference_images: lead.image_urls || [],
                master_clients: {
                  id: lead.id,
                  name: t('crmBoard.newLeadFallbackName') || `Заявка #${lead.id.substring(0, 6)}`,
                  phone: lead.contacts || t('crmBoard.hiddenContact'),
                  notes: lead.description,
                  is_lead: true,
                  lead_id: lead.id,
                  is_unlocked: lead.is_unlocked,
                  leads: lead
                }
              }))
          }
        } catch (e) {
          console.error("Error fetching personal leads", e)
        }
      }
      setSessions([...sessionsData, ...leadSessions])

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
        
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Handle opening lead or session from initial props
  useEffect(() => {
    if (sessions.length > 0) {
      if (initialViewSessionId) {
        const sessionToView = sessions.find(s => s.id === initialViewSessionId)
        if (sessionToView) {
          handleSessionClick(sessionToView)
        }
      } else if (initialViewLeadId) {
        // Find session that has this lead
        const sessionToView = sessions.find(s => s.master_clients?.leads?.id === initialViewLeadId || s.lead_id === initialViewLeadId)
        if (sessionToView) {
          setSessionDetails(sessionToView)
        }
      }
    }
  }, [sessions, initialViewLeadId, initialViewSessionId])

  const updateSessionStatus = async (sessionId: string, newStatus: string, reason?: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`${apiUrl}/api/crm/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, reject_reason: reason })
      })
      if (!res.ok) throw new Error('Failed to update session status')
      
      setSessions(prev => prev.map(item => 
        item.id === sessionId ? { ...item, status: newStatus } : item
      ))
      
      // If moved to completed, open the portfolio modal
      if (newStatus === 'completed') {
        setSessionToComplete(sessionId)
      } else {
        toast.success(t('crmBoard.statusUpdated'))
      }
    } catch (err) {
      toast.error(t('crmBoard.statusUpdateError'))
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
      const emptyImage = new window.Image()
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

  // Shared status-change logic used both by drag-and-drop (handleDrop) and by
  // the click-based "move to status" menu shown on touch devices, where native
  // HTML5 drag-and-drop does not work.
  const moveSessionToStatus = (item: CRMSession, colId: string) => {
    if (item.status === colId) return
    if (item.status === 'new' && colId !== 'cancelled' && colId !== 'rejected') {
      setSessionDetails(item)
    } else if (colId === 'cancelled' || colId === 'rejected') {
      const reason = window.prompt(t('crmBoard.cancelReasonPrompt'))
      if (!reason || !reason.trim()) {
        toast.error(t('crmBoard.reasonRequired'))
        return
      }
      updateSessionStatus(item.id, colId, reason.trim())
    } else {
      updateSessionStatus(item.id, colId)
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
        // If moving multiple new leads, we can only safely accept one via modal right now
        if (item.status === 'new' && colId !== 'cancelled' && colId !== 'rejected' && sessionIds.length > 1) {
          return
        }
        moveSessionToStatus(item, colId)
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
        toast.success(t('crmBoard.columnsSaved'))
      } else {
        throw new Error('Failed to save columns')
      }
    } catch (err) {
      toast.error(t('crmBoard.columnsSaveError'))
    }
  }

  if (loading) {
    return sessionView === 'kanban' && mainTab === 'sessions' ? (
      <SkeletonKanban columns={3} />
    ) : (
      <SkeletonTable rows={5} />
    )
  }

  return (
    <div className="w-full pb-4 relative">
      {/* Main Navigation Tabs */}
      <div className="flex gap-4 mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setMainTab('sessions')}
          className={`text-lg font-bold pb-2 border-b-2 transition-all ${mainTab === 'sessions' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          {t('crmBoard.tabSessions')}
        </button>
        <button
          onClick={() => setMainTab('clients')}
          className={`text-lg font-bold pb-2 border-b-2 transition-all ${mainTab === 'clients' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          {t('crmBoard.tabClients')}
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
                  {t('crmBoard.viewKanban')}
                </button>
                <button 
                  onClick={() => setSessionView('list')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${sessionView === 'list' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <Users className="w-4 h-4"/>
                  {t('crmBoard.viewList')}
                </button>
                <button 
                  onClick={() => setSessionView('calendar')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${sessionView === 'calendar' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <CalendarDays className="w-4 h-4"/>
                  {t('crmBoard.viewCalendar')}
                </button>
              </div>
              
              {(sessionView === 'kanban' || sessionView === 'list') && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input 
                    type="text" 
                    placeholder={t('crmBoard.searchPlaceholder')} 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none w-64 transition-all"
                  />
                </div>
              )}
              {(sessionView === 'kanban' || sessionView === 'list') && (
                <select 
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none font-medium"
                >
                  <option value="today">{t('crmBoard.filterToday')}</option>
                  <option value="this_week">{t('crmBoard.filterThisWeek')}</option>
                  <option value="this_month">{t('crmBoard.filterThisMonth')}</option>
                  <option value="all">{t('crmBoard.filterAllTime')}</option>
                </select>
              )}

              {sessionView === 'kanban' && !isEditingColumns && (
                <button
                  onClick={() => setIsEditingColumns(true)}
                  className="px-3 py-1.5 text-xs font-bold text-neutral-500 bg-neutral-200/50 hover:bg-neutral-200 dark:bg-neutral-800/50 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Settings2 className="w-4 h-4" />
                  {t('crmBoard.configureColumns')}
                </button>
              )}
            </>
          )}
        </div>
        
        {mainTab === 'sessions' && sessionView !== 'calendar' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('refresh') || 'Обновить'}
            </button>
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4" />
              {t('crmBoard.newSession')}
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
                    className="flex-1 min-w-[280px] max-w-[300px] glass-card rounded-3xl border border-white/10 p-4 flex flex-col h-[75vh] shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    onDragOver={(e) => handleDragOver(e, 'none')}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    <div className={`px-4 py-3 rounded-2xl border flex items-center justify-between mb-4 ${styles.bg}`}>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Icon className="w-4 h-4" />
                        {getColumnTitle(col)}
                      </div>
                      <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">
                        {colItems.length}
                      </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1 custom-scrollbar">
                      {colItems.length === 0 ? (
                        <div className="text-center py-8 text-neutral-400 text-sm italic border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                          {t('crmBoard.dropHere')}
                        </div>
                      ) : (
                        colItems.map(item => {
                          const isNewLead = item.status === 'new'
                          const isSelected = selectedKanbanIds.has(item.id)
                          const isDraggedGroupItem = draggingGroupId && selectedKanbanIds.has(item.id) && draggingGroupId !== item.id
                          const clientName = item.master_clients?.name || t('crmBoard.unknownClient')
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
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                const fullClient = clientsForModal.find(c => c.id === item.master_clients?.id);
                                setClientToView(fullClient || item.master_clients);
                              }}
                              className="flex items-center gap-3 mb-3 pr-14 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl p-1 -m-1 transition-colors"
                            >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${styles.bg.split('border')[0]}`}>
                                {initial}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-neutral-900 dark:text-white text-sm truncate mb-1">
                                  {clientName}
                                </h4>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {(item.source === 'direct' || (!item.source && (item.master_clients?.source === 'direct' || item.master_clients?.leads?.is_personal))) ? (
                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">{t('crmBoard.sourceDirect')}</span>
                                  ) : (item.source === 'marketplace' || (!item.source && (item.master_clients?.source === 'marketplace' || (item.master_clients?.lead_id && !item.master_clients?.leads?.is_personal)))) ? (
                                    <span className="bg-accent-100 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">{t('crmBoard.sourceMarketplace')}</span>
                                  ) : null}
                                  <p className="text-xs text-neutral-500 truncate flex-1 min-w-0">
                                    {item.master_clients?.phone || item.master_clients?.telegram || item.master_clients?.email || t('crmBoard.noContacts')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {images.length > 0 && (
                              <div className={`grid gap-2 mb-3 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {images.slice(0, 2).map((img, idx) => (
                                  <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                                    <Image 
                                      src={img || ''} 
                                      alt="" 
                                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" 
                                      draggable={false} 
                                      onClick={(e) => { e.stopPropagation(); setViewerImage(img); }}
                                     width={800} height={800} />
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex flex-col gap-1 min-w-0">
                                  <div className="flex items-center gap-2 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-2 py-1.5 rounded-lg w-fit max-w-full">
                                    <Calendar className="w-4 h-4 shrink-0 mt-0.5 self-start sm:self-auto sm:my-auto" />
                                    <div className="flex flex-col gap-0.5">
                                      <span className="whitespace-normal break-words leading-none">
                                        {new Date(item.session_date).toLocaleDateString(dateLocale)}
                                      </span>
                                      {(item.start_time || item.end_time) && (
                                        <span className="opacity-75 font-medium leading-none mt-1">
                                          {item.start_time?.slice(0, 5)} {item.end_time ? `- ${item.end_time.slice(0, 5)}` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-neutral-400 font-medium ml-1">
                                    {t('crmBoard.createdLabel')}: {new Date(item.created_at).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute:'2-digit' })}
                                  </span>
                                </div>
                                <div className="font-bold text-neutral-900 dark:text-white text-sm whitespace-nowrap mt-1 sm:mt-0 sm:text-right shrink-0">
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
                                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                      <PersonStanding className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                      {t('crmBoard.placeLabel')}: {item.body_place}
                                    </div>
                                  )}
                                  {item.size && (
                                    <div className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                                      <Maximize2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                      {t('crmBoard.sizeLabel')}: {item.size}
                                    </div>
                                  )}
                                  {item.notes && (
                                    <div className="text-xs text-neutral-500 italic line-clamp-3 leading-relaxed mt-0.5 flex items-start gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                                      <span>{item.notes}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-white/5 flex flex-col gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSessionDetails(item);
                                }}
                                className={`w-full py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-colors ${isNewLead ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-600/90 dark:hover:bg-primary-600'}`}
                              >
                                {t('crmBoard.viewBtn')}
                              </button>
                              {/* Touch-friendly alternative to drag-and-drop: native HTML5 DnD
                                  does not work on mobile browsers, so expose the same status
                                  change as a dropdown menu on small screens. */}
                              <div className="no-select-click md:hidden">
                                <select
                                  value=""
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const newColId = e.target.value
                                    if (newColId) moveSessionToStatus(item, newColId)
                                    e.target.value = ''
                                  }}
                                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-neutral-600 dark:text-neutral-300"
                                >
                                  <option value="">{t('crmBoard.moveToStatus')}</option>
                                  {columns.filter(c => c.id !== item.status).map(c => (
                                    <option key={c.id} value={c.id}>{getColumnTitle(c)}</option>
                                  ))}
                                </select>
                              </div>
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

      {sessionToAccept && (
        <LeadAcceptWizardModal
          isOpen={!!sessionToAccept}
          onClose={() => setSessionToAccept(null)}
          session={sessionToAccept}
          allSessions={sessions}
          onSuccess={() => {
            fetchData()
            setSessionToAccept(null)
          }}
          onSessionClick={(s) => setSessionDetails(s)}
        />
      )}

      <LeadDetailsModal
        isOpen={!!selectedLeadSession}
        onClose={() => setSelectedLeadSession(null)}
        session={selectedLeadSession}
        onUpdate={fetchData}
        onAccept={() => {
          setSelectedLeadSession(null)
          setSessionDetails(selectedLeadSession)
        }}
        onReject={(reason) => {
          if (selectedLeadSession && reason) {
            updateSessionStatus(selectedLeadSession.id, 'cancelled', reason)
          }
          setSelectedLeadSession(null)
        }}
      />

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
              {t('crmBoard.leadsCountLabel')} {selectedKanbanIds.size}
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
          onSellLead={setSellLeadSession}
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
          <span className="font-bold text-primary-600 dark:text-primary-400">{t('crmBoard.selectedCountLabel')} {selectedKanbanIds.size}</span>
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
            <option value="">{t('crmBoard.changeStatusPlaceholder')}</option>
            <option value="new">{t('crmBoard.columns.new')}</option>
            <option value="discussing">{t('crmBoard.columns.discussing')}</option>
            <option value="booked">{t('crmBoard.columns.booked')}</option>
            <option value="in_progress">{t('crmBoard.columns.in_progress')}</option>
            <option value="completed">{t('crmBoard.columns.completed')}</option>
            <option value="cancelled">{t('crmBoard.columns.cancelled')}</option>
          </select>
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800"></div>
          <button
            onClick={async () => {
              if (!window.confirm(tc('crmBoard.confirmDeleteSessions', { count: selectedKanbanIds.size }))) return;
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
                toast.success(tc('crmBoard.deletedSessionsCount', { count: selectedKanbanIds.size }))
                setSelectedKanbanIds(new Set())
                fetchData()
              } catch (err) {
                toast.error(t('crmBoard.deleteError'))
              }
            }}
            className="flex items-center justify-center p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            title={t('crmBoard.deleteSelectedTitle')}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSelectedKanbanIds(new Set())}
            className="flex items-center justify-center p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={t('crmBoard.clearSelectionTitle')}
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
        onUpdate={fetchData}
        chatId={clientsForModal.find(c => c.id === sessionDetails?.master_clients?.id)?.chat_id}
        onAccept={() => {
          if (sessionDetails) setSessionToAccept(sessionDetails)
        }}
        onReject={(reason?: string) => {
          if (sessionDetails) updateSessionStatus(sessionDetails.id, 'cancelled', reason)
        }}
        onEdit={() => {
          if (sessionDetails) setTimeout(() => setSessionToEdit(sessionDetails), 100)
        }}
        onSessionClick={(session) => {
          setSessionDetails(null)
          setTimeout(() => setSessionToEdit(session), 100)
        }}
        onOpenDispute={() => {
          if (sessionDetails?.lead_id || sessionDetails?.master_clients?.lead_id) {
            setDisputeLeadId(sessionDetails.lead_id || sessionDetails.master_clients?.lead_id || null)
          } else {
            toast.error('Невозможно открыть диспут для этого сеанса')
          }
        }}
      />

      {sellLeadSession && (
        <MasterLeadModal
          isOpen={true}
          onClose={() => setSellLeadSession(null)}
          onSuccess={() => {
            setSellLeadSession(null)
            toast.success("Лид выставлен на продажу!")
          }}
          language={lang}
          cities={cities}
          countries={countries}
          initialData={{
            title: sellLeadSession.master_clients?.name || 'Клиент',
            description: [
              sellLeadSession.style ? `Стиль: ${sellLeadSession.style}` : '',
              sellLeadSession.body_place ? `Место: ${sellLeadSession.body_place}` : '',
              sellLeadSession.size ? `Размер: ${sellLeadSession.size}` : '',
              sellLeadSession.notes || ''
            ].filter(Boolean).join('. '),
            contacts: sellLeadSession.master_clients?.telegram 
              ? `@${sellLeadSession.master_clients.telegram}` 
              : sellLeadSession.master_clients?.phone || ''
          }}
        />
      )}

      <CreateDisputeModal
        isOpen={!!disputeLeadId}
        onClose={() => setDisputeLeadId(null)}
        leadId={disputeLeadId || ''}
        onSuccess={() => {
          fetchData()
          setDisputeLeadId(null)
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
