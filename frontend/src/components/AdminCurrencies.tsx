import { useTranslations } from "next-intl";
import { useState, useEffect } from 'react'
import { RefreshCw, DollarSign, Loader2, Clock, CheckCircle, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { SkeletonTable } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'

interface CurrencyRate {
  currency_code: string
  rate_to_eur: number
  is_active: boolean
  updated_at: string
}

export function AdminCurrencies() {
    const t = useTranslations();
  const [rates, setRates] = useState<CurrencyRate[]>([])
  const [cachedRates, setCachedRates] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncInfo, setLastSyncInfo] = useState<{
    source?: string
    date_api?: string
    updated_count?: number
  } | null>(null)

  const fetchRates = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/currency/rates`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch currency rates')
      const data = await res.json()
      setRates(data.rates || [])
      setCachedRates(data.cached || {})
    } catch (e) {
      toast.error(t('errorLoadingCurrencyRates'))
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRates()
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/currency/sync-rates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || t('synchronizationError'))
      }
      const data = await res.json()
      toast.success(`Курсы успешно обновлены (${data.updated_count} валют)`)
      setLastSyncInfo({
        source: data.source,
        date_api: data.date_api,
        updated_count: data.updated_count
      })
      await fetchRates()
    } catch (e: any) {
      toast.error(e.message || t('synchronizationErrorWithEcb'))
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return <SkeletonTable rows={5} />
  }

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-primary-900/20 to-neutral-900/50 dark:from-primary-950/40 dark:to-neutral-900 p-6 rounded-2xl border border-primary-500/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-primary-500" />
            <h3 className="text-xl font-bold dark:text-white">{t('exchangeRateManagementEcb')}</h3>
            <button
              onClick={fetchRates}
              disabled={isLoading}
              className="p-1.5 ml-2 bg-white/20 dark:bg-neutral-800/50 hover:bg-white/40 dark:hover:bg-neutral-700/50 rounded-lg transition-colors"
              title={t('refresh')}
              type="button"
            >
              <RefreshCw className={`w-4 h-4 text-neutral-800 dark:text-neutral-300 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
            {t('eur10CzkFrankfurter')}
                                </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary-600/20 transition-all active:scale-95 whitespace-nowrap"
        >
          {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          {t('synchronizeWithEcb')}
                          </button>
      </div>

      {lastSyncInfo && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>
            {t('successfulSynchronizationWithSource')} <strong>{lastSyncInfo.source}</strong> {t('exchangeRelevance')} {lastSyncInfo.date_api}{t('updatedCurrencies')} {lastSyncInfo.updated_count}.
          </span>
        </div>
      )}

      {/* Rates Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
        <h4 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white">
          <DollarSign className="w-5 h-5 text-primary-500" />
          {t('1Eur2')}
                          </h4>

        <div className="overflow-x-auto w-full pb-4">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-500 text-sm">
                <th className="pb-3 font-semibold">{t('currency')}</th>
                <th className="pb-3 font-semibold">{t('code')}</th>
                <th className="pb-3 font-semibold">{t('1Eur')}</th>
                <th className="pb-3 font-semibold">{t('inMemoryCache')}</th>
                <th className="pb-3 font-semibold">{t('lastRefresh')}</th>
                <th className="pb-3 font-semibold text-right">{t('crmBoard.list.statusColumn')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
              {rates.map((r) => {
                const isBase = r.currency_code === 'EUR'
                const isLaunchDefault = r.currency_code === 'CZK'
                const cachedVal = cachedRates[r.currency_code]
                const formattedDate = r.updated_at ? new Date(r.updated_at).toLocaleString('ru-RU') : '-'

                return (
                  <tr key={r.currency_code} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-4 font-medium flex items-center gap-2 dark:text-white">
                      <span>{r.currency_code}</span>
                      {isBase && <span className="bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 text-xs px-2 py-0.5 rounded-md font-bold">{t('basic')}</span>}
                      {isLaunchDefault && <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-md font-bold">{t('startMarketCzechRepublic')}</span>}
                    </td>
                    <td className="py-4 font-mono text-sm text-neutral-500 dark:text-neutral-400">{r.currency_code}</td>
                    <td className="py-4 font-mono font-bold text-base dark:text-white">
                      {r.rate_to_eur ? r.rate_to_eur.toFixed(4) : '-'}
                    </td>
                    <td className="py-4 font-mono text-sm text-neutral-600 dark:text-neutral-300">
                      {cachedVal ? cachedVal.toFixed(4) : '-'}
                    </td>
                    <td className="py-4 text-sm text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      {formattedDate}
                    </td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        r.is_active 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}>
                        {r.is_active ? t('active') : t('disabled')}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {rates.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8">
                    <EmptyState
                      variant="compact"
                      icon={<DollarSign className="w-7 h-7" />}
                      title={t('courseTableIsEmpty')}
                      description={t('051')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
