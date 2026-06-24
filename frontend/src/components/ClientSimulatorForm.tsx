'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export function ClientSimulatorForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    description: 'Привет, хочу татуировку дракона на всю спину!',
    style: 'Японский',
    location: 'Спина',
    size: 'Вся спина',
    budget_val: 500,
    budget_currency: 'EUR',
    client_priority: 'quality',
    name: 'Анонимный Дракон',
    contact: '+420 123 456 789'
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          is_negotiable_budget: true
        })
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Failed to create lead')
      }

      toast.success('Заявка успешно отправлена в Маркетплейс!')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium mb-1">Имя Клиента</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={e => setFormData(f => ({...f, name: e.target.value}))}
          className="w-full bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded-lg px-4 py-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Описание идеи</label>
        <textarea 
          value={formData.description}
          onChange={e => setFormData(f => ({...f, description: e.target.value}))}
          className="w-full bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded-lg px-4 py-2"
          rows={3}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Стиль</label>
          <input 
            type="text" 
            value={formData.style}
            onChange={e => setFormData(f => ({...f, style: e.target.value}))}
            className="w-full bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Контакты (WhatsApp / tg)</label>
          <input 
            type="text" 
            value={formData.contact}
            onChange={e => setFormData(f => ({...f, contact: e.target.value}))}
            className="w-full bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded-lg px-4 py-2"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Бюджет (сумма)</label>
          <input 
            type="number" 
            value={formData.budget_val}
            onChange={e => setFormData(f => ({...f, budget_val: parseInt(e.target.value)}))}
            className="w-full bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded-lg px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Валюта</label>
          <select 
            value={formData.budget_currency}
            onChange={e => setFormData(f => ({...f, budget_currency: e.target.value}))}
            className="w-full bg-white/50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-white/10 rounded-lg px-4 py-2"
          >
            <option value="EUR">EUR</option>
            <option value="CZK">CZK</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>
      <button 
        type="submit"
        disabled={isLoading}
        className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сгенерировать лид'}
      </button>
    </form>
  )
}
