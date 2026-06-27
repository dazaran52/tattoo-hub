import { useState } from 'react'
import { X, Calendar as CalendarIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface DayOffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DayOffModal({ isOpen, onClose, onSuccess }: DayOffModalProps) {
  const [loading, setLoading] = useState(false)
  const [sessionDate, setSessionDate] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const payload = {
        name: 'Выходной',
        contact: 'Система',
        description: 'Выходной день',
        session_date: sessionDate ? new Date(sessionDate).toISOString() : null,
        assigned_master_id: session.user.id,
        is_personal: true,
      }

      const res = await fetch(`${apiUrl}/api/leads/client`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to create day off')
      
      toast.success('Выходной успешно добавлен!')
      onSuccess()
      onClose()
      setSessionDate('')
    } catch (err: any) {
      toast.error(err.message || 'Ошибка при добавлении выходного')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-white/5 bg-red-50 dark:bg-red-900/10">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Добавить выходной</h2>
          <button onClick={onClose} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Дата выходного</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                required
                type="date"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !sessionDate}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Добавление...' : 'Заблокировать дату'}
          </button>
        </form>
      </div>
    </div>
  )
}
