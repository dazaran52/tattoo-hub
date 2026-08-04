'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { AdminChat } from '@/components/AdminChat'
import { AdminAiChats } from '@/components/AdminAiChats'
import { AdminLocations } from '@/components/AdminLocations'
import { AdminDisputes } from '@/components/AdminDisputes'
import { AdminCurrencies } from '@/components/AdminCurrencies'
import { AdminLeads } from '@/components/AdminLeads'
import { supabase, Profile } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Loader2, Plus, Edit2, Trash2, Link as LinkIcon, Search, Coins, Ban, Eye, MessageSquare, Shield, Lock, Unlock, UserCheck, FileText, X, Check } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'
import toast from 'react-hot-toast'
import { useLanguage } from '@/i18n/LanguageContext'
import { CertificateReviewModal, CertificateReviewUser } from '@/components/CertificateReviewModal'
import { SkeletonTable } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'

interface AdminUserResponse {
  id: string
  email: string
  display_name?: string
  phone?: string
  is_verified_master: boolean
  badge_tier?: string
  badge_expires_at?: string
  is_admin: boolean
  balance: number
  credits: number
  currency?: string
  can_chat?: boolean
  can_create_leads?: boolean
  created_at: string
  portfolio_url?: string
  role?: string
  referred_by?: string
  status?: string
  certificate_url?: string
  certificate_status?: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  certificate_submitted_at?: string
  certificate_rejection_reason?: string
}



export default function AdminPage() {
  const router = useRouter()
  const { lang: language } = useLanguage()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [userRoleTab, setUserRoleTab] = useState<'all' | 'master' | 'client' | 'admin'>('all')
  const [userPage, setUserPage] = useState(1)
  const [userTotalPages, setUserTotalPages] = useState(1)
  const [userTotalCount, setUserTotalCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'users' | 'leads' | 'chats' | 'ai-chats' | 'locations' | 'disputes' | 'currencies'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'balance_desc' | 'balance_asc'>('newest')
  const [balanceModalUser, setBalanceModalUser] = useState<{ id: string, email: string, balance: number } | null>(null)
  const [newBalanceValue, setNewBalanceValue] = useState<string>('')
  const [certificateReviewUser, setCertificateReviewUser] = useState<CertificateReviewUser | null>(null)


  // Badge Modal State
  const [badgeModalUser, setBadgeModalUser] = useState<AdminUserResponse | null>(null)
  const [selectedBadgeTier, setSelectedBadgeTier] = useState<'none' | 'pro' | 'vip'>('vip')
  const [selectedDurationDays, setSelectedDurationDays] = useState<number>(30)
  const [isSubmittingBadge, setIsSubmittingBadge] = useState<boolean>(false)

  // User Detail & Inspector Modal State
  const [detailModalUser, setDetailModalUser] = useState<AdminUserResponse | null>(null)
  const [activeUserDetailTab, setActiveUserDetailTab] = useState<'profile' | 'chats' | 'leads'>('profile')
  const [userChats, setUserChats] = useState<any[]>([])
  const [userLeadsData, setUserLeadsData] = useState<{ type: string, data: any[] } | null>(null)
  const [selectedChatMessages, setSelectedChatMessages] = useState<any[] | null>(null)
  const [selectedChatTitle, setSelectedChatTitle] = useState<string>('')
  const [isLoadingUserChats, setIsLoadingUserChats] = useState<boolean>(false)
  const [isLoadingUserLeads, setIsLoadingUserLeads] = useState<boolean>(false)
  const [isLoadingChatMessages, setIsLoadingChatMessages] = useState<boolean>(false)
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState<boolean>(false)

  const openUserDetailModal = async (user: AdminUserResponse) => {
    setDetailModalUser(user)
    setActiveUserDetailTab('profile')
    setSelectedChatMessages(null)
    loadUserChats(user.id)
    loadUserLeads(user.id)
  }

  const loadUserChats = async (userId: string) => {
    try {
      setIsLoadingUserChats(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/chats`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUserChats(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingUserChats(false)
    }
  }

  const loadUserLeads = async (userId: string) => {
    try {
      setIsLoadingUserLeads(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/leads`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUserLeadsData(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingUserLeads(false)
    }
  }

  const openChatInspector = async (chatId: string, title: string) => {
    try {
      setIsLoadingChatMessages(true)
      setSelectedChatTitle(title)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedChatMessages(data)
      }
    } catch (e) {
      toast.error('Не удалось загрузить сообщения')
    } finally {
      setIsLoadingChatMessages(false)
    }
  }

  const updateUserPermissions = async (userId: string, permissions: { role?: string, is_verified_master?: boolean, can_chat?: boolean, can_create_leads?: boolean }) => {
    try {
      setIsUpdatingPermissions(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(permissions)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Не удалось обновить права')
      }
      const updated = await res.json()
      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        role: updated.role,
        is_verified_master: updated.is_verified_master,
        can_chat: updated.can_chat,
        can_create_leads: updated.can_create_leads
      } : u))
      if (detailModalUser && detailModalUser.id === userId) {
        setDetailModalUser(prev => prev ? {
          ...prev,
          role: updated.role,
          is_verified_master: updated.is_verified_master,
          can_chat: updated.can_chat,
          can_create_leads: updated.can_create_leads
        } : null)
      }
      toast.success('Права пользователя успешно обновлены!')
    } catch (e: any) {
      toast.error(e.message || 'Ошибка обновления прав')
    } finally {
      setIsUpdatingPermissions(false)
    }
  }

  const handleOpenBadgeModal = (user: AdminUserResponse) => {
    setBadgeModalUser(user)
    setSelectedBadgeTier((user.badge_tier as any) || 'vip')
    setSelectedDurationDays(30)
  }

  const submitUpdateBadge = async () => {
    if (!badgeModalUser) return
    setIsSubmittingBadge(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${badgeModalUser.id}/badge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          badge_tier: selectedBadgeTier,
          duration_days: selectedDurationDays
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || 'Failed to update user badge')
      }

      setUsers(prev => prev.map(u => u.id === badgeModalUser.id ? { ...u, badge_tier: selectedBadgeTier } : u))
      setBadgeModalUser(null)
      alert(`Статус профиля ${selectedBadgeTier.toUpperCase()} успешно установлен!`)
    } catch (err: any) {
      alert(err.message || 'Ошибка обновления статуса')
    } finally {
      setIsSubmittingBadge(false)
    }
  }


  const fetchAdminUsers = async (page: number, role: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users?page=${page}&page_size=20&role_filter=${role}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
      setUserTotalPages(data.total_pages || 1)
      setUserTotalCount(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    }
  }

  const checkAdminAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        window.location.href = '/login'
        return
      }

      // 1. Fetch own profile to verify admin
      const profileRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!profileRes.ok) throw new Error('Failed to fetch profile')
      const profileData = await profileRes.json()
      setProfile(profileData)

      if (!profileData.is_admin) {
        router.push('/dashboard')
        return
      }

      await fetchAdminUsers(userPage, userRoleTab)

    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Refetch when page or tab changes
  useEffect(() => {
    if (profile?.is_admin) {
      fetchAdminUsers(userPage, userRoleTab)
    }
  }, [userPage, userRoleTab])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)


  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      setActionLoadingId(userId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/status`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus })
        }
      )

      if (!res.ok) throw new Error(`Failed to update status to ${newStatus}`)

      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      }
    } catch (error) {
      console.error(error)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCertificateReviewed = (
    userId: string,
    certificateStatus: 'approved' | 'rejected',
    reason?: string,
  ) => {
    setUsers(current => current.map(user => user.id === userId ? {
      ...user,
      certificate_status: certificateStatus,
      certificate_rejection_reason: reason,
    } : user))
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите безвозвратно удалить этого пользователя? Это действие нельзя отменить.')) return

    try {
      setActionLoadingId(userId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        }
      )

      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        const errData = await res.json()
        setError(errData.detail || 'Failed to delete user')
      }
    } catch (error: any) {
      console.error(error)
      setError(error.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleUpdateCredits = async (userId: string, currentBalance: number, userEmail: string) => {
    setBalanceModalUser({ id: userId, email: userEmail, balance: currentBalance })
    setNewBalanceValue(currentBalance.toString())
  }

  const submitUpdateCredits = async () => {
    if (!balanceModalUser) return
    const num = Number.parseFloat(newBalanceValue)
    if (isNaN(num) || num < 0) {
      toast.error('Неверная сумма')
      return
    }

    try {
      const userId = balanceModalUser.id
      setActionLoadingId(userId)
      setBalanceModalUser(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/balance`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ balance: num })
        }
      )

      if (!res.ok) throw new Error('Failed to update balance')

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId ? { ...user, balance: num } : user
        )
      )
      toast.success('Баланс успешно обновлен!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredAndSortedUsers = users
    .filter(u => 
      !searchQuery || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (u.display_name && u.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.phone && u.phone.includes(searchQuery))
    )
    .sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortOrder === 'balance_desc') return b.balance - a.balance
      if (sortOrder === 'balance_asc') return a.balance - b.balance
      return 0
    })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 h-16 animate-pulse" />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-8 w-64 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-8" />
          <SkeletonTable rows={8} />
        </main>
      </div>
    )
  }

  if (!profile || !profile.is_admin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-500/5 dark:bg-accent-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-[120px]" />
      </div>

      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Admin Panel</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 font-medium">Manage users and leads</p>
          </div>
          <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 px-4 py-2 rounded-xl font-bold text-sm border border-primary-200 dark:border-primary-800/50 shadow-sm">
            Admin Access
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl backdrop-blur-md">
            {error}
          </div>
        )}

        <div className="flex bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 p-1.5 rounded-2xl w-fit mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'users' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t('usersManagement')}
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'leads' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Заявки (TTL)
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'chats' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Поддержка
          </button>
          <button
            onClick={() => setActiveTab('ai-chats')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'ai-chats' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            ИИ Диалоги
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'disputes' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Жалобы
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'locations' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Локации
          </button>
          <button
            onClick={() => setActiveTab('currencies')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'currencies' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Курсы валют
          </button>
        </div>

        {activeTab === 'leads' && <AdminLeads />}
        {activeTab === 'locations' && <AdminLocations />}
        {activeTab === 'chats' && <AdminChat />}
        {activeTab === 'ai-chats' && <AdminAiChats />}
        {activeTab === 'disputes' && <AdminDisputes />}
        {activeTab === 'currencies' && <AdminCurrencies />}
        
        {activeTab === 'users' && (
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl animate-fade-in-up">
            <div className="p-4 border-b border-neutral-200/50 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30">
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                {(['all', 'master', 'client', 'admin'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => { setUserRoleTab(role); setUserPage(1); }}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                      userRoleTab === role ? 'bg-accent-600 text-white' : 'bg-neutral-200/50 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {role === 'all' ? 'Все' : role === 'master' ? 'Мастера' : role === 'client' ? 'Клиенты' : 'Админы'}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Поиск по email или имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all shadow-inner"
                />
              </div>
              <div className="w-full sm:w-auto">
                <select
                  value={sortOrder}
                  onChange={(e: any) => setSortOrder(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white/60 dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/20 font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                  <option value="balance_desc">Баланс (убыв)</option>
                  <option value="balance_asc">Баланс (возр)</option>
                </select>
              </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/50 dark:border-white/5 text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('user')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Баланс</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Валюта</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('created')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/50 dark:divide-white/5">
                  {filteredAndSortedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-neutral-900 dark:text-white">{user.email}</div>
                        {user.role && (
                          <div className="text-[10px] font-black uppercase tracking-wider text-accent-600 dark:text-accent-400 mt-1">
                            {user.role}
                          </div>
                        )}
                        <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                          {user.display_name ? `${user.display_name}` : <span className="text-red-500 font-medium text-[10px] uppercase">Не завершил онбординг</span>} 
                          {user.phone && ` • ${user.phone}`}
                          {user.portfolio_url && (
                            <a href={user.portfolio_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline font-semibold">
                              <LinkIcon className="w-3 h-3 mr-1" /> Портфолио
                            </a>
                          )}
                        </div>
                        {user.referred_by && (
                          <div className="text-xs text-neutral-400 mt-1">
                            Приглашен(а): <span className="font-mono">{user.referred_by}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                        {(user.role === 'master' || user.is_admin || user.is_verified_master) ? (
                          <div className="font-extrabold text-accent-600 dark:text-accent-400 text-base">
                            {user.balance} {user.currency || 'CZK'}
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-lg uppercase">
                          {user.currency || 'CZK'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {user.status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-500/20">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-500/20">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                        {user.role === 'master' && (
                          <div className="mt-2 text-[11px] font-bold text-neutral-500">
                            Сертификат: {
                              user.certificate_status === 'approved' ? 'проверен' :
                              user.certificate_status === 'pending' ? 'ожидает проверки' :
                              user.certificate_status === 'rejected' ? 'отклонён' : 'не загружен'
                            }
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {actionLoadingId === user.id ? (
                          <div className="flex justify-end">
                            <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openUserDetailModal(user)}
                              className="px-3.5 py-2 bg-accent-500/10 hover:bg-accent-500/20 text-accent-600 dark:text-accent-400 border border-accent-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                              title="Открыть карточку пользователя и инспектор диалогов"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Инспектор
                            </button>
                            {user.role === 'master' && user.certificate_url && (
                              <button
                                onClick={() => setCertificateReviewUser(user)}
                                className="px-3.5 py-2 bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 rounded-xl text-xs font-bold hover:bg-primary-500/20 transition-all"
                              >
                                {user.certificate_status === 'pending' ? 'Проверить сертификат' : 'Сертификат'}
                              </button>
                            )}
                            {(user.role === 'master' || user.is_verified_master) && (
                              <button
                                onClick={() => handleOpenBadgeModal(user)}
                                className={`px-3.5 py-2 border rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
                                  user.badge_tier === 'vip'
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                    : user.badge_tier === 'pro'
                                      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                      : 'bg-neutral-200/50 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                                }`}
                                title="Изменить PRO / VIP статус"
                              >
                                {user.badge_tier === 'vip' ? '👑 VIP' : user.badge_tier === 'pro' ? '⭐ PRO' : '+ Статус'}
                              </button>
                            )}
                            {(user.role === 'master' || user.is_admin || user.is_verified_master) && (
                              <button
                                onClick={() => handleUpdateCredits(user.id, user.balance, user.email)}
                                className="px-3.5 py-2 bg-neutral-200/50 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all shadow-sm"
                                title="Изменить баланс"
                              >
                                Баланс
                              </button>
                            )}
                            {user.status === 'pending' && user.role === 'master' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'approved')}
                                disabled={user.role === 'master' && !user.portfolio_url}
                                title={user.role === 'master' && !user.portfolio_url ? 'Нет ссылки на портфолио' : ''}
                                className="px-3.5 py-2 bg-green-500/10 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-500/20 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Одобрить
                              </button>
                            )}
                            {user.status === 'approved' && user.role === 'master' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'pending')}
                                className="px-3.5 py-2 bg-amber-500/10 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-all"
                              >
                                Отозвать
                              </button>
                            )}
                            {user.status === 'rejected' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'pending')}
                                className="px-3.5 py-2 bg-neutral-500/10 dark:bg-neutral-900/20 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20 rounded-xl text-xs font-bold hover:bg-neutral-500/20 transition-all"
                              >
                                Вернуть
                              </button>
                            )}
                            {user.status !== 'rejected' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'rejected')}
                                className="px-3.5 py-2 bg-red-500/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1"
                              >
                                Забанить
                              </button>
                            )}
                            {(!user.role || user.role === 'client' || (!user.is_admin && user.role !== 'master')) && (
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="px-3.5 py-2 bg-rose-500/10 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold hover:bg-rose-500/20 transition-all flex items-center gap-1"
                              >
                                Удалить
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8">
                        <EmptyState
                          variant="compact"
                          icon={<Search className="w-7 h-7" />}
                          title="Пользователи не найдены"
                          description="Попробуйте изменить фильтр или выбрать другую вкладку."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200/50 dark:border-white/5 bg-neutral-50/30 dark:bg-neutral-900/20">
                <div className="text-sm text-neutral-500 font-medium">
                  Всего: {userTotalCount}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 transition-all"
                  >
                    Пред.
                  </button>
                  <span className="px-3 py-1.5 text-sm font-semibold">
                    {userPage} / {userTotalPages}
                  </span>
                  <button 
                    onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                    disabled={userPage === userTotalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 transition-all"
                  >
                    След.
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <CertificateReviewModal
        user={certificateReviewUser}
        onClose={() => setCertificateReviewUser(null)}
        onReviewed={handleCertificateReviewed}
      />

      {balanceModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-6 border border-neutral-200/50 dark:border-white/5">
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-1">Изменить баланс</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5 font-semibold">{balanceModalUser.email}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">Новый баланс (кредитов)</label>
              <input
                type="number"
                min="0"
                className="w-full bg-white/40 dark:bg-neutral-950/40 text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 transition-all shadow-inner"
                value={newBalanceValue}
                onChange={(e) => setNewBalanceValue(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBalanceModalUser(null)}
                className="px-5 py-3 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 font-semibold transition-all"
              >
                Отмена
              </button>
              <button
                onClick={submitUpdateCredits}
                className="px-5 py-3 bg-accent-600 hover:bg-accent-500 text-white font-bold rounded-xl transition-all shadow-md shadow-accent-600/20"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {badgeModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 border border-neutral-200/50 dark:border-white/10">
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-1">Выдать статус PRO / VIP</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 font-semibold">{badgeModalUser.email}</p>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">Статус аккаунта</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeTier('none')}
                    className={`py-3 px-3 rounded-2xl font-bold text-xs border transition-all ${
                      selectedBadgeTier === 'none'
                        ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-md'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200'
                    }`}
                  >
                    Базовый
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeTier('pro')}
                    className={`py-3 px-3 rounded-2xl font-bold text-xs border transition-all flex items-center justify-center gap-1 ${
                      selectedBadgeTier === 'pro'
                        ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/25'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200'
                    }`}
                  >
                    ⭐ PRO
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBadgeTier('vip')}
                    className={`py-3 px-3 rounded-2xl font-bold text-xs border transition-all flex items-center justify-center gap-1 ${
                      selectedBadgeTier === 'vip'
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/25'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-transparent hover:bg-neutral-200'
                    }`}
                  >
                    👑 VIP
                  </button>
                </div>
              </div>

              {selectedBadgeTier !== 'none' && (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">Длительность статуса</label>
                  <select
                    value={selectedDurationDays}
                    onChange={(e) => setSelectedDurationDays(Number(e.target.value))}
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:border-amber-500"
                  >
                    <option value={7}>7 дней (Пробный)</option>
                    <option value={30}>30 дней (1 месяц)</option>
                    <option value={90}>90 дней (3 месяца)</option>
                    <option value={365}>365 дней (1 год)</option>
                    <option value={3650}>3650 дней (Бессрочно)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setBadgeModalUser(null)}
                className="px-5 py-3 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-bold text-sm hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={submitUpdateBadge}
                disabled={isSubmittingBadge}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-primary-600 hover:opacity-90 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                {isSubmittingBadge ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить статус'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail & Inspector Modal */}
      {detailModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-accent-500/20 text-accent-500 flex items-center justify-center font-bold text-xl">
                  {detailModalUser.email[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                    {detailModalUser.display_name || detailModalUser.email}
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-black uppercase bg-accent-500/10 text-accent-500 border border-accent-500/20">
                      {detailModalUser.role || 'client'}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">{detailModalUser.email} • ID: {detailModalUser.id}</p>
                </div>
              </div>

              <button
                onClick={() => setDetailModalUser(null)}
                className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 mb-6 pb-2">
              <button
                onClick={() => setActiveUserDetailTab('profile')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  activeUserDetailTab === 'profile'
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                Профиль и Права
              </button>

              <button
                onClick={() => setActiveUserDetailTab('chats')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  activeUserDetailTab === 'chats'
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Переписки ({userChats.length})
              </button>

              <button
                onClick={() => setActiveUserDetailTab('leads')}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  activeUserDetailTab === 'leads'
                    ? 'bg-accent-500 text-white shadow-md'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                {detailModalUser.role === 'master' ? 'Отклики в маркете' : 'Созданные заявки'}
              </button>
            </div>

            {/* TAB 1: PROFILE & PERMISSIONS */}
            {activeUserDetailTab === 'profile' && (
              <div className="space-y-6">
                
                {/* Role and Status Management */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-4">Управление Ролью и Статусом</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-1">Роль аккаунта</label>
                      <div className="flex gap-2">
                        {['client', 'master', 'admin'].map((r) => (
                          <button
                            key={r}
                            onClick={() => updateUserPermissions(detailModalUser.id, { role: r })}
                            disabled={isUpdatingPermissions}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all border ${
                              detailModalUser.role === r
                                ? 'bg-accent-500 text-white border-accent-500'
                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-1">Подтверждение мастера</label>
                      <button
                        onClick={() => updateUserPermissions(detailModalUser.id, { is_verified_master: !detailModalUser.is_verified_master })}
                        disabled={isUpdatingPermissions}
                        className={`w-full px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all border ${
                          detailModalUser.is_verified_master
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : 'bg-neutral-200/50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500'
                        }`}
                      >
                        <span>{detailModalUser.is_verified_master ? '✓ Верифицирован' : 'Не верифицирован'}</span>
                        <UserCheck className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Access Control Permissions */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-4">Блокировки и Права доступа</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Can Chat Toggle */}
                    <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-accent-500" />
                          Отправка сообщений
                        </div>
                        <p className="text-xs text-neutral-500">Доступ к личным диалогам</p>
                      </div>

                      <button
                        onClick={() => updateUserPermissions(detailModalUser.id, { can_chat: !(detailModalUser.can_chat ?? true) })}
                        disabled={isUpdatingPermissions}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                          (detailModalUser.can_chat ?? true)
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-500 border border-red-500/30'
                        }`}
                      >
                        {(detailModalUser.can_chat ?? true) ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {(detailModalUser.can_chat ?? true) ? 'Разрешено' : 'Заблокировано'}
                      </button>
                    </div>

                    {/* Can Create Leads Toggle */}
                    <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent-500" />
                          Публикация заявок
                        </div>
                        <p className="text-xs text-neutral-500">Доступ к Маркетплейсу</p>
                      </div>

                      <button
                        onClick={() => updateUserPermissions(detailModalUser.id, { can_create_leads: !(detailModalUser.can_create_leads ?? true) })}
                        disabled={isUpdatingPermissions}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                          (detailModalUser.can_create_leads ?? true)
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-500 border border-red-500/30'
                        }`}
                      >
                        {(detailModalUser.can_create_leads ?? true) ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {(detailModalUser.can_create_leads ?? true) ? 'Разрешено' : 'Заблокировано'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Additional Metadata */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Баланс:</span>
                    <strong className="text-amber-400">{detailModalUser.balance} {detailModalUser.currency || 'CZK'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">VIP / PRO Статус:</span>
                    <strong className="text-purple-400">{detailModalUser.badge_tier?.toUpperCase() || 'NONE'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Дата регистрации:</span>
                    <span className="text-neutral-300">{new Date(detailModalUser.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHATS & MESSAGES INSPECTOR */}
            {activeUserDetailTab === 'chats' && (
              <div className="space-y-4">
                {isLoadingUserChats ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-neutral-500">Загрузка переписок...</p>
                  </div>
                ) : userChats.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    У пользователя пока нет активных диалогов.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chat List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {userChats.map((chat) => {
                        const counterpart = chat.client_id === detailModalUser.id ? chat.master : chat.client
                        return (
                          <div
                            key={chat.id}
                            onClick={() => openChatInspector(chat.id, chat.leads?.title || 'Диалог по заявке')}
                            className="p-4 bg-neutral-50 dark:bg-neutral-950 hover:bg-accent-500/10 border border-neutral-200 dark:border-white/5 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div>
                              <h5 className="font-bold text-sm text-neutral-900 dark:text-white">
                                {counterpart?.full_name || counterpart?.email || 'Собеседник'}
                              </h5>
                              <p className="text-xs text-neutral-400 mt-0.5">{chat.leads?.title || 'Заявка'}</p>
                              <span className="text-[10px] text-neutral-500">{new Date(chat.created_at).toLocaleDateString()}</span>
                            </div>
                            <Eye className="w-4 h-4 text-accent-500 shrink-0" />
                          </div>
                        )
                      })}
                    </div>

                    {/* Messages Viewer */}
                    <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-4 flex flex-col h-[400px]">
                      {isLoadingChatMessages ? (
                        <div className="my-auto text-center">
                          <Loader2 className="w-6 h-6 text-accent-500 animate-spin mx-auto mb-2" />
                          <p className="text-xs text-neutral-500">Загрузка сообщений...</p>
                        </div>
                      ) : selectedChatMessages ? (
                        <>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-accent-400 pb-2 border-b border-neutral-200 dark:border-white/5 mb-3">
                            Лог сообщений: {selectedChatTitle}
                          </h4>

                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                            {selectedChatMessages.length === 0 ? (
                              <p className="text-neutral-500 text-center my-auto">Сообщений в этом чате нет.</p>
                            ) : (
                              selectedChatMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`p-3 rounded-2xl max-w-[85%] ${
                                    msg.sender_type === 'master'
                                      ? 'bg-primary-500/10 border border-primary-500/20 text-primary-300 ml-auto'
                                      : 'bg-accent-500/10 border border-accent-500/20 text-accent-300 mr-auto'
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-[10px] opacity-70 mb-1">
                                    <span className="font-bold uppercase">{msg.sender_type}</span>
                                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="my-auto text-center text-xs text-neutral-500">
                          Выберите диалог слева для просмотра всех сообщений
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: LEADS & PROPOSALS */}
            {activeUserDetailTab === 'leads' && (
              <div className="space-y-4">
                {isLoadingUserLeads ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 text-accent-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-neutral-500">Загрузка данных...</p>
                  </div>
                ) : !userLeadsData || userLeadsData.data.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    {detailModalUser.role === 'master' ? 'Мастер пока не отправлял отклики.' : 'Пользователь пока не публиковал заявки.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {userLeadsData.data.map((item: any) => (
                      <div key={item.id} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-sm text-neutral-900 dark:text-white">
                            {userLeadsData.type === 'proposals' ? (item.leads?.title || 'Отклик на заявку') : item.title}
                          </h5>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {userLeadsData.type === 'proposals' ? `Цена предл.: ${item.price_offer} CZK` : `Бюджет: ${item.budget || 'По договоренности'}`}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-accent-500/10 text-accent-400 font-extrabold text-xs rounded-full uppercase">
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
