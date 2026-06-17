'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

export function AdminDisputes() {
  const [disputes, setDisputes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [adminComment, setAdminComment] = useState('')
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null)

  useEffect(() => {
    fetchDisputes()
  }, [])

  const fetchDisputes = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/disputes`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch disputes')
      
      const data = await res.json()
      setDisputes(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async (action: 'refund' | 'reject') => {
    if (!selectedDispute) return
    if (!adminComment.trim()) {
      toast.error('Добавьте комментарий для пользователя')
      return
    }

    try {
      setProcessingId(selectedDispute.id)
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/disputes/${selectedDispute.id}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, admin_comment: adminComment })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to resolve dispute')
      }

      toast.success(action === 'refund' ? 'Средства возвращены' : 'Спор отклонен')
      setSelectedDispute(null)
      setAdminComment('')
      fetchDisputes()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-neutral-500">Загрузка споров...</div>
  }

  if (disputes.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Нет открытых жалоб</h3>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
          Все жалобы обработаны.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {disputes.map((dispute) => (
          <div key={dispute.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full">
                  Ожидает
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(dispute.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-bold text-neutral-900 dark:text-white truncate" title={dispute.users?.email}>
                {dispute.users?.email}
              </h3>
              <p className="text-sm text-neutral-500 truncate">
                Лид: {dispute.leads?.title} ({dispute.leads?.base_unlock_price_eur} EUR)
              </p>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
              <div className="mb-4 flex-1">
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Причина:</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
                  {dispute.reason}
                </p>
              </div>

              {dispute.screenshots && dispute.screenshots.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Скриншоты ({dispute.screenshots.length}):</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {dispute.screenshots.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group block w-16 h-16 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        <img src={url} alt="screenshot" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={() => setSelectedDispute(dispute)}
                className="w-full mt-auto py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-lg text-sm font-medium transition-colors"
              >
                Обработать жалобу
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Решение по жалобе</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Пользователь: <span className="font-medium text-neutral-700 dark:text-neutral-300">{selectedDispute.users?.email}</span>
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                <p className="text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                  {selectedDispute.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Комментарий модератора (увидит пользователь)
                </label>
                <textarea 
                  value={adminComment}
                  onChange={e => setAdminComment(e.target.value)}
                  placeholder="Ваша жалоба была рассмотрена..."
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="p-6 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSelectedDispute(null)}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
                disabled={!!processingId}
              >
                Отмена
              </button>
              <button
                onClick={() => handleResolve('reject')}
                disabled={!!processingId}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {processingId === selectedDispute.id ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                Отклонить
              </button>
              <button
                onClick={() => handleResolve('refund')}
                disabled={!!processingId}
                className="flex-1 px-4 py-2.5 rounded-xl font-medium bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {processingId === selectedDispute.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Вернуть {selectedDispute.leads?.base_unlock_price_eur} EUR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
