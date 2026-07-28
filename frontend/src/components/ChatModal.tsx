import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { X, Send, AlertCircle, MessageCircle, Paperclip } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { OnlineIndicator } from '@/components/OnlineIndicator'

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
  currentUserRole?: 'client' | 'master'
  recipientName?: string
  recipientAvatar?: string | null
  recipientLastSeen?: string | null
  recipientId?: string | null
}

export function ChatModal({ isOpen, onClose, chatId, leadTitle, currentUserRole = 'master', recipientName, recipientAvatar, recipientLastSeen, recipientId }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  
  const [messagesOffset, setMessagesOffset] = useState(0)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const MESSAGES_LIMIT = 50
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && chatId) {
      setMessagesOffset(0)
      setHasMoreMessages(true)
      loadChatMessages(chatId, 0, false)
      const interval = setInterval(() => pollMessages(chatId), 5000)
      return () => clearInterval(interval)
    }
  }, [isOpen, chatId])

  const loadChatMessages = async (currentChatId: string, offset = 0, append = false) => {
    try {
      if (append) setIsLoadingMore(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/chat/${currentChatId}/messages?limit=${MESSAGES_LIMIT}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.length < MESSAGES_LIMIT) setHasMoreMessages(false)
        else setHasMoreMessages(true)

        setMessages(prev => {
          if (append) return [...data, ...prev]
          setTimeout(scrollToBottom, 100)
          return data
        })
      }
    } catch (err) {
      console.error('Failed to load chat:', err)
    } finally {
      if (append) setIsLoadingMore(false)
    }
  }

  const pollMessages = async (currentChatId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${apiUrl}/api/chat/${currentChatId}/messages?limit=${MESSAGES_LIMIT}&offset=0`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => {
          const prevMap = new Map(prev.map(m => [m.id, m]))
          const newData = []
          for (const msg of data) {
            if (!prevMap.has(msg.id)) newData.push(msg)
          }
          if (newData.length > 0) {
            setTimeout(scrollToBottom, 100)
            const combined = [...prev, ...newData]
            return combined.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          }
          return prev
        })
      }
    } catch (err) {
      console.error('Failed to poll chat:', err)
    }
  }

  const handleLoadMoreMessages = () => {
    const nextOffset = messagesOffset + MESSAGES_LIMIT
    setMessagesOffset(nextOffset)
    if (chatId) loadChatMessages(chatId, nextOffset, true)
  }

  const handleImageUpload = async (file: File) => {
    if (!file || !chatId) return

    setSending(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${apiUrl}/api/chat/${chatId}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: publicUrl })
      })

      if (!res.ok) throw new Error('Failed to send image')
      
      const msg = await res.json()
      setMessages(prev => [...prev, msg])
      scrollToBottom()
    } catch (error: any) {
      toast.error('Ошибка загрузки фото: ' + error.message)
    } finally {
      setSending(false)
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

  if (!isOpen) return null

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-white/10 flex flex-col h-[80vh]"
        >
          <div className="flex justify-between items-center p-4 lg:p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3">
              {recipientAvatar ? (
                <div className="relative w-10 h-10 shrink-0">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-white/10">
                    <Image src={recipientAvatar} alt="avatar" className="w-full h-full object-cover" width={40} height={40} />
                  </div>
                  <OnlineIndicator userId={recipientId} lastSeen={recipientLastSeen} size="sm" className="-bottom-0.5 -right-0.5 border-white dark:border-neutral-900" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary-500" />
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {recipientName || leadTitle}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">Внутренний чат</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {!chatId ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mb-4" />
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Чат недоступен</h3>
              <p className="text-sm text-neutral-500">
                Чат еще не создан или у вас нет к нему доступа. Чат создается автоматически при отправке или принятии отклика.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 bg-neutral-50/30 dark:bg-neutral-950/30 relative">
                {hasMoreMessages && messages.length >= MESSAGES_LIMIT && (
                  <div className="flex justify-center mb-4">
                    <button
                      onClick={handleLoadMoreMessages}
                      disabled={isLoadingMore}
                      className="px-4 py-2 text-xs font-medium text-primary-600 bg-white dark:bg-neutral-800 border border-primary-100 dark:border-primary-500/20 hover:bg-primary-50 dark:hover:bg-neutral-700 disabled:opacity-50 rounded-xl shadow-sm transition-all"
                    >
                      {isLoadingMore ? 'Загрузка...' : 'Загрузить предыдущие сообщения'}
                    </button>
                  </div>
                )}
                <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-2xl text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Ссылки и номера телефонов автоматически скрываются до тех пор, пока клиент не примет ваш оффер.
                </div>

            {messages.length === 0 ? (
              <div className="text-center text-neutral-400 py-8 text-sm">
                Напишите первое сообщение клиенту...
              </div>
            ) : (
              messages.map(msg => {
                const isSystemCard = msg.content.startsWith('[SYSTEM_CARD]:')
                  
                if (isSystemCard) {
                  let cardData = null
                  try {
                    cardData = JSON.parse(msg.content.replace('[SYSTEM_CARD]:', '').trim())
                  } catch (e) {}
                  
                  return (
                    <div key={msg.id} className="flex justify-center w-full my-4 shrink-0">
                      {cardData ? (
                        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 p-5 rounded-2xl shadow-sm text-center max-w-sm w-full">
                           <MessageCircle className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                           <h4 className="font-bold text-neutral-900 dark:text-white mb-2">
                             {cardData.type === 'session_created' ? 'Сеанс назначен' : cardData.type === 'master_rejected' ? 'Отказ' : cardData.type === 'master_accepted' ? 'Сеанс принят в работу' : cardData.type === 'new_lead' ? 'Новая заявка' : 'Системное уведомление'}
                           </h4>
                           {cardData.type === 'session_created' && (
                             <>
                               <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                 {currentUserRole === 'client' ? 'Вам назначен сеанс!' : 'Вы назначили сеанс.'} <br/>
                                 {new Date(cardData.date).toLocaleDateString('ru-RU')} в {cardData.time}
                               </p>
                               <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl py-2 px-4 text-sm font-medium text-neutral-900 dark:text-white border border-neutral-100 dark:border-white/5">
                                 Стоимость: {cardData.price} CZK
                               </div>
                             </>
                           )}
                           {cardData.type === 'new_lead' && (
                             <>
                               <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                                 <strong>{cardData.title}</strong><br/><br/>
                                 {currentUserRole === 'client' ? 'Вы отправили новую заявку. Ожидайте ответа.' : 'Клиент создал новую заявку на татуировку. Обсудите детали и предложите сеанс.'}
                               </p>
                             </>
                           )}
                           {cardData.type === 'master_rejected' && (
                             <>
                               <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                                 {currentUserRole === 'client' ? 'Мастер отклонил заявку.' : 'Вы отклонили заявку.'}<br/><br/>
                                 <strong>Причина:</strong> {cardData.reason}
                               </p>
                             </>
                           )}
                           {cardData.type === 'master_accepted' && (
                             <>
                               <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                                 {currentUserRole === 'client' ? 'Мастер взял вашу заявку в работу! Скоро он напишет вам для уточнения деталей.' : 'Вы приняли заявку в работу. Напишите клиенту, чтобы обсудить детали!'}
                               </p>
                             </>
                           )}
                        </div>
                      ) : (
                        <div className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-xs py-1 px-3 rounded-full">
                          Системное уведомление
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                <div key={msg.id} className={`flex ${msg.sender_type === currentUserRole ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.sender_type === currentUserRole 
                      ? 'bg-primary-500 text-white rounded-br-sm' 
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-sm'
                  }`}>
                    {msg.content.startsWith('http') && msg.content.includes('supabase') ? (
                      <Image src={msg.content || ''} alt="chat attachment" className="max-w-full rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewerImage(msg.content)}  width={800} height={800} />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    )}
                    <span className="text-[10px] opacity-60 mt-1 block text-right">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              )})
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-white/5">
            <form onSubmit={sendMessage} className="flex gap-2 items-center">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer p-2 text-neutral-400 hover:text-primary-500 transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={(e) => { 
                  const file = e.target.files?.[0]; 
                  if (file) handleImageUpload(file); 
                  e.target.value = ''; // reset input
                }} 
              />
              <input 
                type="text"
                placeholder="Написать сообщение..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none text-sm transition-all"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 text-white p-3 rounded-xl transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
    {viewerImage && (
      <ImageViewerModal
        isOpen={!!viewerImage}
        onClose={() => setViewerImage(null)}
        imageUrl={viewerImage}
        showActions={true}
      />
    )}
    </>
  )
}
