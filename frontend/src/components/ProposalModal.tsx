import { useState, useEffect } from 'react'
import { X, Send, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
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
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([])

  // Calendar state
  const [sessions, setSessions] = useState<any[]>([])
  const [daysOff, setDaysOff] = useState<any[]>([])
  const [calendarLoading, setCalendarLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchSchedule()
    } else {
      setSelectedDates([])
      setFormData({ price_offer: '', proposed_dates: '' })
    }
  }, [isOpen])

  const fetchSchedule = async () => {
    try {
      setCalendarLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) return

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const [sessRes, daysRes] = await Promise.all([
        fetch(`${apiUrl}/api/crm/sessions`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/crm/days-off`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (sessRes.ok) setSessions(await sessRes.json())
      if (daysRes.ok) setDaysOff(await daysRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setCalendarLoading(false)
    }
  }

  const modifiers = {
    dayOff: daysOff.map(d => new Date(d.date)),
    session: sessions.filter(s => s.session_date).map(s => new Date(s.session_date)),
    clientDate: lead?.session_date ? [new Date(lead.session_date)] : []
  }
  const modifiersStyles = {
    dayOff: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 'bold' },
    session: { backgroundColor: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', fontWeight: 'bold', borderBottom: '2px solid #06b6d4' },
    clientDate: { backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', fontWeight: 'bold', borderBottom: '2px solid #a855f7' }
  }

  if (!isOpen || !lead) return null

  const currency = lead.master_currency || 'CZK'
  const price = Number(formData.price_offer) || 0
  const feeRate = 0.10
  const feeAmount = Math.round(price * feeRate * 100) / 100

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    const hasDates = selectedDates && selectedDates.length > 0
    if (price <= 0 || (!hasDates && !formData.proposed_dates.trim())) {
      toast.error('Укажите цену и свободные даты')
      return
    }

    const formattedDates = hasDates ? selectedDates.map(d => format(d, 'dd.MM.yyyy')).join(', ') : ''
    const comment = formData.proposed_dates.trim()
    const finalProposedDates = [formattedDates, comment].filter(Boolean).join(' - ')

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
          proposed_dates: finalProposedDates,
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
          className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 p-4 dark:border-white/5 lg:p-6">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Сделать предложение</h2>
            <button type="button" onClick={onClose} aria-label="Закрыть" className="rounded-full bg-neutral-100 p-2 text-neutral-500 dark:bg-neutral-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-5">
            <div className="flex items-start gap-3 rounded-2xl bg-primary-500/10 p-4 text-sm text-primary-600 dark:text-primary-400">
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
                className="w-full rounded-2xl border border-transparent bg-neutral-100 px-5 py-3 text-neutral-900 outline-none focus:border-primary-500 dark:bg-neutral-800 dark:text-white"
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
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">Свободные даты</label>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-cyan-500"></div>Сеансы</div>
                  <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>Выходные</div>
                  {lead.session_date && <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400"><div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>Выбор клиента</div>}
                </div>
              </div>
              
              <div className="mb-4 rounded-3xl border border-neutral-200 p-4 dark:border-white/10 bg-neutral-50 dark:bg-black/50 flex justify-center overflow-x-auto shadow-inner">
                <style>{`
                  .rdp-root { 
                    --rdp-day-height: 40px; 
                    --rdp-day-width: 40px;
                    --rdp-accent-color: #06b6d4 !important; 
                    --rdp-accent-background-color: rgba(6, 182, 212, 0.25) !important;
                    margin: 0; 
                  }
                  .rdp-day_button { 
                    border-radius: 12px !important; 
                    font-weight: 600; 
                    transition: all 0.2s;
                  }
                  .dark .rdp-day_button { color: #e5e5e5; }
                  .rdp-day_button:hover:not([disabled]):not(.rdp-selected) { background-color: rgba(0, 0, 0, 0.05); }
                  .dark .rdp-day_button:hover:not([disabled]):not(.rdp-selected) { background-color: rgba(255, 255, 255, 0.15); }
                `}</style>
                {calendarLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
                ) : (
                  <DayPicker
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={setSelectedDates}
                    locale={ru}
                    modifiers={modifiers}
                    modifiersStyles={modifiersStyles}
                  />
                )}
              </div>

              <label className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">Комментарий к заявке (необязательно)</label>
              <textarea
                className="w-full resize-none rounded-2xl border border-transparent bg-neutral-100 px-5 py-3 text-neutral-900 outline-none focus:border-primary-500 dark:bg-neutral-800 dark:text-white"
                placeholder="Напишите клиенту детали предложения или условия..."
                rows={2}
                value={formData.proposed_dates}
                onChange={(event) => setFormData({ ...formData, proposed_dates: event.target.value })}
              />
            </div>
            </div>

            <div className="shrink-0 border-t border-neutral-100 p-4 dark:border-white/5 lg:p-6 bg-white dark:bg-neutral-900">
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-4 font-bold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 disabled:opacity-50">
                {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <><span>Отправить бесплатно</span><Send className="h-5 w-5" /></>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
