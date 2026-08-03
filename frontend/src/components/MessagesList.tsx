import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { MessageCircle, Clock, Send, AlertCircle, Search, ChevronLeft, Image as ImageIcon, Calendar, Paperclip, Check, CheckCheck, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { ClientDetailsModal } from '@/components/ClientDetailsModal'
import { ImageViewerModal } from '@/components/ImageViewerModal'
import { ChatSessionsModal } from '@/components/ChatSessionsModal'
import { SkeletonList } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'
import { OnlineIndicator } from '@/components/OnlineIndicator'
import { usePresence } from '@/components/PresenceContext'
import { formatLastSeenText } from '@/lib/formatLastSeen'
import { MasterProfileModal } from '@/components/MasterProfileModal'

interface Message {
  id: string
  sender_type: 'client' | 'master'
  content: string
  created_at: string
  is_read?: boolean
  is_sending?: boolean
  is_error?: boolean
}

interface ChatPreview {
  id: string
  lead_id: string
  client_id?: string
  client_session_id?: string
  master_id?: string
  created_at: string
  leads?: {
    id?: string
    title: string
    description: string
    image_urls: string[]
    contacts?: string
    is_personal?: boolean
  }
  client_info?: {
    id?: string
    name: string
    email: string
    avatar_url: string
    last_seen?: string
    username?: string
  }
  last_message: {
    content: string
    created_at: string
    sender_type: string
  } | null
  proposal_status: string | null
  kanban_status?: string | null
  sessions_count?: number
}

interface MessagesListProps {
  userRole?: 'client' | 'master'
  onViewLead?: (lead: any) => void
  onViewSession?: (chatId: string) => void
}

export function MessagesList({ userRole = 'master', onViewLead, onViewSession }: MessagesListProps) {
  const { isOnline } = usePresence()
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<ChatPreview | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [clientToView, setClientToView] = useState<any | null>(null)
  const [viewerImage, setViewerImage] = useState<string | null>(null)
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [selectedMasterUsernameForModal, setSelectedMasterUsernameForModal] = useState<string | null>(null)

  const [chatsOffset, setChatsOffset] = useState(0)
  const [hasMoreChats, setHasMoreChats] = useState(true)
  const CHATS_LIMIT = 30

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
          let hasNew = false
          let changed = false

          for (const msg of data) {
            const existing = prevMap.get(msg.id)
            if (!existing) {
              prevMap.set(msg.id, msg)
              hasNew = true
              changed = true
            } else if (existing.is_read !== msg.is_read || existing.is_sending || existing.is_error) {
              prevMap.set(msg.id, msg)
              changed = true
            }
          }

          if (changed) {
            if (hasNew) setTimeout(scrollToBottom, 100)
            const combined = Array.from(prevMap.values())
            return combined.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
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

    const messageText = newMessage.trim()
    setNewMessage('')

    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      sender_type: userRole,
      content: messageText,
      created_at: new Date().toISOString(),
      is_sending: true
    }
    setMessages(prev => [...prev, tempMessage])
    setTimeout(scrollToBottom, 50)

    // setSending(true) -- removed to allow instant typing
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
        body: JSON.stringify({ content: messageText })
      })

      if (!res.ok) throw new Error('Failed to send message')
      const msg = await res.json()

      setMessages(prev => prev.map(m => m.id === tempId ? msg : m))

      // Update local last_message in chats list to avoid waiting for poll
      setChats(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, last_message: { content: msg.content, created_at: msg.created_at, sender_type: msg.sender_type } } : c
      ))

      scrollToBottom()
    } catch (err: any) {
      toast.error(err.message)
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, is_sending: false, is_error: true } : m))
    } finally {
      // setSending(false)
    }
  }

  const handleImageUpload = async (eOrFile: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = eOrFile instanceof File ? eOrFile : (eOrFile as React.ChangeEvent<HTMLInputElement>).target.files?.[0]
    if (!file || !selectedChat) return

    const tempId = `temp-${Date.now()}`
    const tempMessage: Message = {
      id: tempId,
      sender_type: userRole,
      content: '📷 Загрузка фото...',
      created_at: new Date().toISOString(),
      is_sending: true
    }
    setMessages(prev => [...prev, tempMessage])
    setTimeout(scrollToBottom, 50)

    // setSending(true) -- removed to allow instant typing
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
      setMessages(prev => prev.map(m => m.id === tempId ? msg : m))

      setChats(prev => prev.map(c =>
        c.id === selectedChat.id ? { ...c, last_message: { content: '📷 Фото', created_at: msg.created_at, sender_type: msg.sender_type } } : c
      ))

      scrollToBottom()
    } catch (error: any) {
      toast.error('Ошибка загрузки фото: ' + error.message)
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, is_sending: false, is_error: true } : m))
    } finally {
      // setSending(false)
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
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 p-6 h-[calc(100vh-140px)] min-h-[600px] shadow-sm">
        <SkeletonList count={6} />
      </div>
    )
  }

  if (chats.length === 0) {
    return (
      <EmptyState
        className="h-[calc(100vh-140px)] min-h-[600px] rounded-3xl border-0"
        icon={<MessageCircle className="w-10 h-10 text-primary-500" />}
        title={userRole === 'client' ? 'У вас пока нет диалогов' : 'Нет активных чатов'}
        description={userRole === 'client'
          ? 'Здесь будут отображаться ваши переписки с мастерами. Чтобы начать общение, выберите мастера или оставьте новую заявку на маркетплейсе.'
          : 'Откликайтесь на заявки или принимайте персональные заказы, чтобы начать общение с клиентами.'}
        actionLabel={userRole === 'client' ? 'Найти мастера' : undefined}
        onAction={userRole === 'client' ? () => window.location.href = '/dashboard' : undefined}
      />
    )
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 overflow-hidden flex h-[calc(100vh-140px)] min-h-[600px] shadow-sm">

      {/* Left Sidebar - Chat List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-white/5 flex flex-col transition-all duration-300 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-white/5 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/50">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-primary-500" />
            Сообщения
            {chats.reduce((sum, c: any) => sum + (c.unread_count || 0), 0) > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse ml-1" />
            )}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Поиск по имени или стилю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white pl-9 pr-4 py-2 rounded-xl text-sm border border-neutral-200 dark:border-white/10 focus:border-primary-500 outline-none transition-colors"
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
                  setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c))
                  if (window.innerWidth < 768) {
                    setShowMobileChat(true)
                  }
                }}
                className={`p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors flex items-center gap-3 ${isSelected ? 'bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-primary-500' : 'border-l-4 border-transparent'}`}
              >
                <div className="relative w-14 h-14 shrink-0">
                  <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-white/10">
                    {chat.client_info?.avatar_url ? (
                      <Image src={chat.client_info.avatar_url || ''} alt="avatar" className="w-full h-full object-cover" width={800} height={800} />
                    ) : (
                      <User className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>
                  <OnlineIndicator userId={userRole === 'client' ? chat.master_id : (chat.client_id || chat.client_info?.id)} lastSeen={chat.client_info?.last_seen} size="md" className="-bottom-1 -right-1 border-2 border-white dark:border-neutral-900" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-neutral-900 dark:text-white truncate">{clientName}</h3>
                    <div className="flex items-center gap-2">
                      {(chat as any).unread_count > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                      )}
                      <span className="text-[10px] text-neutral-400 font-medium">
                        {chat.last_message
                          ? new Date(chat.last_message.created_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                  </div>


                  <div className="flex justify-between items-center">
                    {chat.last_message ? (
                      <p className="text-xs text-neutral-500 truncate max-w-[180px]">
                        {(() => {
                          const content = chat.last_message.content
                          if (content.startsWith('[SYSTEM_CARD]:')) {
                            try {
                              const cardData = JSON.parse(content.replace('[SYSTEM_CARD]:', '').trim())
                              if (cardData.type === 'session_created') return '🗓️ Сеанс назначен'
                              if (cardData.type === 'new_lead') return '🌟 Новая заявка'
                              if (cardData.type === 'master_rejected') return '❌ Отказ по заявке'
                              if (cardData.type === 'master_accepted') return '✅ Сеанс принят в работу'
                              return '🔔 Системное уведомление'
                            } catch (e) {
                              return '🔔 Системное уведомление'
                            }
                          }
                          return content.startsWith('http') && content.includes('supabase')
                            ? '📷 Фото'
                            : content
                        })()}
                      </p>
                    ) : (
                      <p className="text-xs text-neutral-400 italic">Нет сообщений</p>
                    )}
                  </div>

                  {userRole === 'master' && chat.proposal_status && chat.proposal_status !== 'pending' && (
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
              className={`p-4 sm:p-6 border-b border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-900 flex items-center justify-between shrink-0 transition-colors cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50`}
              onClick={() => {
                if (userRole === 'client') {
                  if (selectedChat.client_info?.username) {
                    setSelectedMasterUsernameForModal(selectedChat.client_info.username);
                  }
                  return;
                }
                let client = clients.find((c: any) =>
                  (c.chat_id && c.chat_id === selectedChat.id) ||
                  (c.lead_id && c.lead_id === selectedChat.lead_id) ||
                  (selectedChat.client_id && c.id === selectedChat.client_id) ||
                  (selectedChat.client_info?.email && c.email && c.email.toLowerCase() === selectedChat.client_info.email.toLowerCase()) ||
                  (selectedChat.leads?.contacts && c.phone && c.phone === selectedChat.leads.contacts) ||
                  (selectedChat.leads?.contacts && c.contact_info && c.contact_info === selectedChat.leads.contacts)
                );
                if (!client) {
                  const isPersonal = selectedChat.leads?.is_personal;
                  client = {
                    id: 'temp-' + selectedChat.id,
                    name: selectedChat.client_info?.name || 'Новый клиент',
                    lead_id: selectedChat.lead_id,
                    leads: selectedChat.leads,
                    source: isPersonal ? 'direct' : 'marketplace',
                    phone: selectedChat.leads?.contacts || '',
                    telegram: '',
                    instagram: '',
                    email: selectedChat.client_info?.email || '',
                    notes: isPersonal
                      ? 'Персональная заявка с вашей личной страницы. Карточка будет автоматически создана при принятии заявки или сеанса.'
                      : 'ВНИМАНИЕ: Заявка еще не принята в работу. Примите её или назначьте сеанс, чтобы карточка стала активной.',
                    master_sessions: []
                  };
                }
                if (client) {
                  setClientToView(client);
                } else {
                  toast.error('Карточка клиента не найдена. Возможно, это новая заявка из маркетплейса, которая ещё не перешла в CRM.');
                }
              }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMobileChat(false); }}
                  className="md:hidden p-2 -ml-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="relative w-14 h-14 shrink-0">
                  <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden border border-neutral-200 dark:border-white/10">
                    {selectedChat.client_info?.avatar_url ? (
                      <Image src={selectedChat.client_info.avatar_url || ''} alt="avatar" className="w-full h-full object-cover" width={800} height={800} />
                    ) : (
                      <User className="w-6 h-6 text-neutral-400" />
                    )}
                  </div>
                  <OnlineIndicator userId={userRole === 'client' ? selectedChat.master_id : (selectedChat.client_id || selectedChat.client_info?.id)} lastSeen={selectedChat.client_info?.last_seen} size="md" className="-bottom-1 -right-1 border-2 border-white dark:border-neutral-900" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="font-bold text-neutral-900 dark:text-white truncate leading-tight">
                    {selectedChat.client_info?.name || selectedChat.leads?.title}
                  </h3>
                  <p className="text-xs mt-0.5 truncate font-medium">
                    {(() => {
                      const recId = userRole === 'client' ? selectedChat.master_id : (selectedChat.client_id || selectedChat.client_info?.id)
                      const recLastSeen = selectedChat.client_info?.last_seen
                      const online = isOnline(recId, recLastSeen)
                      const text = formatLastSeenText(recLastSeen, online)
                      return online ? (
                        <span className="text-emerald-500 font-semibold">В сети</span>
                      ) : (
                        <span className="text-neutral-500 dark:text-neutral-400">{text}</span>
                      )
                    })()}
                  </p>
                </div>
              </div>

              <div
                className="hidden sm:flex shrink-0 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSessionsModal(true);
                }}
              >
                <span className="text-xs font-semibold px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg whitespace-nowrap hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors">
                  Сеансы ({selectedChat.sessions_count || 1})
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-2xl text-xs flex gap-2 mx-auto max-w-lg mb-6">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Все важные детали (цена, дата) обсуждайте здесь. История переписки сохраняется.</p>
              </div>

              {messages.length === 0 ? (
                <EmptyState
                  variant="compact"
                  icon={<MessageCircle className="w-8 h-8" />}
                  title="Здесь пока нет сообщений"
                  description="Напишите клиенту первым!"
                />
              ) : (
                messages.map(msg => {
                  const isSystemCard = msg.content.startsWith('[SYSTEM_CARD]:')

                  if (isSystemCard) {
                    let cardData = null
                    try {
                      cardData = JSON.parse(msg.content.replace('[SYSTEM_CARD]:', '').trim())
                    } catch (e) { }

                    return (
                      <div key={msg.id} className="flex justify-center w-full my-4 shrink-0">
                        {cardData ? (
                          <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 p-5 rounded-2xl shadow-sm text-center max-w-sm w-full">
                            <Calendar className="w-8 h-8 text-primary-500 mx-auto mb-3" />
                            <h4 className="font-bold text-neutral-900 dark:text-white mb-2">
                              {cardData.type === 'session_created' ? 'Сеанс назначен' : cardData.type === 'new_lead' ? 'Новая заявка' : cardData.type === 'master_rejected' ? 'Отказ' : cardData.type === 'master_accepted' ? 'Сеанс принят в работу' : 'Системное уведомление'}
                            </h4>
                            {cardData.type === 'session_created' && (
                              <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                                  {userRole === 'client' ? 'Вам назначен сеанс!' : 'Вы назначили сеанс.'} <br />
                                  {new Date(cardData.date).toLocaleDateString('ru-RU')} в {cardData.time}
                                </p>
                                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl py-2 px-4 text-sm font-medium text-neutral-900 dark:text-white border border-neutral-100 dark:border-white/5 mb-4">
                                  Стоимость: {cardData.price} CZK
                                </div>
                                {onViewSession && selectedChat?.client_session_id && (
                                  <button
                                    onClick={() => onViewSession(selectedChat.client_session_id!)}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors w-full"
                                  >
                                    Посмотреть
                                  </button>
                                )}
                              </>
                            )}
                            {cardData.type === 'master_rejected' && (
                              <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                                  {userRole === 'client' ? 'Мастер отклонил заявку.' : 'Вы отклонили заявку.'}<br /><br />
                                  <strong>Причина:</strong> {cardData.reason}
                                </p>
                              </>
                            )}
                            {cardData.type === 'master_accepted' && (
                              <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">
                                  {userRole === 'client' ? 'Мастер взял вашу заявку в работу! Скоро он напишет вам для уточнения деталей.' : 'Вы приняли заявку в работу. Напишите клиенту, чтобы обсудить детали!'}
                                </p>
                              </>
                            )}
                            {cardData.type === 'new_lead' && (
                              <>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 whitespace-pre-wrap">

                                  {userRole === 'client' ? 'Вы отправили новую заявку. Ожидайте ответа.' : 'Клиент создал новую заявку на татуировку. Обсудите детали и предложите сеанс.'}
                                </p>
                                {onViewLead && selectedChat?.leads && (
                                  <button
                                    onClick={() => onViewLead(selectedChat.leads)}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors w-full"
                                  >
                                    Посмотреть
                                  </button>
                                )}
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
                    <div key={msg.id} className={`flex ${msg.sender_type === userRole ? 'justify-end' : 'justify-start'} shrink-0 animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_type === userRole
                          ? 'bg-primary-600 text-white rounded-br-sm shadow-sm'
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-bl-sm border border-neutral-100 dark:border-white/5 shadow-sm'
                        }`}>
                        {msg.content.startsWith('http') && msg.content.includes('supabase') ? (
                          <Image src={msg.content || ''} alt="chat attachment" className="max-w-full rounded-lg mt-1 mb-2 max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewerImage(msg.content)} width={800} height={800} />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        )}
                        <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${msg.sender_type === userRole ? 'text-primary-200' : 'text-neutral-400'}`}>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.sender_type === userRole && (
                            msg.is_error ? (
                              <AlertCircle className="w-3 h-3 text-red-400" />
                            ) : msg.is_sending ? (
                              <Clock className="w-3 h-3 opacity-70" />
                            ) : msg.is_read ? (
                              <CheckCheck className="w-3 h-3" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-white/5">
              <form onSubmit={sendMessage} className="flex gap-2 max-w-4xl mx-auto items-center">
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
                  className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-neutral-900 rounded-xl px-4 py-3 outline-none text-sm transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 disabled:dark:bg-neutral-800 text-white p-3 rounded-xl transition-all shadow-sm flex items-center justify-center min-w-[48px]"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 hidden md:flex items-center justify-center p-8">
            <EmptyState
              variant="compact"
              icon={<MessageCircle className="w-10 h-10" />}
              title="Выберите чат слева"
              description="Чтобы просмотреть историю сообщений"
            />
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
      {showSessionsModal && selectedChat && (
        <ChatSessionsModal
          chatId={selectedChat.id}
          clientInfo={selectedChat.client_info || selectedChat.leads}
          userRole={userRole}
          onClose={() => setShowSessionsModal(false)}
          onUpdate={() => fetchChats()}
        />
      )}
      {selectedMasterUsernameForModal && (
        <MasterProfileModal
          username={selectedMasterUsernameForModal}
          onClose={() => setSelectedMasterUsernameForModal(null)}
          onBook={() => {}}
        />
      )}
    </div>
  )
}
