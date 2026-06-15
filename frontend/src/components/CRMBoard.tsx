import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Clock, CheckCircle, Calendar, Flag, MessageCircle } from 'lucide-react'
import { ChatModal } from '@/components/ChatModal'
import { supabase } from '@/lib/supabase'

interface CRMLead {
  lead_id: string
  status: string
  price_offer: number
  proposed_dates: string
  leads: {
    title: string
    description: string
    image_urls: string[]
    client_priority: string
  }
}

export function CRMBoard() {
  const [items, setItems] = useState<CRMLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedChatTitle, setSelectedChatTitle] = useState<string>('')
  const [chatsMap, setChatsMap] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      // Get proposals
      const res = await fetch(`${apiUrl}/api/profile/proposals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      // Get chats to show chat button
      const chatsRes = await fetch(`${apiUrl}/api/chat/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setItems(data)
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

  const updateStatus = async (leadId: string, newStatus: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/leads/${leadId}/proposals/status`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      
      setItems(prev => prev.map(item => 
        item.lead_id === leadId ? { ...item, status: newStatus } : item
      ))
      toast.success('Статус обновлен')
    } catch (err) {
      toast.error('Ошибка обновления статуса')
    }
  }

  const columns = [
    { id: 'pending', title: 'Ожидание (Отправлено)', icon: <Clock className="w-4 h-4" />, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200' },
    { id: 'accepted', title: 'В обсуждении (Победа)', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border-violet-200' },
    { id: 'booked', title: 'Забронировано', icon: <Calendar className="w-4 h-4" />, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200' },
    { id: 'completed', title: 'Завершено', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200' },
    { id: 'rejected', title: 'Отказ', icon: <Flag className="w-4 h-4" />, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200' },
  ]

  // HTML5 Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    const leadId = e.dataTransfer.getData('leadId')
    const item = items.find(i => i.lead_id === leadId)
    if (item && item.status !== colId) {
      updateStatus(leadId, colId)
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
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1200px]">
        {columns.map(col => {
          const colItems = items.filter(i => i.status === col.id)
          
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
                      key={item.lead_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e as any, item.lead_id)}
                      className="bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-sm border border-neutral-200 dark:border-white/5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3 mb-3">
                        {item.leads.image_urls && item.leads.image_urls.length > 0 ? (
                          <img src={item.leads.image_urls[0]} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-700 rounded-xl"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-neutral-900 dark:text-white text-sm truncate">{item.leads.title}</h4>
                          <p className="text-xs text-neutral-500 line-clamp-1">{item.leads.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-white/5">
                        <div className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-1 rounded-lg">
                          Оффер: {item.price_offer}
                        </div>
                        
                        {chatsMap[item.lead_id] && (
                          <button 
                            onClick={() => {
                              setSelectedChatId(chatsMap[item.lead_id])
                              setSelectedChatTitle(item.leads.title)
                            }}
                            className="p-1.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded-lg transition-colors text-neutral-600 dark:text-neutral-300"
                            title="Открыть чат"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ChatModal
        isOpen={!!selectedChatId}
        onClose={() => setSelectedChatId(null)}
        chatId={selectedChatId}
        leadTitle={selectedChatTitle}
      />
    </div>
  )
}
