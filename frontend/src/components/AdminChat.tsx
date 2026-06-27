'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, SupportMessage } from '@/lib/supabase'
import { MessageCircle, Send, Loader2, User, Trash2, Ban, CheckCircle2, Coins, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { ConfirmModal } from '@/components/ConfirmModal'

export function AdminChat() {
  const [session, setSession] = useState<any>(null)
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [chatList, setChatList] = useState<{ id: string, email: string, last_msg: string, unread: number }[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  // Custom Modals State
  const [balanceModalUser, setBalanceModalUser] = useState<{ id: string, email: string, balance: number } | null>(null)
  const [newBalanceValue, setNewBalanceValue] = useState<string>('')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    type: 'danger' | 'info' | 'warning'
  } | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    if (!session) return

    // Fetch users and chats
    const fetchChatUsers = async () => {
      setIsLoadingChats(true)
      
      // 1. Fetch all users via backend API (bypassing RLS)
      let uMap: Record<string, any> = {}
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const usersData = await res.json()
          usersData.forEach((u: any) => uMap[u.id] = u)
          setUsersMap(uMap)
        }
      } catch (err) {
        console.error('Failed to fetch users for chat map', err)
      }

      // 2. Fetch all messages
      const { data: messagesData } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (messagesData) {
        const uniqueUsers = new Map()
        for (const msg of messagesData) {
          if (!uniqueUsers.has(msg.user_id)) {
            uniqueUsers.set(msg.user_id, {
              id: msg.user_id,
              email: uMap[msg.user_id]?.email || 'Unknown User',
              last_msg: new Date(msg.created_at).toLocaleString(),
              unread: msg.is_read === false && msg.sender_id !== session.user.id ? 1 : 0
            })
          } else if (msg.is_read === false && msg.sender_id !== session.user.id) {
            uniqueUsers.get(msg.user_id).unread += 1
          }
        }
        setChatList(Array.from(uniqueUsers.values()))
      }
      setIsLoadingChats(false)
    }

    fetchChatUsers()

    const channel = supabase
      .channel('public:support_messages_admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          // If viewing this chat, append it
          setMessages(prev => {
            // Check if we are viewing the chat for this user_id
            if (prev.length > 0 && prev[0].user_id === newMsg.user_id) {
               return [...prev, newMsg]
            }
            return prev
          })
          scrollToBottom()
          // Refresh chat list to update last message time
          fetchChatUsers()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session])

  useEffect(() => {
    if (!selectedUserId) return

    const fetchMessagesAndMarkRead = async () => {
      setIsLoadingMessages(true)
      
      // Mark as read
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', selectedUserId)
        .neq('sender_id', session.user.id)
        .eq('is_read', false)

      // Fetch messages
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as SupportMessage[])
        scrollToBottom()
      }
      
      // Update local unread count
      setChatList(prev => prev.map(c => c.id === selectedUserId ? { ...c, unread: 0 } : c))
      setIsLoadingMessages(false)
    }

    fetchMessagesAndMarkRead()
  }, [selectedUserId])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session || !selectedUserId) return

    setIsSending(true)
    const { error } = await supabase
      .from('support_messages')
      .insert({
        user_id: selectedUserId,
        sender_id: session.user.id,
        message: newMessage.trim(),
      })

    if (!error) {
      setNewMessage('')
    }
    setIsSending(false)
  }

  const handleUpdateBalance = (userId: string) => {
    const user = usersMap[userId]
    setBalanceModalUser({ id: userId, email: user.email, balance: user.balance || 0 })
    setNewBalanceValue((user.balance || 0).toString())
  }

  const submitUpdateBalance = async () => {
    if (!balanceModalUser || !session) return
    const userId = balanceModalUser.id
    const num = parseInt(newBalanceValue)
    if (isNaN(num) || num < 0) {
      toast.error('Неверная сумма')
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/balance`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ balance: num })
      })
      if (!res.ok) throw new Error('Failed to update credits')
      toast.success('Баланс обновлен')
      setUsersMap(prev => ({ ...prev, [userId]: { ...prev[userId], balance: num } }))
      setBalanceModalUser(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleToggleBan = (userId: string) => {
    const user = usersMap[userId]
    if (!user) return
    const isBanned = user.status === 'rejected'
    const newStatus = isBanned ? 'approved' : 'rejected'

    setConfirmModal({
      isOpen: true,
      title: isBanned ? 'Разблокировать пользователя' : 'Заблокировать пользователя',
      message: `Вы уверены, что хотите ${isBanned ? 'разблокировать' : 'заблокировать'} пользователя ${user.email}?`,
      confirmText: isBanned ? 'Разблокировать' : 'Заблокировать',
      cancelText: 'Отмена',
      type: isBanned ? 'info' : 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
          })
          if (!res.ok) throw new Error('Failed to update status')
          toast.success(isBanned ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
          setUsersMap(prev => ({ ...prev, [userId]: { ...prev[userId], status: newStatus } }))
        } catch (err: any) {
          toast.error(err.message)
        }
      }
    })
  }

  const handleClearChat = (userId: string) => {
    const user = usersMap[userId]
    const userEmail = user?.email || 'этого пользователя'

    setConfirmModal({
      isOpen: true,
      title: 'Очистить историю чата',
      message: `Вы уверены, что хотите полностью очистить историю этого чата с ${userEmail}? Действие необратимо.`,
      confirmText: 'Очистить',
      cancelText: 'Отмена',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/chat/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          })
          if (!res.ok) throw new Error('Failed to clear chat')
          toast.success('Чат очищен')
          setMessages([])
          setChatList(prev => prev.filter(c => c.id !== userId))
          setSelectedUserId(null)
        } catch (err: any) {
          toast.error(err.message)
        }
      }
    })
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex h-[600px] animate-fade-in-up">
      {/* Sidebar: Users List */}
      <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-900/50">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
          <MessageCircle className="w-5 h-5 text-cyan-500" />
          Активные чаты
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : chatList.length === 0 ? (
            <div className="text-center p-8 text-neutral-500 text-sm">
              Нет активных чатов
            </div>
          ) : (
            chatList.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedUserId(c.id)}
                className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 transition-colors ${selectedUserId === c.id ? 'bg-white dark:bg-neutral-800 border-l-4 border-l-cyan-500' : ''} ${c.unread > 0 && selectedUserId !== c.id ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={`font-medium truncate ${c.unread > 0 && selectedUserId !== c.id ? 'text-neutral-900 dark:text-white font-bold' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {c.email}
                  </div>
                  {c.unread > 0 && selectedUserId !== c.id && (
                    <div className="w-5 h-5 bg-cyan-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                      {c.unread}
                    </div>
                  )}
                </div>
                <div className="text-xs text-neutral-500">{c.last_msg}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-neutral-50 dark:bg-neutral-950">
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
            <p>Выберите чат слева</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shadow-sm z-10 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-500" />
                </div>
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white leading-tight">
                    {usersMap[selectedUserId]?.email || 'Загрузка...'}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                    <span className="text-cyan-600 dark:text-cyan-400 font-medium">{usersMap[selectedUserId]?.balance || 0} кредитов</span>
                    •
                    <span className={usersMap[selectedUserId]?.status === 'approved' ? 'text-green-500' : 'text-amber-500'}>
                      {usersMap[selectedUserId]?.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateBalance(selectedUserId)}
                  className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg transition-colors"
                  title="Изменить баланс"
                >
                  <Coins className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleToggleBan(selectedUserId)}
                  className={`p-2 rounded-lg transition-colors ${
                    usersMap[selectedUserId]?.status === 'rejected' 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50' 
                      : 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
                  }`}
                  title={usersMap[selectedUserId]?.status === 'rejected' ? 'Разблокировать' : 'Заблокировать'}
                >
                  {usersMap[selectedUserId]?.status === 'rejected' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleClearChat(selectedUserId)}
                  className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 rounded-lg transition-colors"
                  title="Очистить чат"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoadingMessages ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : (
                messages.map(msg => {
                  const isAdmin = msg.sender_id === session?.user?.id
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} max-w-[70%]`}>
                        <div 
                          className={`relative min-w-[70px] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                            isAdmin 
                              ? 'bg-cyan-500 text-white rounded-br-sm' 
                              : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-bl-sm'
                          }`}
                        >
                          <div className="break-words mb-1">
                            {msg.message}
                          </div>
                          <div className={`text-[10px] leading-none flex items-center justify-end gap-0.5 whitespace-nowrap ${isAdmin ? 'text-cyan-100' : 'text-neutral-400'}`}>
                            <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isAdmin && (
                              <span className="opacity-80 tracking-tighter text-[11px]">
                                {msg.is_read ? '✓✓' : '✓'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение пользователю..."
                className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-2 text-sm text-neutral-900 dark:text-white outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </>
        )}
      </div>

      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => { if (e.target === e.currentTarget) setBalanceModalUser(null) }}>
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Изменить баланс пользователя</h3>
              <button 
                onClick={() => setBalanceModalUser(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{balanceModalUser.email}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Новый баланс (кредитов)</label>
              <input
                type="number"
                min="0"
                className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={newBalanceValue}
                onChange={(e) => setNewBalanceValue(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBalanceModalUser(null)}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={submitUpdateBalance}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
