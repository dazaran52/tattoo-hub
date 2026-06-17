'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { AdminChat } from '@/components/AdminChat'
import { AdminAiChats } from '@/components/AdminAiChats'
import { AdminLocations } from '@/components/AdminLocations'
import { AdminDisputes } from '@/components/AdminDisputes'
import { AdminWithdrawals } from '@/components/AdminWithdrawals'
import { supabase, Profile } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Loader2, Plus, Edit2, Trash2, Link as LinkIcon, Search, Coins, Ban } from 'lucide-react'
import { getTranslation, Language } from '@/lib/i18n'
import toast from 'react-hot-toast'

interface AdminUserResponse {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  bio: string | null
  status: string
  balance: number
  created_at: string
  portfolio_url?: string
  own_referral_code?: string
  referred_by?: string
}



export default function AdminPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<string>('cs')
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'ai-chats' | 'locations' | 'disputes' | 'withdrawals'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'balance_desc' | 'balance_asc'>('newest')
  const [balanceModalUser, setBalanceModalUser] = useState<{ id: string, email: string, balance: number } | null>(null)
  const [newBalanceValue, setNewBalanceValue] = useState<string>('')


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

      // 2. Fetch users for admin panel
      const usersRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!usersRes.ok) throw new Error('Failed to fetch users')
      const usersData = await usersRes.json()
      setUsers(usersData)

    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('language') || 'cs'
      setLanguage(savedLang)
    }
  }, [])

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

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      )
      toast.success(`User status updated to ${newStatus}`)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleUpdateCredits = (userId: string, currentBalance: number, userEmail: string) => {
    setBalanceModalUser({ id: userId, email: userEmail, balance: currentBalance })
    setNewBalanceValue(currentBalance.toString())
  }

  const submitUpdateCredits = async () => {
    if (!balanceModalUser) return
    const num = parseInt(newBalanceValue)
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
          body: JSON.stringify({ credits: num })
        }
      )

      if (!res.ok) throw new Error('Failed to update balance')

      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId ? { ...user, credits: num } : user
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
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 h-96 animate-pulse" />
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
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
      </div>

      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">Admin Panel</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 font-medium">Manage users and leads</p>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-xl font-bold text-sm border border-purple-200 dark:border-purple-800/50 shadow-sm">
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
            onClick={() => setActiveTab('withdrawals')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'withdrawals' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 shadow-md scale-[1.02]' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Выводы
          </button>
        </div>

        {activeTab === 'locations' && <AdminLocations />}
        {activeTab === 'chats' && <AdminChat />}
        {activeTab === 'ai-chats' && <AdminAiChats />}
        {activeTab === 'disputes' && <AdminDisputes />}
        {activeTab === 'withdrawals' && <AdminWithdrawals />}
        
        {activeTab === 'users' && (
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl animate-fade-in-up">
            <div className="p-4 border-b border-neutral-200/50 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Поиск по email или имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                />
              </div>
              <div className="w-full sm:w-auto">
                <select
                  value={sortOrder}
                  onChange={(e: any) => setSortOrder(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white/60 dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/10 rounded-xl text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 font-semibold cursor-pointer transition-all shadow-sm"
                >
                  <option value="newest">Сначала новые</option>
                  <option value="oldest">Сначала старые</option>
                  <option value="balance_desc">Баланс (убыв)</option>
                  <option value="balance_asc">Баланс (возр)</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/50 dark:border-white/5 text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('user')}</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Баланс</th>
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
                        <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                          {user.display_name ? `${user.display_name}` : 'No Name'} 
                          {user.phone && ` • ${user.phone}`}
                          {user.portfolio_url && (
                            <a href={user.portfolio_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline font-semibold">
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
                      <td className="px-6 py-4 font-semibold text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                          <Coins className="w-4 h-4" />
                          {user.balance}
                        </div>
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
                      </td>
                      <td className="px-6 py-4 text-right">
                        {actionLoadingId === user.id ? (
                          <div className="flex justify-end">
                            <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateCredits(user.id, user.balance, user.email)}
                              className="px-3.5 py-2 bg-neutral-200/50 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all shadow-sm"
                              title="Изменить баланс"
                            >
                              Баланс
                            </button>
                            {user.status !== 'approved' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'approved')}
                                className="px-3.5 py-2 bg-green-500/10 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-500/20 rounded-xl text-xs font-bold hover:bg-green-500/20 transition-all"
                              >
                                Одобрить
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
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400 font-medium">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

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
                className="w-full bg-white/40 dark:bg-neutral-950/40 text-neutral-900 dark:text-white border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
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
                className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-600/20"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
