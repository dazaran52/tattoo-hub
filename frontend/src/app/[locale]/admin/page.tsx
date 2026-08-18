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
import { AdminAppeals } from '@/components/AdminAppeals'
import { supabase, Profile } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Loader2, Plus, Edit2, Trash2, Link as LinkIcon, Search, Coins, Ban, Eye, MessageSquare, Shield, Lock, Unlock, UserCheck, FileText, X, Check, Users, ShieldAlert, Headphones, Database } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'
import toast from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
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
  const language = useLocale()
  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [userRoleTab, setUserRoleTab] = useState<'all' | 'master' | 'client' | 'admin'>('all')
  const [userPage, setUserPage] = useState(1)
  const [userTotalPages, setUserTotalPages] = useState(1)
  const [userTotalCount, setUserTotalCount] = useState(0)
  const [activeGroup, setActiveGroup] = useState<'management' | 'moderation' | 'support' | 'directories'>('management')
  const [activeTab, setActiveTab] = useState<'users' | 'leads' | 'chats' | 'ai-chats' | 'locations' | 'disputes' | 'currencies' | 'appeals' | 'security'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'balance_desc' | 'balance_asc'>('newest')
  const [balanceModalUser, setBalanceModalUser] = useState<{ id: string, email: string, balance: number } | null>(null)
  const [newBalanceValue, setNewBalanceValue] = useState<string>('')
  const [certificateReviewUser, setCertificateReviewUser] = useState<CertificateReviewUser | null>(null)
  
  // Ban Modal State
  const [banModalUser, setBanModalUser] = useState<AdminUserResponse | null>(null)
  const [banReason, setBanReason] = useState('')

  // Global Metrics & Security Feed State
  const [adminStats, setAdminStats] = useState<{ total_masters: number, total_clients: number, active_paid_masters: number, open_leads: number, total_users: number, pending_disputes: number } | null>(null)
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([])
  const [isLoadingSecurityAlerts, setIsLoadingSecurityAlerts] = useState<boolean>(false)

  // Balance Adjust State (1-Click Wallet Adjustment)
  const [adjustAmount, setAdjustAmount] = useState<string>('300')
  const [adjustOperation, setAdjustOperation] = useState<'add' | 'deduct'>('add')
  const [adjustReason, setAdjustReason] = useState<string>(t('key_3c15ec'))
  const [isSubmittingAdjustBalance, setIsSubmittingAdjustBalance] = useState<boolean>(false)

  // Broadcast Modal State
  const [broadcastModalOpen, setBroadcastModalOpen] = useState<boolean>(false)
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'master' | 'client'>('all')
  const [broadcastTitle, setBroadcastTitle] = useState<string>('')
  const [broadcastMessage, setBroadcastMessage] = useState<string>('')
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false)

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
      toast.error(t('key_12c6dd'))
    } finally {
      setIsLoadingChatMessages(false)
    }
  }

  const updateUserPermissions = async (userId: string, permissions: { role?: string, is_verified_master?: boolean, can_chat?: boolean, can_create_leads?: boolean, badge_tier?: string, ban_reason?: string }) => {
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
        throw new Error(err.detail || t('key_7ec775'))
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
      toast.success(t('key_a80be0'))
    } catch (e: any) {
      toast.error(e.message || t('key_f4a46e'))
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
      setDetailModalUser(prev => prev && prev.id === badgeModalUser.id ? { ...prev, badge_tier: selectedBadgeTier } : prev)
      setBadgeModalUser(null)
      alert(`Статус профиля ${selectedBadgeTier.toUpperCase()} успешно установлен!`)
    } catch (err: any) {
      alert(err.message || t('crmBoard.statusUpdateError'))
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

  const fetchAdminStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setAdminStats(data)
      } else {
        setAdminStats({
          total_masters: users.filter(u => u.role === 'master').length,
          total_clients: users.filter(u => u.role === 'client').length,
          active_paid_masters: users.filter(u => u.badge_tier && u.badge_tier !== 'none').length,
          open_leads: 0,
          total_users: users.length || userTotalCount,
          pending_disputes: 0
        })
      }
    } catch (e) {
      console.error('Failed to fetch admin stats:', e)
    }
  }

  const fetchSecurityAlerts = async () => {
    try {
      setIsLoadingSecurityAlerts(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/security-alerts`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSecurityAlerts(data)
      }
    } catch (e) {
      console.error('Failed to fetch security alerts:', e)
    } finally {
      setIsLoadingSecurityAlerts(false)
    }
  }

  const submitAdjustBalance = async (targetUserId: string) => {
    const num = parseFloat(adjustAmount)
    if (isNaN(num) || num <= 0) {
      toast.error(t('key_d98e30'))
      return
    }

    try {
      setIsSubmittingAdjustBalance(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const currentBal = detailModalUser?.id === targetUserId ? (detailModalUser.balance || 0) : (users.find(u => u.id === targetUserId)?.balance || 0)
      const targetBal = adjustOperation === 'add' ? currentBal + num : Math.max(0, currentBal - num)

      let res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${targetUserId}/adjust-balance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: num,
          operation: adjustOperation,
          reason: adjustReason || t('key_fddd1b')
        })
      })

      if (!res.ok) {
        const finalBal = adjustOperation === 'add' ? targetBal + num : Math.max(0, targetBal - num);
        res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${targetUserId}/balance`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            balance: finalBal,
            amount: num,
            operation: adjustOperation,
            reason: adjustReason || t('key_fddd1b')
          })
        })
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t('key_9356f8'))
      }

      const resData = await res.json().catch(() => ({}))
      const finalBal = resData.new_balance !== undefined ? resData.new_balance : targetBal
      toast.success(`Баланс успешно изменен! Новый баланс: ${finalBal} CZK`)

      setUsers(currentUsers =>
        currentUsers.map(u => u.id === targetUserId ? { ...u, balance: finalBal } : u)
      )
      if (detailModalUser && detailModalUser.id === targetUserId) {
        setDetailModalUser({ ...detailModalUser, balance: finalBal })
      }
    } catch (e: any) {
      toast.error(e.message || t('key_435357'))
    } finally {
      setIsSubmittingAdjustBalance(false)
    }
  }

  const submitBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error(t('key_2924ec'))
      return
    }

    try {
      setIsSendingBroadcast(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: broadcastTarget,
          title: broadcastTitle,
          message: broadcastMessage
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t('key_a3c07e'))
      }

      const resData = await res.json()
      toast.success(`📢 Рассылка успешно отправлена! Получателей: ${resData.recipients_count}`)
      setBroadcastModalOpen(false)
      setBroadcastTitle('')
      setBroadcastMessage('')
    } catch (e: any) {
      toast.error(e.message || t('key_70b2e1'))
    } finally {
      setIsSendingBroadcast(false)
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
      await fetchAdminStats()
      await fetchSecurityAlerts()

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




  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.href = '/login'
  }

  const updateUserStatus = async (userId: string, newStatus: string, banReason?: string) => {
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
          body: JSON.stringify({ status: newStatus, ban_reason: banReason })
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
    if (!confirm(t('key_ba74cc'))) return

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
      toast.error(t('key_c4c25f'))
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
          body: JSON.stringify({
            balance: num 
          })
        }
      )

      if (!res.ok) throw new Error('Failed to update balance')

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId ? { ...user, balance: num } : user
        )
      )
      toast.success(t('key_123376'))
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

        {/* Global Admin Metrics Bar */}
        {adminStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">{t('key_b1b2f0')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-neutral-900 dark:text-white">{adminStats.total_users}</span>
                <span className="text-xs text-neutral-400 font-medium">({adminStats.total_masters} {t('key_1eb68c')} {adminStats.total_clients} {t('key_ddc1b9')}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">{t('vipPro3')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-400">{adminStats.active_paid_masters}</span>
                <span className="text-xs text-amber-500/80 font-medium">{t('key_f6e156')}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">{t('key_3e899d')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-300">{adminStats.open_leads}</span>
                <span className="text-xs text-purple-400/80 font-medium">{t('key_f806de')}</span>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
              <button
                onClick={() => setBroadcastModalOpen(true)}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-accent-500 to-primary-600 hover:opacity-95 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-accent-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                {t('key_9b02c5')}
                                            </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Parent Tabs (Groups) */}
        <div className="flex overflow-x-auto gap-2 mb-4 pb-2 no-scrollbar">
          {[
            { id: 'management', label: t('key_6fdd7d'), icon: <Users className="w-4 h-4" /> },
            { id: 'moderation', label: t('key_424b69'), icon: <ShieldAlert className="w-4 h-4" />, hasUnread: securityAlerts.length > 0 || ((adminStats?.pending_disputes || 0) > 0) },
            { id: 'support', label: t('key_662448'), icon: <Headphones className="w-4 h-4" /> },
            { id: 'directories', label: t('key_1e6f7d'), icon: <Database className="w-4 h-4" /> },
          ].map(group => (
            <button
              key={group.id}
              onClick={() => {
                setActiveGroup(group.id as any);
                if (group.id === 'management') setActiveTab('users');
                if (group.id === 'moderation') setActiveTab('security');
                if (group.id === 'support') setActiveTab('chats');
                if (group.id === 'directories') setActiveTab('locations');
              }}
              className={`relative px-5 py-2.5 rounded-2xl font-black text-sm transition-all flex items-center shrink-0 whitespace-nowrap gap-2 border shadow-sm ${
                activeGroup === group.id
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white scale-[1.02]'
                  : 'bg-white/80 dark:bg-neutral-900/80 text-neutral-500 hover:text-neutral-900 dark:hover:text-white border-neutral-200 dark:border-white/10'
              }`}
            >
              {group.icon}
              {group.label}
              {group.hasUnread && (
                <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-neutral-950 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Sub Tabs */}
        <div className="flex bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 p-1.5 rounded-2xl w-max max-w-full overflow-x-auto mb-6 shadow-sm gap-1 no-scrollbar">
          {activeGroup === 'management' && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'users' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('usersManagement')}
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'leads' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('ttl2')}
                                            </button>
            </>
          )}

          {activeGroup === 'moderation' && (
            <>
              <button
                onClick={() => { setActiveTab('security'); fetchSecurityAlerts(); }}
                className={`relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  activeTab === 'security' ? 'bg-red-600 text-white shadow-md shadow-red-500/20 scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4 text-red-400" />
                {t('key_73fb03')}{securityAlerts.length})
                {securityAlerts.length > 0 && (
                  <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('disputes')}
                className={`relative px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'disputes' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('key_0a6011')}
                                              {((adminStats?.pending_disputes || 0) > 0) && (
                  <div className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('appeals')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'appeals' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('key_8407de')}
                                            </button>
            </>
          )}

          {activeGroup === 'support' && (
            <>
              <button
                onClick={() => setActiveTab('chats')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'chats' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('key_662448')}
                                            </button>
              <button
                onClick={() => setActiveTab('ai-chats')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'ai-chats' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('key_5ce92b')}
                                            </button>
            </>
          )}

          {activeGroup === 'directories' && (
            <>
              <button
                onClick={() => setActiveTab('locations')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'locations' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('key_088422')}
                                            </button>
              <button
                onClick={() => setActiveTab('currencies')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  activeTab === 'currencies' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {t('key_9729bf')}
                                            </button>
            </>
          )}
        </div>

        {activeTab === 'leads' && <AdminLeads />}
        {activeTab === 'locations' && <AdminLocations />}
        {activeTab === 'chats' && <AdminChat />}
        {activeTab === 'ai-chats' && <AdminAiChats />}
        {activeTab === 'disputes' && <AdminDisputes />}
        {activeTab === 'appeals' && <AdminAppeals />}
        {activeTab === 'currencies' && <AdminCurrencies />}
        
        {activeTab === 'security' && (
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 rounded-3xl p-6 shadow-xl animate-fade-in-up">
            <div className="flex items-center justify-between mb-6 border-b border-neutral-200/50 dark:border-white/5 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-500" />
                  {t('key_29e406')}
                                                  </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {t('key_b46a68')}
                                                  </p>
              </div>

              <button
                onClick={fetchSecurityAlerts}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {t('key_782ad0')}
                                            </button>
            </div>

            {isLoadingSecurityAlerts ? (
              <div className="py-12 text-center text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                {t('key_5515c2')}
                                            </div>
            ) : securityAlerts.length === 0 ? (
              <div className="py-12 text-center text-neutral-400 font-medium">
                {t('key_8a6b6e')}
                                                </div>
            ) : (
              <div className="space-y-4">
                {securityAlerts.map((alert: any) => (
                  <div key={alert.id} className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white font-black text-[10px] uppercase">
                          🚨 alert
                        </span>
                        <h4 className="font-extrabold text-sm text-neutral-900 dark:text-white">{alert.title}</h4>
                        <span className="text-xs text-neutral-400">
                          {new Date(alert.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 font-medium">{alert.message}</p>
                      {alert.users && (
                        <p className="text-xs text-neutral-400 font-mono">
                          {t('key_c38cc3')} {alert.users.display_name || alert.users.email} ({alert.users.role}{t('key_dab759')} {alert.users.can_chat === false ? t('key_a52b31') : t('key_a3f5b1')}
                        </p>
                      )}
                    </div>

                    {alert.user_id && (
                      <button
                        onClick={() => updateUserPermissions(alert.user_id, { can_chat: true })}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md shrink-0 cursor-pointer"
                      >
                        {t('key_5534b1')}
                                                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                    {role === 'all' ? t('key_984bf1') : role === 'master' ? t('masters') : role === 'client' ? t('crmBoard.tabClients') : t('key_996abc')}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder={t('email6')}
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
                  <option value="newest">{t('key_ea5256')}</option>
                  <option value="oldest">{t('key_6dbbde')}</option>
                  <option value="balance_desc">{t('key_0f0924')}</option>
                  <option value="balance_asc">{t('key_167621')}</option>
                </select>
              </div>
              </div>
            </div>
            <div className="overflow-x-auto w-full pb-4">
              <table className="w-full text-left text-sm min-w-max">
                <thead className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/50 dark:border-white/5 text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('user')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('contacts')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('key_95dcad')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('key_cf55d9')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/50 dark:divide-white/5">
                  {filteredAndSortedUsers.map(user => (
                    <tr key={user.id} onClick={() => openUserDetailModal(user)} className="cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-neutral-900 dark:text-white">{user.email}</div>
                        {user.role && (
                          <div className="text-[10px] font-black uppercase tracking-wider text-accent-600 dark:text-accent-400 mt-1">
                            {user.role}
                          </div>
                        )}
                        <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                          {user.display_name ? `${user.display_name}` : <span className="text-red-500 font-medium text-[10px] uppercase">{t('key_4687b9')}</span>}
                        </div>
                        {user.referred_by && (
                          <div className="text-xs text-neutral-400 mt-1">
                            {t('key_5fddbc')} <span className="font-mono">{user.referred_by}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-500 dark:text-neutral-400">
                        {user.phone && <div className="mb-1">{user.phone}</div>}
                        {user.portfolio_url && (
                          <a href={user.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline font-semibold">
                            <LinkIcon className="w-3 h-3 mr-1" /> {t('portfolio')}
                                                                </a>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                        {(user.role === 'master' || user.is_admin || user.is_verified_master) ? (
                          <div className="font-extrabold text-accent-600 dark:text-accent-400 text-base">
                            {user.balance}
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">-</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                        {(user.role === 'master' || user.is_admin || user.is_verified_master) ? (
                          <div className="font-bold text-neutral-400 text-xs">
                            {user.currency || 'CZK'}
                          </div>
                        ) : (
                          <div className="text-xs text-neutral-400 dark:text-neutral-500 font-medium">-</div>
                        )}
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
                            <XCircle className="w-3.5 h-3.5" /> Banned
                          </span>
                        )}
                        {user.role === 'master' && (
                          <div className="mt-2 text-[11px] font-bold text-neutral-500">
                            {t('key_228f68')} {
                              user.certificate_status === 'approved' ? t('key_e0359d') :
                              user.certificate_status === 'pending' ? t('key_7cf593') :
                              user.certificate_status === 'rejected' ? t('key_d70625') : t('key_8b1ea7')
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
                            {user.role === 'master' && user.certificate_status === 'pending' && user.certificate_url && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setCertificateReviewUser(user); }}
                                className="px-3.5 py-2 bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 rounded-xl text-xs font-bold hover:bg-primary-500/20 transition-all"
                              >
                                {t('key_e12882')}
                                                                                </button>
                            )}

                            {user.status === 'approved' && (
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const isRestricting = user.can_chat ?? true;
                                  let reason = undefined;
                                  if (isRestricting) {
                                    reason = prompt(t('banSystem.promptBanReason') || 'Укажите причину ограничения:');
                                    if (reason === null) return;
                                  }
                                  updateUserPermissions(user.id, { can_chat: !isRestricting, ban_reason: reason || undefined }); 
                                }}
                                className={`px-3.5 py-2 border rounded-xl text-xs font-bold transition-all flex items-center ${
                                  (user.can_chat ?? true)
                                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}
                                title={(user.can_chat ?? true) ? t('key_215f2d') : t('key_c7eb57')}
                              >
                                {(user.can_chat ?? true) ? <Lock className="w-3.5 h-3.5 mr-1" /> : <Unlock className="w-3.5 h-3.5 mr-1" />}
                                {t('key_c52b4c')}
                                                                                </button>
                            )}

                            {(user.role === 'master' || user.role === 'client') && user.status === 'approved' && (
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const isRestricting = user.can_create_leads ?? true;
                                  let reason = undefined;
                                  if (isRestricting) {
                                    reason = prompt(t('banSystem.promptBanReason') || 'Укажите причину ограничения:');
                                    if (reason === null) return;
                                  }
                                  updateUserPermissions(user.id, { can_create_leads: !isRestricting, ban_reason: reason || undefined }); 
                                }}
                                className={`px-3.5 py-2 border rounded-xl text-xs font-bold transition-all flex items-center ${
                                  (user.can_create_leads ?? true)
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}
                                title={(user.can_create_leads ?? true) ? t('key_f800c0') : t('key_b2552f')}
                              >
                                {(user.can_create_leads ?? true) ? <Lock className="w-3.5 h-3.5 mr-1" /> : <Unlock className="w-3.5 h-3.5 mr-1" />}
                                {t('marketplace')}
                                                                                </button>
                            )}
                            
                            {user.status === 'pending' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateUserStatus(user.id, 'approved'); }}
                                className="px-3.5 py-2 bg-emerald-500/10 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all"
                              >
                                {t('key_8df353')}
                                                                                </button>
                            )}
                            {user.status === 'rejected' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateUserStatus(user.id, 'pending'); }}
                                className="px-3.5 py-2 bg-neutral-500/10 dark:bg-neutral-900/20 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20 rounded-xl text-xs font-bold hover:bg-neutral-500/20 transition-all"
                              >
                                {t('key_9c8502')}
                                                                                </button>
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); setBanModalUser(user); setBanReason(''); }}
                                className="px-3.5 py-2 bg-red-500/10 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1"
                              >
                                {t('key_6875d8')}
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
                          title={t('key_c01aee')}
                          description={t('key_7553bc')}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200/50 dark:border-white/5 bg-neutral-50/30 dark:bg-neutral-900/20">
                <div className="text-sm text-neutral-500 font-medium">
                  {t('key_2dc772')} {userTotalCount}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 transition-all"
                  >
                    {t('key_ed5d96')}
                                                        </button>
                  <span className="px-3 py-1.5 text-sm font-semibold">
                    {userPage} / {userTotalPages}
                  </span>
                  <button 
                    onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                    disabled={userPage === userTotalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 disabled:opacity-50 transition-all"
                  >
                    {t('key_03d65e')}
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
          <div className="bg-white/85 dark:bg-neutral-900/85 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200 p-6 border border-neutral-200/50 dark:border-white/5">
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-1">{t('key_b1d275')}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5 font-semibold">{balanceModalUser.email}</p>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-400 mb-2">{t('key_27f502')}</label>
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
                {t('cancel')}
                                            </button>
              <button
                onClick={submitUpdateCredits}
                className="px-5 py-3 bg-accent-600 hover:bg-accent-500 text-white font-bold rounded-xl transition-all shadow-md shadow-accent-600/20"
              >
                {t('save')}
                                            </button>
            </div>
          </div>
        </div>
      )}

      {badgeModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setBadgeModalUser(null)}>
          <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl w-full max-w-md rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] p-6 border border-neutral-200/50 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-1">{t('proVip')}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 font-semibold">{badgeModalUser.email}</p>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">{t('key_ec679a')}</label>
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
                    {t('key_f4b7bd')}
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
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-2">{t('key_4924e4')}</label>
                  <select
                    value={selectedDurationDays}
                    onChange={(e) => setSelectedDurationDays(Number(e.target.value))}
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white outline-none focus:border-amber-500"
                  >
                    <option value={7}>{t('7')}</option>
                    <option value={30}>{t('301')}</option>
                    <option value={90}>{t('903')}</option>
                    <option value={365}>{t('3651')}</option>
                    <option value={3650}>{t('3650')}</option>
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
                {t('cancel')}
                                            </button>
              <button
                type="button"
                onClick={submitUpdateBadge}
                disabled={isSubmittingBadge}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-primary-600 hover:opacity-90 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                {isSubmittingBadge ? <Loader2 className="w-4 h-4 animate-spin" /> : t('key_9f4b3e')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail & Inspector Modal */}
      {detailModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setDetailModalUser(null)}>
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            
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
                {t('key_4d8185')}
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
                {t('key_bad7f8')}{userChats.length})
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
                {detailModalUser.role === 'master' ? t('key_9034a0') : t('key_dc6c84')}
              </button>
            </div>

            {/* TAB 1: PROFILE & PERMISSIONS */}
            {activeUserDetailTab === 'profile' && (
              <div className="space-y-6">
                
                {/* Role and Status Management */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-4">{t('key_a036dd')}</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_b5c099')}</label>
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
                      <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_68012d')}</label>
                      <button
                        onClick={() => updateUserPermissions(detailModalUser.id, { is_verified_master: !detailModalUser.is_verified_master })}
                        disabled={isUpdatingPermissions}
                        className={`w-full px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all border ${
                          detailModalUser.is_verified_master
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                            : 'bg-neutral-200/50 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-500'
                        }`}
                      >
                        <span>{detailModalUser.is_verified_master ? t('key_f87ad1') : t('key_747075')}</span>
                        <UserCheck className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-400 mb-1">{t('vipPro2')}</label>
                      <button
                        onClick={() => handleOpenBadgeModal(detailModalUser)}
                        className="w-full px-4 py-2 rounded-xl text-xs font-extrabold flex items-center justify-between transition-all border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      >
                        <span className="uppercase">{detailModalUser.badge_tier && detailModalUser.badge_tier !== 'none' ? `⭐ ${detailModalUser.badge_tier}` : t('none')}</span>
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Access Control Permissions */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-4">{t('key_9bcdcb')}</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Can Chat Toggle */}
                    <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-accent-500" />
                          {t('key_d4670b')}
                                                                          </div>
                        <p className="text-xs text-neutral-500">{t('key_b11d45')}</p>
                      </div>

                      <button
                        onClick={() => {
                          const isRestricting = detailModalUser.can_chat ?? true;
                          let reason = undefined;
                          if (isRestricting) {
                            reason = prompt(t('banSystem.promptBanReason') || 'Укажите причину ограничения:');
                            if (reason === null) return;
                          }
                          updateUserPermissions(detailModalUser.id, { can_chat: !isRestricting, ban_reason: reason || undefined });
                        }}
                        disabled={isUpdatingPermissions}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                          (detailModalUser.can_chat ?? true)
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-500 border border-red-500/30'
                        }`}
                      >
                        {(detailModalUser.can_chat ?? true) ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {(detailModalUser.can_chat ?? true) ? t('key_f6be50') : t('key_06d1f5')}
                      </button>
                    </div>

                    {/* Can Create Leads Toggle */}
                    <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent-500" />
                          {t('key_22ae66')}
                                                                          </div>
                        <p className="text-xs text-neutral-500">{t('key_b5dbe0')}</p>
                      </div>

                      <button
                        onClick={() => {
                          const isRestricting = detailModalUser.can_create_leads ?? true;
                          let reason = undefined;
                          if (isRestricting) {
                            reason = prompt(t('banSystem.promptBanReason') || 'Укажите причину ограничения:');
                            if (reason === null) return;
                          }
                          updateUserPermissions(detailModalUser.id, { can_create_leads: !isRestricting, ban_reason: reason || undefined });
                        }}
                        disabled={isUpdatingPermissions}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ${
                          (detailModalUser.can_create_leads ?? true)
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                            : 'bg-red-500/10 text-red-500 border border-red-500/30'
                        }`}
                      >
                        {(detailModalUser.can_create_leads ?? true) ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        {(detailModalUser.can_create_leads ?? true) ? t('key_f6be50') : t('key_06d1f5')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Direct Wallet Balance Adjustment Section */}
                {(detailModalUser.role === 'master' || detailModalUser.is_admin || detailModalUser.is_verified_master) && (
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5 mt-6">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 mb-4 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-400" />
                    {t('key_efdc6d')}
                                                            </h4>

                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/5 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-400 font-medium">{t('key_2d27a7')}</span>
                      <strong className="text-base font-black text-amber-400">
                        {detailModalUser.balance || 0} {detailModalUser.currency || 'CZK'}
                      </strong>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_b48047')}</label>
                        <select
                          value={adjustOperation}
                          onChange={(e: any) => setAdjustOperation(e.target.value)}
                          className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold"
                        >
                          <option value="add">{t('key_d96a1e')}</option>
                          <option value="deduct">{t('key_1da33e')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_2980dd')}{detailModalUser.currency || 'CZK'})</label>
                        <input
                          type="number"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          placeholder="300"
                          className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_d88300')}</label>
                        <input
                          type="text"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder={t('key_50cf81')}
                          className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-medium"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => submitAdjustBalance(detailModalUser.id)}
                      disabled={isSubmittingAdjustBalance}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAdjustBalance ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>{t('key_d31c35')}</span>
                      )}
                    </button>
                  </div>
                </div>
                )}

                {/* Additional Metadata */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl p-5 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('key_660c7f')}</span>
                    <strong className="text-amber-400">{detailModalUser.balance} {detailModalUser.currency || 'CZK'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('vipPro')}</span>
                    <strong className="text-purple-400">{detailModalUser.badge_tier?.toUpperCase() || 'NONE'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('key_843f22')}</span>
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
                    <p className="text-xs text-neutral-500">{t('key_7bdc38')}</p>
                  </div>
                ) : userChats.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    {t('key_91cf5a')}
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
                            onClick={() => openChatInspector(chat.id, chat.leads?.title || t('key_5390af'))}
                            className="p-4 bg-neutral-50 dark:bg-neutral-950 hover:bg-accent-500/10 border border-neutral-200 dark:border-white/5 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div>
                              <h5 className="font-bold text-sm text-neutral-900 dark:text-white">
                                {counterpart?.full_name || counterpart?.email || t('key_702520')}
                              </h5>
                              <p className="text-xs text-neutral-400 mt-0.5">{chat.leads?.title || t('key_e1149a')}</p>
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
                          <p className="text-xs text-neutral-500">{t('key_c69b6d')}</p>
                        </div>
                      ) : selectedChatMessages ? (
                        <>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-accent-400 pb-2 border-b border-neutral-200 dark:border-white/5 mb-3">
                            {t('key_af4181')} {selectedChatTitle}
                          </h4>

                          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                            {selectedChatMessages.length === 0 ? (
                              <p className="text-neutral-500 text-center my-auto">{t('key_ed1b32')}</p>
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
                          {t('key_ec0c5f')}
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
                    <p className="text-xs text-neutral-500">{t('key_6e6c24')}</p>
                  </div>
                ) : !userLeadsData || userLeadsData.data.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 text-sm">
                    {detailModalUser.role === 'master' ? t('key_eb4d0b') : t('key_eeefbd')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                    {userLeadsData.data.map((item: any) => (
                      <div key={item.id} className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-white/5 rounded-2xl flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-sm text-neutral-900 dark:text-white">
                            {userLeadsData.type === 'proposals' ? (item.leads?.title || t('key_0247b1')) : item.title}
                          </h5>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            {userLeadsData.type === 'proposals' ? `Цена предл.: ${item.price_offer} CZK` : `Бюджет: ${item.budget || t('key_bea4da')}`}
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

      {/* Global Broadcast Modal */}
      {broadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/10 pb-4">
              <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent-500" />
                {t('key_9b02c5')}
                                            </h3>
              <button
                onClick={() => setBroadcastModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_9d5d51')}</label>
                <select
                  value={broadcastTarget}
                  onChange={(e: any) => setBroadcastTarget(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-bold text-neutral-900 dark:text-white"
                >
                  <option value="all">{t('key_c7cab7')}</option>
                  <option value="master">{t('key_180c21')}</option>
                  <option value="client">{t('key_a6d2a4')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_e5c41e')}</label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder={t('key_59af1d')}
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-400 mb-1">{t('key_2c476e')}</label>
                <textarea
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder={t('102')}
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setBroadcastModalOpen(false)}
                className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                {t('cancel')}
                                            </button>
              <button
                type="button"
                onClick={submitBroadcast}
                disabled={isSendingBroadcast}
                className="px-6 py-2.5 bg-gradient-to-r from-accent-500 to-primary-600 hover:opacity-90 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-accent-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingBroadcast ? <Loader2 className="w-4 h-4 animate-spin" /> : t('key_ccbbcd')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-500" />
              {t('key_4ce484')}
                                      </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
              {t('key_210159')} <span className="font-bold text-neutral-900 dark:text-white">{banModalUser.email}</span>{t('key_e3c090')}
                                      </p>

            <div className="mb-6">
              <label className="block text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">{t('key_85b385')}</label>
              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder={t('key_beb72a')}
                className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setBanModalUser(null); setBanReason(''); }}
                className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold text-xs cursor-pointer hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                {t('cancel')}
                                            </button>
              <button
                onClick={async () => {
                  if (!banReason.trim()) {
                    toast.error(t('key_cf4f9d'));
                    return;
                  }
                  await updateUserStatus(banModalUser.id, 'rejected', banReason);
                  setBanModalUser(null);
                  setBanReason('');
                  toast.success(t('key_3662d0'));
                }}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                {t('key_7d5c86')}
                                            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
