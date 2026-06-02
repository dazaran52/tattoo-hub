'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { AdminChat } from '@/components/AdminChat'
import { AdminLocations } from '@/components/AdminLocations'
import { AdminDisputes } from '@/components/AdminDisputes'
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
  credits: number
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
  const [activeTab, setActiveTab] = useState<'users' | 'chats' | 'locations' | 'disputes'>('users')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'balance_desc' | 'balance_asc'>('newest')


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

  const handleUpdateCredits = async (userId: string, currentCredits: number) => {
    const amount = prompt('Введите новый баланс для пользователя:', currentCredits.toString())
    if (amount === null) return
    const num = parseInt(amount)
    if (isNaN(num) || num < 0) {
      toast.error('Неверная сумма')
      return
    }

    try {
      setActionLoadingId(userId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/users/${userId}/credits`,
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
      toast.success('Баланс обновлен')
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
      if (sortOrder === 'balance_desc') return b.credits - a.credits
      if (sortOrder === 'balance_asc') return a.credits - b.credits
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Admin Panel</h2>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">Manage users and leads</p>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg font-medium text-sm border border-purple-200 dark:border-purple-800/50">
            Admin Access
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'users' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t('usersManagement')}
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'chats' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Поддержка
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'disputes' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Жалобы
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
              activeTab === 'locations' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Локации
          </button>
        </div>

        {activeTab === 'locations' && <AdminLocations />}
        {activeTab === 'chats' && <AdminChat />}
        {activeTab === 'disputes' && <AdminDisputes />}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm animate-fade-in-up">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Поиск по email или имени..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
                />
              </div>
              <div className="w-full sm:w-auto">
                <select
                  value={sortOrder}
                  onChange={(e: any) => setSortOrder(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
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
                <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <tr>
                    <th className="px-6 py-4 font-medium">{t('user')}</th>
                    <th className="px-6 py-4 font-medium">Баланс</th>
                    <th className="px-6 py-4 font-medium">{t('created')}</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredAndSortedUsers.map(user => (
                    <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-neutral-900 dark:text-white">{user.email}</div>
                        <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                          {user.display_name ? `${user.display_name}` : 'No Name'} 
                          {user.phone && ` • ${user.phone}`}
                          {user.portfolio_url && (
                            <a href={user.portfolio_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-purple-600 dark:text-purple-400 hover:underline">
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
                      <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-4 h-4 text-cyan-500" />
                          {user.credits}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {user.status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
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
                              onClick={() => handleUpdateCredits(user.id, user.credits)}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-medium transition-colors"
                              title="Изменить баланс"
                            >
                              Баланс
                            </button>
                            {user.status !== 'approved' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'approved')}
                                className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                              >
                                Одобрить
                              </button>
                            )}
                            {user.status !== 'rejected' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'rejected')}
                                className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1"
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
                      <td colSpan={4} className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400">
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
    </div>
  )
}
