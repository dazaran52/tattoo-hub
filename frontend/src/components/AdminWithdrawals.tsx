import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getTranslation, Language } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'


interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  payment_details: string
  status: string
  created_at: string
  processed_at: string | null
  users: {
    email: string
  }
}

export function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const fetchRequests = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/admin/withdrawals`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setRequests(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleProcess = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/admin/withdrawals/${id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })
      if (!res.ok) throw new Error('Failed to process')
      toast.success(action === 'approve' ? 'Одобрено' : 'Отклонено')
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-cyan-500" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Заявки на вывод средств</h2>
        <button onClick={fetchRequests} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200 transition-colors">
          <RefreshCw className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <p className="text-neutral-500">Нет заявок на вывод</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map(req => (
            <div key={req.id} className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-neutral-900 dark:text-white">{req.users?.email}</span>
                  <span className="text-sm text-neutral-500">{new Date(req.created_at).toLocaleString()}</span>
                  {req.status === 'pending' && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">Ожидает</span>}
                  {req.status === 'approved' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">Выплачено</span>}
                  {req.status === 'rejected' && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">Отклонено</span>}
                </div>
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">
                  {req.amount} кредитов
                </div>
                <div className="text-sm bg-neutral-100 dark:bg-neutral-800 p-2 rounded font-mono break-all">
                  {req.payment_details}
                </div>
              </div>
              
              {req.status === 'pending' && (
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => handleProcess(req.id, 'approve')}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-colors"
                  >
                    {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Одобрить
                  </button>
                  <button 
                    onClick={() => handleProcess(req.id, 'reject')}
                    disabled={actionLoading === req.id}
                    className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
                  >
                    {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Отклонить
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
