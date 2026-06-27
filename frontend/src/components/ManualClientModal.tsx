import { useState, useEffect } from 'react'
import { X, User, Phone, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ManualClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialDate?: string | null
}

export function ManualClientModal({ isOpen, onClose, onSuccess, initialDate }: ManualClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    client_name: '',
    contact: '',
    notes: '',
    session_date: ''
  })

  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setFormData(p => ({ ...p, session_date: initialDate }))
      } else {
        setFormData({ client_name: '', contact: '', notes: '', session_date: '' })
      }
    }
  }, [isOpen, initialDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const payload = {
        name: formData.client_name,
        contact_info: formData.contact,
        notes: formData.notes,
        session_date: formData.session_date || null
      }

      const res = await fetch(`${apiUrl}/api/crm/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to create client')

      toast.success('Клиент успешно добавлен!')
      onSuccess()
      onClose()
      setFormData({ client_name: '', contact: '', notes: '', session_date: '' })
    } catch (err: any) {
      toast.error(err.message || 'Ошибка при добавлении клиента')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-neutral-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Добавить клиента вручную</h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Имя клиента</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                required
                type="text"
                value={formData.client_name}
                onChange={e => setFormData(p => ({ ...p, client_name: e.target.value }))}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="Иван Иванов"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Контакты (TG/Inst/Телефон)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                value={formData.contact}
                onChange={e => setFormData(p => ({ ...p, contact: e.target.value }))}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="@username или +123456789"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Заметки / Идея</label>
            <div className="relative">
              <FileText className="absolute left-3 top-4 w-5 h-5 text-neutral-400" />
              <textarea
                rows={3}
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                placeholder="Что будем бить?"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Дата сеанса (необязательно)</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="date"
                value={formData.session_date}
                onChange={e => setFormData(p => ({ ...p, session_date: e.target.value }))}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Добавление...' : 'Добавить клиента в CRM'}
          </button>
        </form>
      </div>
    </div>
  )
}
