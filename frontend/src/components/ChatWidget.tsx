'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Loader2 } from 'lucide-react'
import { supabase, SupportMessage } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { getTranslation, Language } from '@/lib/i18n'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [isGuestLoading, setIsGuestLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [language, setLanguage] = useState<string>('cs')

  useEffect(() => {
    const savedLang = localStorage.getItem('language')
    if (savedLang) {
      setLanguage(savedLang)
    } else {
      const sysLang = navigator.language.toLowerCase()
      if (sysLang.startsWith('ru')) setLanguage('ru')
      else if (sysLang.startsWith('en')) setLanguage('en')
      else setLanguage('cs')
    }
  }, [])

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isOpen || !session?.user) return

    const fetchMessagesAndMarkRead = async () => {
      setIsLoading(true)
      
      // Mark admin messages as read since we are viewing them
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .neq('sender_id', session.user.id)
        .eq('is_read', false)

      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as SupportMessage[])
      }
      setUnreadCount(0)
      setIsLoading(false)
      scrollToBottom()
    }

    fetchMessagesAndMarkRead()

    const channel = supabase
      .channel('public:support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as SupportMessage
          setMessages((prev) => [...prev, newMsg])
          if (!isOpen && newMsg.sender_id !== session.user.id) {
            setUnreadCount(c => c + 1)
          } else if (isOpen && newMsg.sender_id !== session.user.id) {
            // Mark immediately read if open
            supabase.from('support_messages').update({ is_read: true }).eq('id', newMsg.id)
          }
          scrollToBottom()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_messages',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as SupportMessage
          setMessages((prev) => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m))
        }
      )
      .subscribe()

    // Also fetch initial unread count
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .neq('sender_id', session.user.id)
        .eq('is_read', false)
      if (count) setUnreadCount(count)
    }
    fetchUnread()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, session])

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !session?.user) return

    setIsSending(true)
    const { error } = await supabase
      .from('support_messages')
      .insert({
        user_id: session.user.id,
        sender_id: session.user.id,
        message: newMessage.trim(),
      })

    if (!error) {
      setNewMessage('')
    }
    setIsSending(false)
  }

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestEmail.trim()) return

    setIsGuestLoading(true)
    // Create shadow account
    const randomPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const { data, error } = await supabase.auth.signUp({
      email: guestEmail.trim(),
      password: randomPassword,
      options: {
        data: {
          is_guest: true
        }
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error(t('emailRegistered'))
      } else {
        toast.error(t('emailError'))
      }
    } else {
      toast.success(t('chatStarted'))
      // The session effect will catch the new session automatically if auto-login works
      // If not, we manually set session:
      if (data.session) {
        setSession(data.session)
      } else {
        // Fallback if email confirmation is required, we can't do live chat.
        // We will just show an error.
        toast.error(t('emailConfirmRequired'))
      }
    }
    setIsGuestLoading(false)
  }

  // If not logged in, show Email pre-chat form
  if (!session?.user) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="mb-4 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl origin-bottom-right pointer-events-auto"
            >
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 rounded-t-2xl">
            <h3 className="font-bold text-white dark:text-neutral-950 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {t('supportService')}
            </h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              {t('enterEmailForAnswer')}
            </p>
            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <input 
                type="email" 
                required
                placeholder={t('yourEmail')}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                disabled={isGuestLoading}
                className="w-full py-2.5 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isGuestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('startChat')}
              </button>
            </form>
          </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform border-4 border-neutral-50 dark:border-neutral-950 pointer-events-auto"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>
    )
  }

  // Full Live Chat
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-80 sm:w-96 h-[500px] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl origin-bottom-right overflow-hidden pointer-events-auto"
          >
        <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex justify-between items-center shrink-0">
          <h3 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Поддержка
          </h3>
          <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50 dark:bg-neutral-950">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 dark:text-neutral-400">
              <MessageCircle className="w-12 h-12 mb-2 opacity-20" />
              <p className="text-sm">{t('noMessages')}</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === session.user.id
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%]`}>
                    {!isMine && (
                      <span className="text-[10px] text-neutral-500 font-medium mb-1 pl-1 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {t('supportService')}
                      </span>
                    )}
                    <div 
                      className={`relative min-w-[70px] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                        isMine 
                          ? 'bg-cyan-500 text-white rounded-br-sm' 
                          : 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-bl-sm'
                      }`}
                    >
                      <div className="break-words mb-1">
                        {msg.message}
                      </div>
                      <div className={`text-[10px] leading-none flex items-center justify-end gap-0.5 whitespace-nowrap ${isMine ? 'text-cyan-100' : 'text-neutral-400'}`}>
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMine && (
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

        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex gap-2 shrink-0">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('typeMessage')}
            className="flex-1 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl px-4 py-2 text-sm text-neutral-900 dark:text-white outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="bg-cyan-500 hover:bg-cyan-600 text-white p-2 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center min-w-[40px]"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-cyan-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 transition-transform border-4 border-white dark:border-neutral-950 pointer-events-auto"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-neutral-950">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
