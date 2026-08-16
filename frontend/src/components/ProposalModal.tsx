import { useTranslations } from "next-intl";
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
    const t = useTranslations();
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ price_offer: '', proposed_dates: '' })
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>([])
  const [balance, setBalance] = useState<number>(0)

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
      const [sessRes, daysRes, profileRes] = await Promise.all([
        fetch(`${apiUrl}/api/crm/sessions`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/crm/days-off`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (sessRes.ok) setSessions(await sessRes.json())
      if (daysRes.ok) setDaysOff(await daysRes.json())
      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setBalance(profileData.balance || 0)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCalendarLoading(false)
    }
  }

  const modifiers = {
    dayOff: daysOff.map(d => new Date(d.date)),
    session: sessions.filter(s => s.session_date && !['discussing', 'cancelled', 'rejected'].includes(s.status)).map(s => new Date(s.session_date)),
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
  const isBalanceInsufficient = price > 0 && balance < feeAmount

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    const hasDates = selectedDates && selectedDates.length > 0
    if (price <= 0 || (!hasDates && !formData.proposed_dates.trim())) {
      toast.error(t('Auto.text_25f93a'))
      return
    }

    const formattedDates = hasDates ? selectedDates.map(d => format(d, 'dd.MM.yyyy')).join(', ') : ''
    const comment = formData.proposed_dates.trim()
    const finalProposedDates = [formattedDates, comment].filter(Boolean).join(' - ')

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t('Auto.text_01ed67'))

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
          throw new Error(t('Auto.text_b62e94'))
        }
        if (responseData.detail === 'INSUFFICIENT_BALANCE_FOR_COMMISSION') {
          throw new Error(t('Auto.text_636242'))
        }
        throw new Error(responseData.detail || t('Auto.text_3f2424'))
      }

      if (responseData.chat_id) {
        toast.success(t('Auto.text_3da49a'))
        window.location.href = `/dashboard?tab=messages&chat_id=${responseData.chat_id}`
      } else {
        toast.success(t('Auto.text_b4af11'))
        onSuccess()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('Auto.text_1a7b0b'))
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
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{t('Auto.text_b066d5')}</h2>
            <button type="button" onClick={onClose} aria-label={t('Auto.text_dd9463')} className="rounded-full bg-neutral-100 p-2 text-neutral-500 dark:bg-neutral-800">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-5">
            <div className="flex items-start gap-3 rounded-2xl bg-primary-500/10 p-4 text-sm text-primary-600 dark:text-primary-400">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{t('Auto.text_4e45d4')}</p>
            </div>

            {lead.display_budget && (
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                {t('Auto.text_ea4449')} {lead.display_budget}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">{t('Auto.text_964855')}{currency})</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                required
                className="w-full rounded-2xl border border-transparent bg-neutral-100 px-5 py-3 text-neutral-900 outline-none focus:border-primary-500 dark:bg-neutral-800 dark:text-white"
                placeholder={t('Auto.text_45d1ab')}
                value={formData.price_offer}
                onChange={(event) => {
                  const val = event.target.value.replace(/\D/g, '')
                  setFormData({ ...formData, price_offer: val })
                }}
              />
            </div>

            {price > 0 && (
              <div className="rounded-2xl border border-neutral-200 p-4 text-sm dark:border-neutral-700">
                <div className="flex justify-between"><span>{t('Auto.text_03256a')}</span><strong>{feeRate * 100}%</strong></div>
                <div className="mt-2 flex justify-between text-base"><span>{t('Auto.text_b694bb')}</span><strong>{feeAmount} {currency}</strong></div>
                <div className="mt-2 flex justify-between text-xs text-neutral-500">
                  <span>{t('Auto.text_e4d101')}</span>
                  <span className={isBalanceInsufficient ? 'text-red-500 font-bold' : ''}>{balance} {currency}</span>
                </div>
                {isBalanceInsufficient && (
                  <div className="mt-3 text-xs font-bold text-red-500 bg-red-500/10 p-2 rounded-xl text-center">
                    {t('Auto.text_a5c67e')}
                                                            </div>
                )}

              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300">{t('Auto.text_956171')}</label>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-cyan-500"></div>{t('crmBoard.tabSessions')}</div>
                  <div className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-red-500"></div>{t('Auto.text_f38afb')}</div>
                  {lead.session_date && <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400"><div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>{t('Auto.text_986204')}</div>}
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

              <label className="mb-2 block text-sm font-bold text-neutral-700 dark:text-neutral-300">{t('Auto.text_d93d78')}</label>
              <textarea
                className="w-full resize-none rounded-2xl border border-transparent bg-neutral-100 px-5 py-3 text-neutral-900 outline-none focus:border-primary-500 dark:bg-neutral-800 dark:text-white"
                placeholder={t('Auto.text_602645')}
                rows={2}
                value={formData.proposed_dates}
                onChange={(event) => setFormData({ ...formData, proposed_dates: event.target.value })}
              />
            </div>
            </div>

            <div className="shrink-0 border-t border-neutral-100 p-4 dark:border-white/5 lg:p-6 bg-white dark:bg-neutral-900">
              <button type="submit" disabled={loading || isBalanceInsufficient} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-500 py-4 font-bold text-white shadow-lg shadow-primary-500/25 hover:bg-primary-600 disabled:opacity-50">
                {loading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <><span>{isBalanceInsufficient ? t('Auto.text_55a626') : t('Auto.text_834dbe')}</span><Send className="h-5 w-5" /></>}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
