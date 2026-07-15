import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, DollarSign, Settings, Archive, X, BellRing } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  is_archived?: boolean
  created_at: string
}

export function NotificationsMenu() {
  const [session, setSession] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return

    fetchNotifications(activeTab === 'archived')

    // Setup realtime subscription (only handle active tab updates)
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session?.user?.id}`
        },
        (payload) => {
          if (activeTab === 'active') {
            setNotifications(prev => [payload.new as Notification, ...prev])
          }
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    // Click outside to close
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    
    // Check push permissions
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [session?.user?.id, activeTab])

  const fetchNotifications = async (isArchived: boolean) => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications?archived=${isArchived ? 'true' : 'false'}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        if (!isArchived) {
          setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
        }
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (e) {
      console.error(e)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error(e)
    }
  }

  const archiveNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/${id}/archive`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const archiveAllRead = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notifications/archive-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (activeTab === 'active') {
        setNotifications(prev => prev.filter(n => !n.is_read))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const requestPushPermission = async () => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setPushEnabled(true)
        // Attempt subscription
        const { subscribeToPush } = await import('@/lib/push')
        await subscribeToPush(session.access_token)
      }
    } catch (err) {
      console.error('Failed to request push permissions:', err)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="w-5 h-5 text-green-500" />
      case 'system': return <Settings className="w-5 h-5 text-blue-500" />
      default: return <Info className="w-5 h-5 text-neutral-500" />
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 relative rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h3 className="font-bold text-neutral-900 dark:text-white">Уведомления</h3>
            {activeTab === 'active' && unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Прочитать все
              </button>
            )}
            {activeTab === 'active' && unreadCount === 0 && notifications.length > 0 && (
              <button 
                onClick={archiveAllRead}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors flex items-center gap-1"
              >
                <Archive className="w-3 h-3" /> Очистить все
              </button>
            )}
          </div>
          
          <div className="flex border-b border-neutral-100 dark:border-neutral-800">
            <button 
              onClick={() => setActiveTab('active')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'active' ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
            >
              Активные {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button 
              onClick={() => setActiveTab('archived')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'archived' ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
            >
              Архив
            </button>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 text-sm flex flex-col items-center">
                {activeTab === 'active' ? (
                  <>
                    <Bell className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-3" />
                    <p>Нет новых уведомлений</p>
                  </>
                ) : (
                  <>
                    <Archive className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mb-3" />
                    <p>Архив пуст</p>
                  </>
                )}
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => activeTab === 'active' && !n.is_read && markAsRead(n.id)}
                  className={`group relative p-4 border-b border-neutral-100 dark:border-neutral-800/50 transition-colors flex gap-3 ${activeTab === 'active' ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer' : ''} ${!n.is_read && activeTab === 'active' ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''}`}
                >
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.is_read && activeTab === 'active' ? 'bg-white dark:bg-neutral-800 shadow-sm' : 'bg-neutral-100 dark:bg-neutral-800/50'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 pr-6">
                    <h4 className={`text-sm ${!n.is_read && activeTab === 'active' ? 'font-bold text-neutral-900 dark:text-white' : 'font-medium text-neutral-700 dark:text-neutral-300'}`}>
                      {n.title}
                    </h4>
                    <p className={`text-sm mt-0.5 ${!n.is_read && activeTab === 'active' ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {n.message}
                    </p>
                    <span className="text-xs text-neutral-400 mt-2 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {!n.is_read && activeTab === 'active' && (
                    <div className="w-2 h-2 rounded-full bg-cyan-500 mt-1.5 ml-auto shrink-0"></div>
                  )}
                  {activeTab === 'active' && n.is_read && (
                    <button 
                      onClick={(e) => archiveNotification(e, n.id)}
                      className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="В архив"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          {!pushEnabled && activeTab === 'active' && (
            <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border-t border-violet-100 dark:border-violet-900/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Включить пуш-уведомления?</span>
              </div>
              <button 
                onClick={requestPushPermission}
                className="text-xs font-bold px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors shadow-sm"
              >
                Включить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
