'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase, Profile } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'

interface AdminUserResponse {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  bio: string | null
  status: string
  credits: int
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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

      // Update local state
      setUsers(currentUsers => 
        currentUsers.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      )

    } catch (err: any) {
      alert(err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Админ-панель</h2>
            <p className="mt-1 text-neutral-500 dark:text-neutral-400">Управление пользователями и заявками</p>
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

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Пользователь</th>
                  <th className="px-6 py-4 font-medium">Дата регистрации</th>
                  <th className="px-6 py-4 font-medium">Статус</th>
                  <th className="px-6 py-4 font-medium text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-neutral-900 dark:text-white">{user.email}</div>
                      <div className="text-neutral-500 dark:text-neutral-400 text-xs mt-1">
                        {user.display_name ? `${user.display_name}` : 'Имя не указано'} 
                        {user.phone && ` • ${user.phone}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'pending' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5" /> На рассмотрении
                        </span>
                      )}
                      {user.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <CheckCircle className="w-3.5 h-3.5" /> Одобрен
                        </span>
                      )}
                      {user.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                          <XCircle className="w-3.5 h-3.5" /> Отклонен
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
                              className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                            >
                              Отклонить
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
                      Нет зарегистрированных пользователей
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
