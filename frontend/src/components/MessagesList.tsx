import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Clock, Send, AlertCircle, Search, ChevronLeft, Image as ImageIcon, Calendar, Paperclip } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { ClientDetailsModal } from '@/components/ClientDetailsModal'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { AttachmentMenu } from '@/components/AttachmentMenu'

interface Message {
  id: string
  sender_type: 'client' | 'master'
  content: string
  created_at: string
}

interface ChatPreview {
  id: string
  lead_id: string
  created_at: string
  leads: {
    title: string
    description: string
    image_urls: string[]
  }
  client_info?: {
    name: string
    email: string
    avatar_url: string
  }
  last_message: {
    content: string
    created_at: string
    sender_type: string
  } | null
  proposal_status: string | null
  kanban_status?: string | null
}

interface MessagesListProps {
  userRole?: 'client' | 'master'
}

export function MessagesList({ userRole = 'master' }: MessagesListProps) {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [clientToView, setClientToView] = useState<any | null>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  
  const [chatsOffset, setChatsOffset] = useState(0)
  const [hasMoreChats, setHasMoreChats] = useState(true)
  const CHATS_LIMIT = 30

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const [messagesOffset, setMessagesOffset] = useState(0)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const MESSAGES_LIMIT = 50
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const getStatusLabel = (chat: ChatPreview) => {
    if (chat.kanban_status) {
      switch (chat.kanban_status) {
        case 'new': return 'Новая заявка'
        case 'discussing': return 'В работе'
        case 'booked': return 'Запись'
        case 'completed': return 'Завершено'
        case 'cancelled': return 'Отменено'
      }
    }
    return chat.proposal_status === 'accepted' ? 'В работе' : chat.proposal_status === 'booked' ? 'Запись' : 'Завершено'
  }

  // Responsive state
  const [showMobileChat, setShowMobileChat] = useState(false)

  useEffect(() => {
    fetchChats(0, false)
  }, [])

  useEffect(() => {
    if (selectedChat) {
      setMessagesOffset(0)
      setHasMoreMessages(true)
      loadChatMessages(selectedChat.id, 0, false)
      const interval = setInterval(() => pollMessages(selectedChat.id), 5000)
      return () => clearInterval(interval)
    }
  }, [selectedChat])

  const fetchChats = async (offset = 0, append = false) => {
    try {
      if (!append) setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      const response = await fetch(`${apiUrl}/api/chat/my?limit=${CHATS_LIMIT}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.length < CHATS_LIMIT) setHasMoreChats(false)
        else setHasMoreChats(true)

        if (append) {
          setChats(prev => [...prev, ...data])
        } else {
          setChats(data)
        }
      }

      // Also fetch CRM clients so we can open their cards
      const clientsRes = await fetch(`${apiUrl}/api/crm/clients`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (clientsRes.ok) {
        setClients(await clientsRes.json())
      }
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadChatMessages = async (chatId: string, offset = 0, append = false) => {
    try {
      if (append) setIsLoadingMore(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/chat/${chatId}/messages?limit=${MESSAGES_LIMIT}&offset=${offset}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.length < MESSAGES_LIMIT) setHasMoreMessages(false)
        else setHasMoreMessages(true)

        setMessages(prev => {
          if (append) {
            // Keep the previous scroll position visually by not scrolling to bottom
            return [...data, ...prev]
          }
          setTimeout(scrollToBottom, 100)
          return data
        })
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err)
    } finally {
      if (append) setIsLoadingMore(false)
    }
  }

  const pollMessages = async (chatId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${apiUrl}/api/chat/${chatId}/messages?limit=${MESSAGES_LIMIT}&offset=0`, {
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
      console.error('Failed to poll messages:', err)
    }
  }

  const handleLoadMoreChats = () => {
    const nextOffset = chatsOffset + CHATS_LIMIT
    setChatsOffset(nextOffset)
    fetchChats(nextOffset, true)
  }

  const handleLoadMoreMessages = () => {
    const nextOffset = messagesOffset + MESSAGES_LIMIT
    setMessagesOffset(nextOffset)
    loadChatMessages(selectedChat!.id, nextOffset, true)
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return

    setSending(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/chat/${selectedChat.id}/messages`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      })
      
      if (!res.ok) throw new Error('Failed to send message')
      const msg = await res.json()
      setMessages(prev => [...prev, msg])
      
      // Update local last_message in chats list to avoid waiting for poll
      setChats(prev => prev.map(c => 
        c.id === selectedChat.id ? { ...c, last_message: { content: msg.content, created_at: msg.created_at, sender_type: msg.sender_type } } : c
      ))
      
      setNewMessage('')
      scrollToBottom()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleImageUpload = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = eOrFile instanceof File ? eOrFile : (eOrFile as React.ChangeEvent<HTMLInputElement>).target.files?.[0]
    if (!file || !selectedChat) return

    setSending(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `chat-images/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${apiUrl}/api/chat/${selectedChat.id}/messages`, {
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
      
      setChats(prev => prev.map(c => 
        c.id === selectedChat.id ? { ...c, last_message: { content: '📷 Фото', created_at: msg.created_at, sender_type: msg.sender_type } } : c
      ))
      
      scrollToBottom()
    } catch (error: any) {
      toast.error('Ошибка загрузки фото: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const filteredChats = chats.filter(chat => {
    const clientName = chat.client_info?.name || chat.leads?.title || 'Клиент'
    return clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
           chat.client_info?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.leads?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 overflow-hidden flex items-center justify-center h-[calc(100vh-140px)] min-h-[600px] shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 overflow-hidden flex flex-col items-center justify-center h-[calc(100vh-140px)] min-h-[600px] shadow-sm text-center p-8">
        <MessageCircle className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Нет активных чатов</h3>
        <p className="text-neutral-500 text-sm max-w-sm mx-auto">
          {userRole === 'client' 
            ? 'У вас пока нет активных чатов. Оставьте заявку или напишите мастеру, чтобы начать общение.'
            : 'Откликайтесь на заявки или принимайте персональные заказы, чтобы начать общение с клиентами.'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 overflow-hidden flex h-[calc(100vh-140px)] min-h-[600px] shadow-sm">
      
      {/* Left Sidebar - Chat List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-white/5 flex flex-col transition-all duration-300 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-white/5 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-violet-500" />
            Сообщения
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text"
              placeholder="Поиск по имени или стилю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white pl-9 pr-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-white/10 focus:border-violet-500 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-white/5">
          {filteredChats.map(chat => {
            const isSelected = selectedChat?.id === chat.id
            const clientName = chat.client_info?.name || chat.leads?.title || 'Неизвестный клиент'
            
            return (
              <div
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat)
                  setShowMobileChat(true)
                }}
                className={`p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-violet-50/50 dark:bg-violet-900/10 border-l-4 border-violet-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-neutral-200 dark:border-white/10">
                  {chat.client_info?.avatar_url ? (
                    <img src={chat.client_info.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : chat.leads?.image_urls && chat.leads.image_urls.length > 0 ? (
                    <img src={chat.leads.image_urls[0]} alt="tattoo" className="w-full h-full object-cover" />
                  ) : (
                    <MessageCircle className="w-6 h-6 text-neutral-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-neutral-900 dark:text-white truncate">{clientName}</h3>
                    <span className="text-[10px] text-neutral-400 font-medium">
                      {chat.last_message 
                        ? new Date(chat.last_message.created_at).toLocaleDateString() 
                        : ''}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    {chat.last_message ? (
                      <p className="text-xs text-neutral-500 truncate max-w-[180px]">
                        {chat.last_message.content}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">Нет сообщений</p>
                    )}
                  </div>
                  
                  {chat.proposal_status && chat.proposal_status !== 'pending' && (
                    <div className="mt-1">
                       <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[9px] font-bold rounded-full uppercase tracking-wider">
                         {getStatusLabel(chat)}
                       </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Sidebar - Active Chat */}
      <div className={`flex-1 flex flex-col bg-neutral-50 dark:bg-neutral-950/50 ${!showMobileChat ? 'hidden md:flex' : 'flex'} relative`}>
        {selectedChat ? (
          <>
            <div 
              className="p-4 sm:p-6 border-b border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-900 flex items-center gap-4 shrink-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              onClick={() => {
                // Determine if we need to open LeadDetails or ClientDetails
                // We can navigate or pass a prop, but since MessagesList is not wrapped in CRMBoard,
                // we might need to use a router or state to open a modal here.
                // Instead of navigating, find the client and open the modal locally
                const client = clients.find((c: any) => c.lead_id === selectedChat.lead_id);
                if (client) {
                  setClientToView(client);
                } else {
                  toast.error('Карточка клиента не найдена. Возможно, это новая заявка из маркетплейса, которая ещё не перешла в CRM.');
                }
              }}
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setShowMobileChat(false); }}
                className="md:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-neutral-200 dark:border-white/10">
                  {selectedChat.client_info?.avatar_url ? (
                    <img src={selectedChat.client_info.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  ) : selectedChat.leads?.image_urls && selectedChat.leads.image_urls.length > 0 ? (
                    <img src={selectedChat.leads.image_urls[0]} alt="tattoo" className="w-full h-full object-cover" />
                  ) : (
                    <MessageCircle className="w-5 h-5 text-neutral-400" />
                  )}
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-neutral-900 dark:text-white truncate">
                  {selectedChat.client_info?.name || selectedChat.leads?.title}
                </h3>
                {selectedChat.client_info?.email ? (
                  <p className="text-xs text-neutral-500 truncate">
                    {selectedChat.client_info.email}
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 truncate">
                    {selectedChat.leads?.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-2xl text-xs flex gap-2 mx-auto max-w-lg mb-6">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Все важные детали (цена, дата) обсуждайте здесь. Сохраняйте историю переписки.</p>
              </div>

              {messages.length === 0 ? (
                <div className="text-center text-neutral-400 py-12 text-sm">
                  <MessageCircle className="w-12 h-12 text-neutral-200 dark:text-neutral-800 mx-auto mb-4" />
                  Здесь пока нет сообщений.<br/>Напишите клиенту первым!
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
                             <Calendar className="w-8 h-8 text-violet-500 mx-auto mb-3" />
                             <h4 className="font-bold text-neutral-900 dark:text-white mb-2">
                               {cardData.type === 'session_created' ? 'Сеанс назначен' : 'Системное уведомление'}
                             </h4>
                             {cardData.type === 'session_created' && (
                               <>
                                 <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                   {new Date(cardData.date).toLocaleDateString('ru-RU')} в {cardData.time}
                                 </p>
                                 <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl py-2 px-4 text-sm font-medium text-neutral-900 dark:text-white border border-neutral-100 dark:border-white/5">
                                   Стоимость: {cardData.price} CZK
                                 </div>
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
                  <div key={msg.id} className={`flex ${msg.sender_type === 'master' ? 'justify-end' : 'justify-start'} shrink-0`}>
                    <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.sender_type === 'master' 
                        ? 'bg-violet-600 text-white rounded-br-sm shadow-sm' 
                        : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-sm border border-neutral-100 dark:border-white/5 shadow-sm'
                    }`}>
                      {msg.content.startsWith('http') && msg.content.includes('supabase') ? (
                        <img src={msg.content} alt="chat attachment" className="max-w-full rounded-lg mt-1 mb-2 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewerImage(msg.content)} />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                      )}
                      <span className={`text-[10px] mt-1 block text-right ${msg.sender_type === 'master' ? 'text-violet-200' : 'text-neutral-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )})
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/5">
              <form onSubmit={sendMessage} className="flex gap-2 max-w-4xl mx-auto items-center">
                <button 
                  type="button" 
                  onClick={() => setIsAttachmentMenuOpen(true)}
                  className="cursor-pointer p-2 text-neutral-400 hover:text-violet-500 transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text"
                  placeholder="Написать сообщение..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-violet-500 focus:bg-white dark:focus:bg-neutral-900 rounded-xl px-4 py-3 outline-none text-sm transition-all"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-800 text-white p-3 rounded-xl transition-all shadow-sm flex items-center justify-center min-w-[48px]"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 hidden md:flex text-neutral-400">
            <MessageCircle className="w-16 h-16 text-neutral-200 dark:text-neutral-800 mb-4" />
            <p className="text-lg font-medium text-neutral-500">Выберите чат слева</p>
            <p className="text-sm">Чтобы просмотреть историю сообщений</p>
          </div>
        )}
      </div>
      {clientToView && (
        <ClientDetailsModal
          isOpen={!!clientToView}
          onClose={() => setClientToView(null)}
          client={clientToView}
          onUpdate={() => fetchChats()}
          chatId={selectedChat?.id || null}
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

      <AttachmentMenu
        isOpen={isAttachmentMenuOpen}
        onClose={() => setIsAttachmentMenuOpen(false)}
        onFileSelect={(file) => handleImageUpload(file)}
      />
    </div>
  )
}
