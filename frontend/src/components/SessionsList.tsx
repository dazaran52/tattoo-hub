import Image from 'next/image'
import { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronUp, Trash2, Edit3, Image as ImageIcon } from 'lucide-react'
import { CRMSession } from './CRMBoard'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useTranslations, useLocale } from 'next-intl'
import { EmptyState } from './EmptyState'

const DATE_LOCALES: Record<string, string> = { ru: 'ru-RU', en: 'en-US', cs: 'cs-CZ', uk: 'uk-UA' }

interface SessionsListProps {
  sessions: CRMSession[]
  searchQuery: string
  setSearchQuery: (s: string) => void
  onStatusChange: (id: string, status: string) => void
  onSessionClick: (session: CRMSession) => void
  onUpdate: () => void
  cardView?: 'normal' | 'expanded'
}

type SortField = 'date' | 'client' | 'price'
type SortOrder = 'asc' | 'desc'

export function SessionsList({ sessions, searchQuery, setSearchQuery, onStatusChange, onSessionClick, onUpdate, cardView = 'normal' }: SessionsListProps) {
  const t = useTranslations()
  const lang = useLocale()
  const dateLocale = DATE_LOCALES[lang] || 'en-US'

  // Lightweight helper to interpolate simple {token} placeholders into
  // translated strings, since the shared t() function only does key lookup.
  const tc = (key: string, replacements: Record<string, string | number>) => {
    let result = t(key)
    Object.entries(replacements).forEach(([k, v]) => {
      result = result.replace(`{${k}}`, String(v))
    })
    return result
  }

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const filteredAndSorted = useMemo(() => {
    let result = sessions.filter(s => {
      const q = searchQuery.toLowerCase()
      const name = (s.master_clients?.name || '').toLowerCase()
      const contactInfo = s.master_clients?.phone || s.master_clients?.telegram || s.master_clients?.email || s.master_clients?.contact_info || t('crmBoard.noContacts')
      const contact = contactInfo.toLowerCase()
      const matchesSearch = name.includes(q) || contact.includes(q)
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter
      return matchesSearch && matchesStatus
    })

    result.sort((a, b) => {
      if (sortField === 'date') {
        const da = new Date(a.session_date).getTime()
        const db = new Date(b.session_date).getTime()
        return sortOrder === 'asc' ? da - db : db - da
      } else if (sortField === 'client') {
        const na = (a.master_clients?.name || '').toLowerCase()
        const nb = (b.master_clients?.name || '').toLowerCase()
        return sortOrder === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na)
      } else if (sortField === 'price') {
        const pa = a.price || 0
        const pb = b.price || 0
        return sortOrder === 'asc' ? pa - pb : pb - pa
      }
      return 0
    })

    return result
  }, [sessions, searchQuery, statusFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize)
  const paginated = filteredAndSorted.slice((page - 1) * pageSize, page * pageSize)

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length && paginated.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginated.map(s => s.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Вы уверены, что хотите удалить ${selectedIds.size} сеансов?`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      
      const idsArray = Array.from(selectedIds)
      for (const id of idsArray) {
        await fetch(`${apiUrl}/api/crm/sessions/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
      toast.success(`Удалено сеансов: ${selectedIds.size}`)
      setSelectedIds(new Set())
      onUpdate()
    } catch (err) {
      toast.error(t('key_70f4ad'))
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      const idsArray = Array.from(selectedIds)
      for (const id of idsArray) {
        onStatusChange(id, newStatus)
      }
      toast.success(`Статус обновлен для ${selectedIds.size} сеансов`)
      setSelectedIds(new Set())
    } catch (err) {
      toast.error(t('key_fa1f89'))
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4" />
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters & Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3">
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2 text-sm outline-none font-medium"
          >
            <option value="all">{t('crmBoard.list.allStatuses')}</option>
            <option value="new">{t('crmBoard.columns.new')}</option>
            <option value="discussing">{t('key_0425ad')}</option>
            <option value="booked">{t('key_277bbc')}</option>
            <option value="in_progress">{t('crmBoard.columns.in_progress')}</option>
            <option value="completed">{t('crmBoard.columns.completed')}</option>
            <option value="cancelled">{t('cancel')}</option>
          </select>
          <div className="text-sm text-neutral-500 font-medium">
            {t('key_38d5dd')} {filteredAndSorted.length}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 animate-in fade-in zoom-in duration-200">
            <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{t('leadWizard.selectedDate')} {selectedIds.size}</span>
            <select 
              onChange={(e) => { if(e.target.value) handleBulkStatusChange(e.target.value); e.target.value=''; }}
              className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 rounded-xl px-3 py-1.5 text-sm outline-none font-bold"
            >
              <option value="">{t('key_98c05b')}</option>
              <option value="new">{t('crmBoard.columns.new')}</option>
              <option value="discussing">{t('key_0425ad')}</option>
              <option value="booked">{t('key_277bbc')}</option>
              <option value="in_progress">{t('crmBoard.columns.in_progress')}</option>
              <option value="completed">{t('crmBoard.columns.completed')}</option>
              <option value="cancelled">{t('cancel')}</option>
            </select>
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" /> {t('delete')}
                                      </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="p-4 w-12 text-center">
                  <div className="relative flex items-center justify-center w-5 h-5 mx-auto">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.size === paginated.length && paginated.length > 0}
                      onChange={toggleSelectAll}
                      className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-neutral-300 dark:border-neutral-600 bg-transparent peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-colors flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </th>
                <th className="p-4 font-bold cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors" onClick={() => handleSort('client')}>
                  <div className="flex items-center gap-1">{t('landing.client_title')} <SortIcon field="client" /></div>
                </th>
                <th className="p-4 font-bold cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors" onClick={() => handleSort('date')}>
                  <div className="flex items-center gap-1">{t('crmBoard.list.dateTimeColumn')} <SortIcon field="date" /></div>
                </th>
                <th className="p-4 font-bold cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors" onClick={() => handleSort('price')}>
                  <div className="flex items-center gap-1">{t('crmBoard.list.stylePriceColumn')} <SortIcon field="price" /></div>
                </th>
                <th className="p-4 font-bold">{t('crmBoard.list.photoColumn')}</th>
                <th className="p-4 font-bold text-right">{t('crmBoard.list.statusColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(session => (
                <tr 
                  key={session.id} 
                  className={`border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer ${selectedIds.has(session.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : session.status === 'new' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-l-2 border-l-emerald-500' : ''}`}
                  onClick={(e) => {
                    // Prevent opening modal if clicking checkbox or select
                    if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'SELECT' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                      onSessionClick(session)
                    }
                  }}
                >
                  <td className="p-4 text-center">
                    <div className="relative flex items-center justify-center w-5 h-5 mx-auto">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(session.id)}
                        onChange={() => toggleSelect(session.id)}
                        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-5 h-5 rounded-md border-2 border-neutral-300 dark:border-neutral-600 bg-transparent peer-checked:bg-primary-500 peer-checked:border-primary-500 transition-colors flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                      {session.master_clients?.name}
                      {(session.source === 'direct' || (!session.source && (session.master_clients?.source === 'direct' || session.master_clients?.leads?.is_personal))) ? (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] px-2 py-0.5 rounded font-bold">{t('key_08f3aa')}</span>
                      ) : (session.source === 'marketplace' || (!session.source && (session.master_clients?.source === 'marketplace' || (session.master_clients?.lead_id && !session.master_clients?.leads?.is_personal)))) ? (
                        <span className="bg-accent-100 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 text-[10px] px-2 py-0.5 rounded font-bold">{t('marketplace')}</span>
                      ) : null}
                    </div>
                    <div className="text-sm text-neutral-500">{session.master_clients?.phone || session.master_clients?.telegram || session.master_clients?.email || session.master_clients?.contact_info || t('crmBoard.noContacts')}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {new Date(session.session_date).toLocaleDateString('ru-RU')}
                    </div>
                    {(session.start_time || session.end_time) && (
                      <div className="text-sm text-neutral-500">
                        {session.start_time?.slice(0, 5)} {session.end_time ? `- ${session.end_time.slice(0, 5)}` : ''}
                      </div>
                    )}
                    {cardView === 'expanded' && (
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {t('key_d4a1ff')} {new Date(session.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{session.style || '-'}</div>
                    <div className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">{session.price ? `${session.price} Kč` : '-'}</div>
                  </td>
                  <td className="p-4">
                    {session.reference_images && session.reference_images.length > 0 ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 group">
                        <Image src={session.reference_images[0] || ''} alt="" className="w-full h-full object-cover"  width={800} height={800} />
                        {session.reference_images.length > 1 && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-bold">
                            +{session.reference_images.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-400">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <select 
                      value={session.status}
                      onChange={(e) => onStatusChange(session.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm outline-none font-medium cursor-pointer"
                    >
                      <option value="new">{t('crmBoard.columns.new')}</option>
                      <option value="discussing">{t('key_0425ad')}</option>
                      <option value="booked">{t('key_277bbc')}</option>
                      <option value="in_progress">{t('crmBoard.columns.in_progress')}</option>
                      <option value="completed">{t('crmBoard.columns.completed')}</option>
                      <option value="cancelled">{t('cancel')}</option>
                    </select>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <EmptyState
                  variant="table"
                  colSpan={6}
                  icon={<Search className="w-8 h-8" />}
                  title={t('key_9aaa16')}
                  description={searchQuery ? t('key_307cbd') : t('key_800a7f')}
                />
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              {t('crmBoard.list.showPerPage')}
                                        <select 
                value={pageSize} 
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="bg-transparent border-none outline-none font-bold text-neutral-900 dark:text-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('back')}
                                            </button>
              <span className="text-sm font-medium px-2">
                {page} {t('key_b98ccb')} {totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('crmBoard.list.nextPage')}
                                            </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
