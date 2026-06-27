import { useState, useEffect, useRef } from 'react'
import { X, Send, AlertCircle, MessageCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Message {
  id: string
  sender_type: 'client' | 'master'
  content: string
  created_at: string
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  chatId: string | null
  leadTitle: string
}

export function ChatModal({ isOpen, onClose, chatId, leadTitle }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && chatId) {
      loadChat()
      // Setup simple polling for MVP
      const interval = setInterval(loadChat, 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, chatId])

  const loadChat = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/chat/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data)
        scrollToBottom()
      }
    } catch (err) {
      console.error('Failed to load chat:', err)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !chatId) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      })
      
      if (!res.ok) throw new Error('Failed to send')
      const msg = await res.json()
      setMessages(prev => [...prev, msg])
      setNewMessage('')
      scrollToBottom()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (!isOpen || !chatId) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-white/10 flex flex-col h-[80vh]"
        >
          <div className="flex justify-between items-center p-4 lg:p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/50">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-violet-500" />
              Чат с клиентом
            </h2>
            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors bg-neutral-100 dark:bg-neutral-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500 text-center font-bold">
            Заявка: {leadTitle}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-2xl text-xs flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Ссылки и номера телефонов автоматически скрываются до тех пор, пока клиент не примет ваш оффер.
            </div>

            {messages.length === 0 ? (
              <div className="text-center text-neutral-400 py-8 text-sm">
                Напишите первое сообщение клиенту...
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'master' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.sender_type === 'master' 
                      ? 'bg-violet-500 text-white rounded-br-sm' 
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <span className="text-[10px] opacity-60 mt-1 block text-right">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-white/5">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input 
                type="text"
                placeholder="Написать сообщение..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-violet-500 rounded-xl px-4 py-3 outline-none text-sm transition-all"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-violet-500 hover:bg-violet-600 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 text-white p-3 rounded-xl transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
