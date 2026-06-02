'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/supabase'
import { api } from '@/lib/api'
import { Loader2, TrendingUp, ShoppingCart, Activity } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts'

interface AnalyticsData {
  total_spent_credits: number
  total_leads_bought: number
  activity_by_day: Array<{
    date: string
    spent: number
    bought: number
  }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Load profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
        
      if (profileData) {
        setProfile(profileData as Profile)
      }

      // Load analytics
      const analyticsData = await api.getAnalytics()
      setAnalytics(analyticsData)
    } catch (err) {
      console.error('Failed to load analytics', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading || !profile || !analytics) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Header profile={profile} onLogout={handleLogout} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Аналитика</h1>
          <p className="text-neutral-500 dark:text-neutral-400">
            Статистика покупок и ваша активность на платформе
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/40 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Потрачено кредитов</p>
                <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1">
                  {analytics.total_spent_credits}
                </h3>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl" />
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm relative overflow-hidden">
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">Куплено лидов</p>
                <h3 className="text-3xl font-black text-neutral-900 dark:text-white mt-1">
                  {analytics.total_leads_bought}
                </h3>
              </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm mb-8">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-neutral-400" />
            Активность (последние 30 дней)
          </h3>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.activity_by_day} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBought" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => {
                    const d = new Date(val)
                    return `${d.getDate()}.${d.getMonth() + 1}`
                  }}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#888', marginBottom: '4px' }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" name="Потрачено кредитов" dataKey="spent" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorSpent)" />
                <Area yAxisId="right" type="step" name="Куплено лидов" dataKey="bought" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorBought)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  )
}
