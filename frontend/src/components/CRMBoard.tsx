import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Clock, CheckCircle, Calendar, Flag, MessageCircle, UserPlus, LayoutGrid, CalendarDays, Search, List as ListIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ManualClientModal } from '@/components/ManualClientModal'
import { SessionModal } from '@/components/SessionModal'
import { CalendarView } from '@/components/CalendarView'
import { ClientDetailsModal } from '@/components/ClientDetailsModal'

export interface CRMSession {
  id: string
  session_date: string
  start_time?: string
  end_time?: string
  price?: number
  status: string
}

export interface CRMClient {
  id: string
  name: string
  contact_info: string
  source: string
  kanban_status: string
  notes: string
  lead_id?: string
  created_at: string
  leads?: {
    title: string
    description: string
    image_urls: string[]
    client_priority: string
  }
  master_sessions?: CRMSession[]
}

const COLUMNS = [
  { id: 'new', title: 'Новые', icon: <UserPlus className="w-4 h-4" />, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200' },
  { id: 'discussing', title: 'В диалоге', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200' },
  { id: 'booked', title: 'Записан', icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200' },
  { id: 'completed', title: 'Завершено', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200' },
  { id: 'cancelled', title: 'Отмена / Отказ', icon: <Flag className="w-4 h-4" />, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200' },
]

export function CRMBoard() {
  const [items, setItems] = useState<CRMClient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null)
  const [chatsMap, setChatsMap] = useState<Record<string, string>>({})
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [manualModalDate, setManualModalDate] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'calendar' | 'list'>('kanban')
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchData()
    
    const handleOpenManualModal = (e: any) => {
      if (e.detail?.date) {
        setManualModalDate(e.detail.date)
      } else {
        setManualModalDate(null)
      }
      setIsSessionModalOpen(true)
    }
    
    window.addEventListener('openManualClientModal', handleOpenManualModal)
    return () => window.removeEventListener('openManualClientModal', handleOpenManualModal)
  }, [])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const res = await fetch(`${apiUrl}/api/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const chatsRes = await fetch(`${apiUrl}/api/chat/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        setItems(await res.json())
      }
      
      if (chatsRes.ok) {
        const chats = await chatsRes.json()
        const cmap: Record<string, string> = {}
        chats.forEach((c: any) => {
          cmap[c.lead_id] = c.id
        })
        setChatsMap(cmap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (clientId: string, newStatus: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/crm/clients/${clientId}/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      setItems(prev => prev.map(item => 
        item.id === clientId ? { ...item, kanban_status: newStatus } : item
      ))
      toast.success('Статус обновлен')
    } catch (err) {
      toast.error('Ошибка обновления статуса')
    }
  }

  const handleDragStart = (e: React.DragEvent, clientId: string) => {
    e.dataTransfer.setData('clientId', clientId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    const clientId = e.dataTransfer.getData('clientId')
    const item = items.find(i => i.id === clientId)
    if (item && item.kanban_status !== colId) {
      updateStatus(clientId, colId)
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
    <div className="w-full pb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <LayoutGrid className="w-4 h-4"/>
              Канбан
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'calendar' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <CalendarDays className="w-4 h-4"/>
              Календарь
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <ListIcon className="w-4 h-4"/>
              Список
            </button>
          </div>
          
          {viewMode !== 'calendar' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Поиск по имени или номеру..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-cyan-500/20 outline-none w-64"
              />
            </div>
          )}
        </div>
        
        {viewMode !== 'calendar' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setManualModalDate(null)
                setIsManualModalOpen(true)
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <UserPlus className="w-4 h-4" />
              Добавить клиента
            </button>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView items={items} />
      ) : viewMode === 'list' ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="p-4 font-bold">Клиент</th>
                <th className="p-4 font-bold">Статус</th>
                <th className="p-4 font-bold">Сеанс</th>
                <th className="p-4 font-bold text-right">Действие</th>
              </tr>
            </thead>
            <tbody>
              {items.filter(item => {
                const search = searchQuery.toLowerCase()
                return item.name.toLowerCase().includes(search) || (item.contact_info || '').toLowerCase().includes(search)
              }).map(item => {
                const isMarketplace = item.source !== 'manual'
                const latestSession = item.master_sessions && item.master_sessions.length > 0 
                  ? item.master_sessions.sort((a: any, b: any) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0]
                  : null
                  
                return (
                  <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 rounded-full flex items-center justify-center">
                          <span className="font-bold text-neutral-500 dark:text-neutral-400">{item.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            {item.name}
                            {isMarketplace && <span className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Заявка</span>}
                          </div>
                          <div className="text-sm text-neutral-500">{item.contact_info || 'Нет контактов'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800">
                        {item.kanban_status === 'new' ? 'Новый' : 
                         item.kanban_status === 'discussing' ? 'В диалоге' : 
                         item.kanban_status === 'booked' ? 'Записан' : 
                         item.kanban_status === 'completed' ? 'Завершен' : 'Отмена'}
                      </span>
                    </td>
                    <td className="p-4">
                      {latestSession ? (
                        <div className="text-sm">
                          <div className="font-semibold">{new Date(latestSession.session_date).toLocaleDateString('ru-RU')}</div>
                          {latestSession.start_time && <div className="text-xs text-neutral-500">{latestSession.start_time.substring(0, 5)} - {latestSession.end_time?.substring(0, 5)}</div>}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">Нет сеансов</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedClient(item)}
                        className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm font-bold transition-colors"
                      >
                        Подробнее
                      </button>
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">
                    Нет клиентов
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-[1200px]">
            {COLUMNS.map(col => {
              const colItems = items.filter(i => {
                const search = searchQuery.toLowerCase()
                const matchesSearch = i.name.toLowerCase().includes(search) || (i.contact_info || '').toLowerCase().includes(search)
                return i.kanban_status === col.id && matchesSearch
              })
              
              return (
                <div 
                  key={col.id} 
                  className="flex-1 min-w-[300px] bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-neutral-200 dark:border-white/5 p-4 flex flex-col h-[75vh]"
                  onDragOver={handleDragOver}
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
                    Перетащите карточку сюда
                  </div>
                ) : (
                  colItems.map(item => (
                    <motion.div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e as any, item.id)}
                      onClick={() => setSelectedClient(item)}
                      className="bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-sm border border-neutral-200 dark:border-white/5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3 mb-3">
                        {item.leads?.image_urls && item.leads.image_urls.length > 0 ? (
                          <img src={item.leads.image_urls[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700 text-neutral-400 rounded-xl">
                            <UserPlus className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm truncate">
                            {item.name}
                          </h4>
                          <p className="text-xs text-neutral-500 line-clamp-1">
                            {item.leads?.title || item.source}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                        <div className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-lg">
                          {item.master_sessions && item.master_sessions.length > 0 
                            ? `Сеансов: ${item.master_sessions.length}` 
                            : 'Нет сеансов'}
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
      ) : (
        <CalendarView items={items} onDateClick={(date) => {
          // Pass date to modal
        }} />
      )}

      {selectedClient && (
        <ClientDetailsModal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          client={selectedClient}
          onUpdate={fetchData}
          chatId={selectedClient.lead_id ? chatsMap[selectedClient.lead_id] : null}
        />
      )}
      
      <SessionModal
        isOpen={isSessionModalOpen}
        onClose={() => {
          setIsSessionModalOpen(false)
          setManualModalDate(null)
        }}
        onSuccess={fetchData}
        initialDate={manualModalDate}
        existingClients={items}
      />
    </div>
  )
}
