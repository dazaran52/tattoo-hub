'use client'
import { useTranslations } from "next-intl";


import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { ShieldAlert, RefreshCw, CheckCircle, Trash2, User, Globe, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Lead {
  id: string
  title: string
  description: string
  contacts: string
  base_unlock_price_eur: number
  image_urls?: string[]
  status: string
  is_personal?: boolean
  assigned_master_id?: string
  timer_start_at?: string
  created_at: string
}

export function AdminLeads() {
    const t = useTranslations();
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('moderation')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const url = new URL(`${apiUrl}/api/admin/leads`)
      if (statusFilter && statusFilter !== 'all') {
        url.searchParams.set('status_filter', statusFilter)
      }
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch leads')
      const data = await res.json()
      setLeads(data || [])
    } catch (e: any) {
      toast.error(t('errorLoadingApplications') + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [statusFilter])

  const handleUpdateLead = async (leadId: string, updates: Partial<Lead>, successMessage: string) => {
    setActionLoading(leadId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/admin/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      })
      if (!res.ok) throw new Error('Failed to update lead')
      toast.success(successMessage)
      fetchLeads()
    } catch (e: any) {
      toast.error(t('error2') + e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm(t('areYouSureYou'))) return
    setActionLoading(leadId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No active session')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/admin/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      if (!res.ok) throw new Error('Failed to delete lead')
      toast.success(t('applicationDeleted'))
      setLeads(leads.filter(l => l.id !== leadId))
    } catch (e: any) {
      toast.error(t('uninstallError') + e.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            {t('ttl')}
                                </h3>
          <p className="text-xs text-neutral-500 mt-1">
            {t('requestsThatRequireAdministrator')}
                                </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg text-xs font-semibold text-neutral-800 dark:text-neutral-200"
          >
            <option value="moderation">{t('moderation')}</option>
            <option value="new">{t('new2')}</option>
            <option value="accepted">{t('accepted')}</option>
            <option value="expired">{t('expired2')}</option>
            <option value="all">{t('allStatuses')}</option>
          </select>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="p-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className={`w-4 h-4 text-neutral-600 dark:text-neutral-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-80" />
          <h4 className="text-base font-bold text-neutral-700 dark:text-neutral-300">{t('thereAreNoApplications')}</h4>
          <p className="text-xs text-neutral-500 mt-1">{t('allRequestsHaveBeen')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {lead.status === 'moderation' && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider">
                  {t('requiresModeration')}
                                          </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-neutral-400">ID: {lead.id.slice(0, 8)}...</span>
                  {lead.is_personal ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <User className="w-3 h-3" /> {t('personalBusinessCard')}
                                                      </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Globe className="w-3 h-3" /> {t('marketplace')}
                                                          </span>
                  )}
                </div>

                <h4 className="font-bold text-base text-neutral-900 dark:text-white mb-1 line-clamp-1">{t('application')}{lead.id.substring(0, 6)}</h4>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">{lead.description?.replace(/\s*(Бюджет|Город):.*?(?=(\n|$))/gi, '')}</p>

                <div className="bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-800 space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('status')}</span>
                    <span className="font-bold capitalize text-neutral-800 dark:text-neutral-200">{lead.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('id')}</span>
                    <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                      {lead.assigned_master_id ? lead.assigned_master_id.slice(0, 8) + '...' : t('notAssigned')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {t('startTimer')}</span>
                    <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                      {lead.timer_start_at ? new Date(lead.timer_start_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-3 flex flex-col gap-2">
                {lead.status === 'moderation' && (
                  <>
                    <button
                      onClick={() => handleUpdateLead(lead.id, { assigned_master_id: undefined, is_personal: false, status: 'new' }, t('theApplicationIsPosted'))}
                      disabled={actionLoading === lead.id}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Globe className="w-3.5 h-3.5" /> {t('toTheGeneralMarketplace')}
                                                      </button>

                    <button
                      onClick={() => handleUpdateLead(lead.id, { status: 'new' }, t('theTimerIsReset'))}
                      disabled={actionLoading === lead.id}
                      className="w-full bg-neutral-800 dark:bg-neutral-200 hover:bg-neutral-700 dark:hover:bg-white text-white dark:text-neutral-900 font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {t('new')}
                                                      </button>
                  </>
                )}

                {lead.status !== 'expired' && (
                  <button
                    onClick={() => handleUpdateLead(lead.id, { status: 'expired' }, t('applicationMarkedAsExpired'))}
                    disabled={actionLoading === lead.id}
                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> {t('expired')}
                                                </button>
                )}

                <button
                  onClick={() => handleDeleteLead(lead.id)}
                  disabled={actionLoading === lead.id}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('deletePermanently')}
                                          </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
