import { useState, useEffect } from 'react'
import { MessageCircle, Clock, ChevronRight } from 'lucide-react'
import { ChatModal } from '@/components/ChatModal'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'


interface ChatPreview {
  id: string
  lead_id: string
  created_at: string
  leads: {
    title: string
    description: string
    image_urls: string[]
  }
  last_message: {
    content: string
    created_at: string
    sender_type: string
  } | null
  proposal_status: string | null
}

export function MessagesList() {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [selectedChatTitle, setSelectedChatTitle] = useState<string>('')

  useEffect(() => {
    fetchChats()
  }, [])

  const fetchChats = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/chat/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setChats(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5">
        <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Нет активных чатов</h3>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          Откликайтесь на заявки, чтобы начать общение с клиентами.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 overflow-hidden">
      <div className="p-6 border-b border-neutral-100 dark:border-white/5">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-violet-500" />
          Все сообщения
        </h2>
      </div>

      <div className="divide-y divide-neutral-100 dark:divide-white/5">
        {chats.map(chat => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => {
              setSelectedChatId(chat.id)
              setSelectedChatTitle(chat.leads.title)
            }}
            className="p-4 sm:p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center shrink-0">
              {chat.leads.image_urls && chat.leads.image_urls.length > 0 ? (
                <img src={chat.leads.image_urls[0]} alt="tattoo" className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <MessageCircle className="w-6 h-6 text-violet-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-neutral-900 dark:text-white truncate pr-4 text-sm sm:text-base">
                  {chat.leads.title}
                </h3>
                {chat.last_message && (
                  <span className="text-xs text-neutral-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(chat.last_message.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {chat.last_message ? (
                  <p className="text-sm text-neutral-500 truncate">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {chat.last_message.sender_type === 'master' ? 'Вы: ' : 'Клиент: '}
                    </span>
                    {chat.last_message.content}
                  </p>
                ) : (
                  <p className="text-sm text-neutral-400 italic">Нет сообщений</p>
                )}
              </div>
              
              <div className="mt-2 flex gap-2">
                {chat.proposal_status === 'accepted' && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                    Победа
                  </span>
                )}
                {chat.proposal_status === 'pending' && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">
                    В ожидании
                  </span>
                )}
                {chat.proposal_status === 'booked' && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full">
                    Запись
                  </span>
                )}
                {chat.proposal_status === 'completed' && (
                  <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold rounded-full">
                    Завершено
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-neutral-300 dark:text-neutral-600 group-hover:text-violet-500 transition-colors shrink-0" />
          </motion.div>
        ))}
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
