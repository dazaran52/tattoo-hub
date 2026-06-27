import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onDuplicateFound?: (clientId: string) => void
}

export function AddClientModal({ isOpen, onClose, onSuccess, onDuplicateFound }: AddClientModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    telegram: '',
    instagram: '',
    email: '',
    notes: ''
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) {
        if (res.status === 409) {
          const errData = await res.json().catch(() => null)
          if (errData?.detail?.error === 'client_exists') {
            toast((t) => (
              <div className="flex flex-col gap-2">
                <span className="font-medium text-sm">
                  Клиент с такими контактами уже существует: <b>{errData.detail.client.name}</b>
                </span>
                <button 
                  onClick={() => {
                    toast.dismiss(t.id);
                    if (onDuplicateFound) onDuplicateFound(errData.detail.client.id);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold w-fit transition-colors"
                >
                  Перейти к профилю
                </button>
              </div>
            ), { duration: 5000 })
            setLoading(false)
            return
          }
        }
        throw new Error('Ошибка при создании клиента')
      }
      
      toast.success('Клиент успешно добавлен')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error('Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-8">
        <div className="flex justify-between items-center p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
            <UserPlus className="w-5 h-5 text-violet-500" />
            Добавить клиента
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Имя *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              placeholder="Имя клиента"
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
              placeholder="+420..."
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
              placeholder="example@mail.com"
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Telegram</label>
              <input
                type="text"
                value={formData.telegram}
                onChange={(e) => setFormData(p => ({ ...p, telegram: e.target.value }))}
                placeholder="@username"
                className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Instagram</label>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => setFormData(p => ({ ...p, instagram: e.target.value }))}
                placeholder="@username"
                className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-1.5 uppercase tracking-wider">Заметки</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Дополнительная информация..."
              className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500/20 outline-none min-h-[100px] resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Добавить клиента'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
