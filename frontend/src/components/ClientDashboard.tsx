'use client'

import { useState, useEffect } from 'react'
import { Profile, supabase } from '@/lib/supabase'
import { PlusCircle, Heart, Clock, X, MoreVertical, Edit2, Pause, Play, Trash2 } from 'lucide-react'
import { LeadForm } from '@/components/LeadForm'
import { useLanguage } from '@/i18n/LanguageContext'

export function ClientDashboard({ profile }: { profile: Profile }) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'leads' | 'favorites'>('leads')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [editingLead, setEditingLead] = useState<any>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handlePauseResume = async (leadId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'open' ? 'archived' : 'open'
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
        import('react-hot-toast').then(mod => mod.default.success(t('success') || 'Success'))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm(t('confirmDeleteLead') || 'Are you sure?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (res.ok) {
        setLeads(leads.filter(l => l.id !== leadId))
        import('react-hot-toast').then(mod => mod.default.success(t('leadDeleted') || 'Deleted'))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('pending_lead')) {
      const pendingLeadStr = localStorage.getItem('pending_lead')
      if (pendingLeadStr) {
        try {
          const pendingLead = JSON.parse(pendingLeadStr)
          
          // Auto submit the pending lead
          const autoSubmit = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            const payload = {
              description: pendingLead.description,
              size: pendingLead.size,
              client_priority: pendingLead.priority,
              budget: 'Договорная цена',
              budget_val: 5000,
              budget_currency: 'CZK',
              is_negotiable_budget: true,
              contact: session.user.email,
              name: session.user.email?.split('@')[0] || 'Клиент'
            }

            try {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
              })

              if (res.ok) {
                localStorage.removeItem('pending_lead')
                // Refresh leads
                fetchLeads()
                import('react-hot-toast').then(mod => mod.default.success('Твоя быстрая заявка успешно опубликована!'))
              } else {
                // If it fails, open the form so they can fix it
                setIsFormOpen(true)
              }
            } catch (e) {
              console.error('Auto submit failed', e)
              setIsFormOpen(true)
            }
          }
          autoSubmit()
        } catch (e) {
          setIsFormOpen(true)
        }
      }
    }

    async function fetchLeads() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) throw new Error('Failed to fetch leads')

        const data = await response.json()
        setLeads(data)
      } catch (err) {
        console.error('Error fetching leads:', err)
      } finally {
        setIsLoadingLeads(false)
      }
    }
    fetchLeads()
  }, [])

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            {t('clientDashboardTitle')}, {profile.email.split('@')[0]}
          </h2>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {t('manageYourLeads')}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'leads'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {t('myLeads')}
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Heart className="w-4 h-4 inline-block mr-2" />
            {t('favoriteMasters')}
          </button>
        </div>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 bg-neutral-100 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <PlusCircle className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{t('createNewLead')}</h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
              {t('describeYourIdea')}
            </p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
            >
              {t('wantTattoo')}
            </button>
          </div>

          {isLoadingLeads ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[150px]">
              <p className="text-neutral-500 animate-pulse">{t('loadingLeads')}</p>
            </div>
          ) : leads.map(lead => (
            <div key={lead.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                  {lead.status === 'open' ? t('statusSearching') || 'Searching' : 
                   lead.status === 'accepted' ? t('statusAccepted') || 'Accepted' : 
                   lead.status === 'completed' ? t('statusCompleted') || 'Completed' : 
                   lead.status === 'archived' ? t('statusArchived') || 'Archived' : lead.status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(lead.created_at).toLocaleDateString()}</span>
                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)}
                      className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {openMenuId === lead.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-lg overflow-hidden z-10">
                        <button 
                          onClick={() => { setOpenMenuId(null); handlePauseResume(lead.id, lead.status) }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {lead.status === 'open' ? <><Pause className="w-4 h-4" /> {t('pause') || 'Pause'}</> : <><Play className="w-4 h-4" /> {t('resume') || 'Resume'}</>}
                        </button>
                        <button 
                          onClick={() => { setOpenMenuId(null); handleDelete(lead.id) }}
                          className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" /> {t('delete') || 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-2">{lead.style ? `\${t('tattooStyle')} ${lead.style}` : t('tattooLead')}</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2">
                {lead.description || t('noDescription')}
              </p>
              <div className="flex justify-between items-center text-sm border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <span className="text-neutral-500">
                  Бюджет: <strong>{lead.client_budget ? `${t('budgetUpTo')} ${lead.client_budget} CZK` : t('notSpecified')}</strong>
                </span>
                <span className="text-indigo-500 font-medium">
                  {lead.unlocked_by ? lead.unlocked_by.length : 0} {t('responsesCount')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-500 mb-2">{t('noFavorites')}</h3>
          <p className="text-neutral-400">{t('saveMastersDesc')}</p>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-50 dark:bg-neutral-950 rounded-3xl p-6 md:p-10 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 z-50 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full bg-neutral-200/50 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-4">
              <LeadForm />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
