'use client'
import { useTranslations } from "next-intl";


import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, XCircle, Clock, Search, Loader2 } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import toast from 'react-hot-toast'

interface BanAppeal {
  id: string
  user_id: string
  appeal_text: string
  status: 'pending' | 'approved' | 'rejected'
  admin_response: string | null
  created_at: string
  users: {
    email: string
    display_name: string | null
    role: string
    status: string
  }
}

export function AdminAppeals() {
    const t = useTranslations();
  const [appeals, setAppeals] = useState<BanAppeal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  
  // Modal State
  const [activeAppeal, setActiveAppeal] = useState<BanAppeal | null>(null)
  const [adminNotes, setAdminNotes] = useState('')

  const fetchAppeals = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/appeals`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setAppeals(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAppeals()
  }, [])

  const updateAppealStatus = async (appealId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      setActionId(appealId)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/appeals/${appealId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, admin_response: notes })
      })

      if (res.ok) {
        setAppeals(prev => prev.map(a => a.id === appealId ? { ...a, status, admin_response: notes || null } : a))
        toast.success(status === 'approved' ? t('key_a96029') : t('key_33dd38'))
        setActiveAppeal(null)
      } else {
        const err = await res.json()
        throw new Error(err.detail)
      }
    } catch (e: any) {
      toast.error(e.message || t('crmBoard.statusUpdateError'))
    } finally {
      setActionId(null)
    }
  }

  const openAppealModal = (appeal: BanAppeal) => {
    setActiveAppeal(appeal)
    setAdminNotes(appeal.admin_response || '')
  }

  if (isLoading) {
    return (
      <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md rounded-3xl p-8 flex justify-center items-center h-64 border border-neutral-200/50 dark:border-white/5 shadow-xl">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 rounded-3xl overflow-hidden shadow-xl animate-fade-in-up">
      <div className="p-6 border-b border-neutral-200/50 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/30">
        <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-1">{t('key_300d9d')}</h3>
        <p className="text-xs text-neutral-500 font-medium">{t('key_dea747')}</p>
      </div>

      <div className="overflow-x-auto w-full pb-4">
        <table className="w-full text-left text-sm min-w-max">
          <thead className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-200/50 dark:border-white/5 text-neutral-600 dark:text-neutral-400">
            <tr>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('user')}</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('key_5481bf')}</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">{t('crmBoard.list.statusColumn')}</th>
              <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/50 dark:divide-white/5">
            {appeals.map(appeal => (
              <tr key={appeal.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-neutral-900 dark:text-white">{appeal.users?.email}</div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {appeal.users?.display_name || t('leadWizard.noNameDefault')} • <span className="uppercase text-accent-500 font-bold">{appeal.users?.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-neutral-500 dark:text-neutral-400">
                  {new Date(appeal.created_at).toLocaleDateString()} {t('leadWizard.atTime')} {new Date(appeal.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </td>
                <td className="px-6 py-4">
                  {appeal.status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
                      <Clock className="w-3.5 h-3.5" /> {t('key_4278b3')}
                                                    </span>
                  )}
                  {appeal.status === 'approved' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100/50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200/50 dark:border-green-500/20">
                      <CheckCircle className="w-3.5 h-3.5" /> {t('key_10e16f')}
                                                    </span>
                  )}
                  {appeal.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100/50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-500/20">
                      <XCircle className="w-3.5 h-3.5" /> {t('key_22c9a6')}
                                                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openAppealModal(appeal)}
                    className="px-4 py-2 bg-neutral-200/50 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {appeal.status === 'pending' ? t('key_0d62e1') : t('key_76e2a8')}
                  </button>
                </td>
              </tr>
            ))}
            {appeals.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8">
                  <EmptyState
                    variant="compact"
                    icon={<Search className="w-7 h-7" />}
                    title={t('key_5dbce7')}
                    description={t('key_4f711b')}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {activeAppeal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-4">
              {t('key_8a220f')} {activeAppeal.users?.email}
            </h3>
            
            <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-6">
              <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">{t('key_7fab12')}</label>
              <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                {activeAppeal.appeal_text}
              </p>
            </div>

            {activeAppeal.status === 'pending' ? (
              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">{t('key_51ef0f')}</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t('key_598f2e')}
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-neutral-900 dark:text-white"
                />
              </div>
            ) : (
              activeAppeal.admin_response && (
                <div className="mb-6">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-400 mb-2">{t('key_9f78eb')}</label>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">"{activeAppeal.admin_response}"</p>
                </div>
              )
            )}

            <div className="flex gap-3 justify-end pt-4 border-t border-neutral-200 dark:border-white/10">
              <button
                onClick={() => setActiveAppeal(null)}
                className="px-5 py-2.5 bg-neutral-200/50 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold text-xs hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                {t('key_dd9463')}
                                            </button>
              {activeAppeal.status === 'pending' && (
                <>
                  <button
                    onClick={() => updateAppealStatus(activeAppeal.id, 'rejected', adminNotes)}
                    disabled={actionId === activeAppeal.id}
                    className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 border border-red-500/20 rounded-xl font-bold text-xs transition-colors flex items-center gap-2"
                  >
                    {actionId === activeAppeal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('key_52ff8d')}
                  </button>
                  <button
                    onClick={() => updateAppealStatus(activeAppeal.id, 'approved', adminNotes)}
                    disabled={actionId === activeAppeal.id}
                    className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                  >
                    {actionId === activeAppeal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : t('key_9c8502')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
