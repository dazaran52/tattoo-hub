import { useState } from 'react'
import { X, Send, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Lead } from './LeadsFeed'
import { supabase } from '@/lib/supabase'

interface ProposalModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSuccess: () => void
  language: string
}

export function ProposalModal({ isOpen, onClose, lead, onSuccess }: ProposalModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ price_offer: '', proposed_dates: '' })

  if (!isOpen || !lead) return null

  const currency = lead.master_currency || 'CZK'
  const price = Number(formData.price_offer) || 0
  const feeRate = 0.10
  const feeAmount = Math.round(price * feeRate * 100) / 100

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (price <= 0 || !formData.proposed_dates.trim()) {
      toast.error('Укажите цену и свободные даты')
      return
    }

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Нет активной сессии')

      const response = await fetch(`${apiUrl}/api/leads/${lead.id}/proposals`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_offer: price,
          proposed_dates: formData.proposed_dates.trim(),
          currency,
        }),
      })
      const responseData = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (responseData.detail === 'MAX_PROPOSALS_REACHED') {
          throw new Error('Лимит: клиент уже получил 5 предложений')
        }
        throw new Error(responseData.detail || 'Не удалось отправить предложение')
      }

      toast.success('Предложение отправлено бесплатно')
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка отправки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && onClose()}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-white/5 lg:p-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Сделать предложение</h2>
            <button type="button" onClick={onClose} aria-label="Закрыть" className="rounded-full bg-neutral-100 p-2 text-neutral-500 dark:bg-neutral-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-4 lg:p-6">
            <div className="flex items-start gap-3 rounded-2xl bg-violet-500/10 p-4 text-sm text-violet-600 dark:text-violet-400">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Отправка бесплатна. Комиссия спишется только если клиент выберет вас. Чат и контакты откроются после выбора.</p>
            </div>

            {lead.display_budget && (
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Бюджет клиента: {lead.display_budget}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">Ваша примерная цена ({currency})</label>
              <input
                type="number"
                min="1"
                required
                className="w-full rounded-2xl border border-transparent bg-neutral-100 px-5 py-3 text-neutral-900 outline-none focus:border-violet-500 dark:bg-neutral-800 dark:text-white"
                placeholder="Например: 3500"
                value={formData.price_offer}
                onChange={(event) => setFormData({ ...formData, price_offer: event.target.value })}
              />
            </div>

            {price > 0 && (
              <div className="rounded-2xl border border-neutral-200 p-4 text-sm dark:border-neutral-700">
                <div className="flex justify-between"><span>Комиссия Tattoo HUB</span><strong>{feeRate * 100}%</strong></div>
                <div className="mt-2 flex justify-between text-base"><span>Спишется при выборе</span><strong>{feeAmount} {currency}</strong></div>
                <p className="mt-2 text-xs text-neutral-500">Единая комиссия — 10% от цены предложения.</p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">Свободные даты</label>
              <textarea
                required
                className="w-full resize-none rounded-2xl border border-transparent bg-neutral-100 px-5 py-3 text-neutral-900 outline-none focus:border-violet-500 dark:bg-neutral-800 dark:text-white"
                placeholder="Например: четверг или пятница на этой неделе"
                rows={3}
                value={formData.proposed_dates}
                onChange={(event) => setFormData({ ...formData, proposed_dates: event.target.value })}
              />
            </div>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 py-4 font-bold text-white shadow-lg shadow-violet-500/25 hover:bg-violet-600 disabled:opacity-50">
              {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <><span>Отправить бесплатно</span><Send className="h-5 w-5" /></>}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
