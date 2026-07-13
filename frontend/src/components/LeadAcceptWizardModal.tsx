import React, { useState, useEffect } from 'react'
import { X, Calendar as CalendarIcon, CheckCircle, MessageCircle, DollarSign, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { CRMSession } from './CRMBoard'

interface LeadAcceptWizardModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  session: CRMSession
  allSessions: CRMSession[]
}

interface DayOff {
  id: string
  date: string
  is_full_day: boolean
  start_time: string | null
  end_time: string | null
}

export function LeadAcceptWizardModal({ isOpen, onClose, onSuccess, session, allSessions }: LeadAcceptWizardModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [price, setPrice] = useState(session.price?.toString() || '')
  const [startTime, setStartTime] = useState(session.start_time || '10:00')
  const [endTime, setEndTime] = useState(session.end_time || '14:00')
  const [sendMessage, setSendMessage] = useState(true)

  // Calendar states
  const [selectedDate, setSelectedDate] = useState(session.session_date)
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date(session.session_date || new Date()))
  const [daysOff, setDaysOff] = useState<DayOff[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchDaysOff()
    }
  }, [isOpen])

  const fetchDaysOff = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/days-off`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setDaysOff(await res.json())
    } catch (e) {}
  }

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
    
    const days = []
    for (let i = 0; i < startDayOffset; i++) days.push(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const days = getDaysInMonth(currentMonthDate)
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const nextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1))

  const selectedDateSessions = allSessions
    .filter(s => s.session_date === selectedDate && s.id !== session.id)
    .sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'))

  if (!isOpen) return null

  const handleNext = () => setStep(s => s + 1)
  const handlePrev = () => setStep(s => s - 1)

  const handleAccept = async () => {
    setLoading(true)
    try {
      // 1. Update session in CRM
      const { error: sessionError } = await supabase.from('master_sessions')
        .update({
          status: 'booked',
          price: price ? parseFloat(price) : null,
          start_time: startTime,
          end_time: endTime,
          session_date: selectedDate
        })
        .eq('id', session.id)

      if (sessionError) throw sessionError

      // 2. Optionally send automated message
      if (sendMessage && session.master_clients?.leads) {
        // Need to find lead_id to get the chat
        const { data: clientData } = await supabase.from('master_clients')
          .select('lead_id')
          .eq('id', session.master_clients?.id)
          .single()

        if (clientData?.lead_id) {
          const { data: chatData } = await supabase.from('lead_chats')
            .select('id')
            .eq('lead_id', clientData.lead_id)
            .single()

          if (chatData?.id) {
            const { data: userData } = await supabase.auth.getUser()
            if (userData.user) {
              const msg = `Привет! Я готов взять твою заявку в работу. \nПредварительная стоимость: ${price ? price + ' Kč' : 'договорная'}.\nВремя сеанса: ${startTime} - ${endTime}.\nЕсли есть вопросы — пиши!`
              await supabase.from('chat_messages').insert({
                chat_id: chatData.id,
                sender_id: userData.user.id,
                content: msg
              })
            }
          }
        }
      }

      toast.success('Заявка принята в работу!')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка принятия заявки')
    } finally {
      setLoading(false)
    }
  }

  const clientBudget = (session.master_clients?.leads as any)?.description?.match(/Бюджет:\s*(.+)/)?.[1] || 'Договорная/не указан'
  const clientPrefTime = (session.master_clients?.leads as any)?.description?.match(/Желаемое время:\s*(.+)/)?.[1] || 'Не указано'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-900 dark:text-white">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Принятие новой заявки
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} />
          </div>
        </div>

        {/* Wizard Steps */}
        <div className="px-6 pb-6 space-y-6">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Оценка стоимости
              </h3>
              
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl mb-6">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Желаемый бюджет клиента:</p>
                <p className="font-medium text-neutral-900 dark:text-white">{clientBudget}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Точная стоимость сеанса (Kč)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                />
                <p className="text-xs text-neutral-500 mt-2">Оставьте пустым, если цена еще не определена.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                <Clock className="w-5 h-5 text-emerald-500" />
                Назначение времени
              </h3>
              
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl mb-6">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Пожелания клиента по времени:</p>
                <p className="font-medium text-neutral-900 dark:text-white mb-4">{clientPrefTime}</p>
                
                {/* Mini Calendar UI */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-sm text-neutral-900 dark:text-white">
                      {monthNames[currentMonthDate.getMonth()]} {currentMonthDate.getFullYear()}
                    </span>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-neutral-400 uppercase">{d}</div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((date, i) => {
                      if (!date) return <div key={`empty-${i}`} className="aspect-square" />
                      
                      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                      const dateStr = localDate.toISOString().split('T')[0]
                      
                      const isSelected = dateStr === selectedDate
                      const dayOff = daysOff.find(d => d.date === dateStr)
                      const daySessions = allSessions.filter(s => s.session_date === dateStr && s.id !== session.id)
                      const isToday = dateStr === new Date().toISOString().split('T')[0]
                      
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`
                            relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all
                            ${isSelected ? 'bg-emerald-500 text-white shadow-md font-bold' : 
                              dayOff ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30' : 
                              'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}
                            ${isToday && !isSelected && !dayOff ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400' : ''}
                          `}
                        >
                          <span>{date.getDate()}</span>
                          
                          {/* Dots for sessions */}
                          {daySessions.length > 0 && !isSelected && !dayOff && (
                            <div className="absolute bottom-1 flex gap-0.5">
                              {daySessions.slice(0, 3).map((_, idx) => (
                                <div key={idx} className="w-1 h-1 rounded-full bg-violet-500" />
                              ))}
                            </div>
                          )}
                          {daySessions.length > 0 && isSelected && !dayOff && (
                            <div className="absolute bottom-1 flex gap-0.5">
                              {daySessions.slice(0, 3).map((_, idx) => (
                                <div key={idx} className="w-1 h-1 rounded-full bg-white" />
                              ))}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Selected Date Schedule */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-violet-500" />
                    Расписание на {new Date(selectedDate).toLocaleDateString('ru-RU')}
                  </h4>
                  {selectedDateSessions.length === 0 ? (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">В этот день пока нет других записей.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDateSessions.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800 p-2.5 rounded-lg text-sm border border-neutral-100 dark:border-neutral-800">
                          <span className="font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-2 py-1 rounded">
                            {s.start_time || '??:??'} - {s.end_time || '??:??'}
                          </span>
                          <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                            {s.master_clients?.name || 'Клиент'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Начало</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Конец</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors border border-emerald-100 dark:border-emerald-900/30">
                <input
                  type="checkbox"
                  checked={sendMessage}
                  onChange={(e) => setSendMessage(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-emerald-300 text-emerald-500 focus:ring-emerald-500 bg-white"
                />
                <div>
                  <p className="text-sm font-bold text-emerald-900 dark:text-emerald-400 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    Автоматическое сообщение
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-600 mt-1">Отправить клиенту приветственное сообщение со стоимостью и временем в чат платформы.</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex gap-3">
          {step > 1 && (
            <button
              onClick={handlePrev}
              disabled={loading}
              className="px-6 py-3 font-bold rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Назад
            </button>
          )}
          <div className="flex-1" />
          {step < 2 ? (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-md"
            >
              Далее
            </button>
          ) : (
            <button
              onClick={handleAccept}
              disabled={loading}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Всё готово!'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
