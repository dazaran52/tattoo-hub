import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getTranslation, Language } from '@/lib/i18n'
import { supabase } from '@/lib/supabase'


interface MasterLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  language: string
  cities: any[]
  countries: any[]
}

export function MasterLeadModal({ isOpen, onClose, onSuccess, language, cities, countries }: MasterLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contacts: '',
    country_id: '',
    city_id: '',
    price_credits: 50
  })

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${apiUrl}/api/leads/master`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) {
        throw new Error('Failed to create lead')
      }
      
      toast.success('Лид успешно создан и добавлен в Мои Лиды!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания лида')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Слить своего лида</h2>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Имя/Заголовок</label>
            <input
              type="text"
              required
              className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
              placeholder="Например: Аня (Хочет рукав)"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('description')}</label>
            <textarea
              required
              className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
              placeholder="Детали: стиль, размер, бюджет..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('contacts')} (Скрыты до продажи)</label>
            <input
              type="text"
              required
              className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
              placeholder="@telegram_username или телефон"
              value={formData.contacts}
              onChange={(e) => setFormData({...formData, contacts: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Страна</label>
              <select
                required
                className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={formData.country_id}
                onChange={(e) => setFormData({...formData, country_id: e.target.value, city_id: ''})}
              >
                <option value="">Выберите...</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name_ru}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Город</label>
              <select
                required
                className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                value={formData.city_id}
                onChange={(e) => setFormData({...formData, city_id: e.target.value})}
              >
                <option value="">Выберите...</option>
                {cities.filter(c => c.country_id === formData.country_id).map(c => (
                  <option key={c.id} value={c.id}>{c.name_ru}</option>
                ))}
              </select>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Создание...' : 'Добавить Лида'}
          </button>
        </form>
      </div>
    </div>
  )
}
