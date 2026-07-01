import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Coffee, Plus, Calendar as CalendarIcon, PlayCircle, CheckCircle, Trash2, Edit3, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { CRMSession } from './CRMBoard'
import { LiabilityWaiverModal } from './LiabilityWaiverModal'
import { CompleteSessionModal } from './CompleteSessionModal'
import { SessionModal } from './SessionModal'
import { CRMClient } from './ClientsDatabase'

interface DayOff {
  id: string
  date: string
  is_full_day: boolean
  start_time: string | null
  end_time: string | null
}

interface CalendarViewProps {
  sessions: CRMSession[]
  onUpdate: () => void
}

export function CalendarView({ sessions, onUpdate }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [daysOff, setDaysOff] = useState<DayOff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'normal' | 'day_off'>('normal')
  
  // Modals state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sessionToStart, setSessionToStart] = useState<string | null>(null)
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null)
  const [sessionToEdit, setSessionToEdit] = useState<CRMSession | null>(null)
  const [clientNameForWaiver, setClientNameForWaiver] = useState('')
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [clientsForModal, setClientsForModal] = useState<CRMClient[]>([])

  useEffect(() => {
    fetchDaysOff()
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setClientsForModal(await res.json())
    } catch {}
  }

  const fetchDaysOff = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/days-off`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        setDaysOff(await res.json())
      }
    } catch (e) {
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDayOff = async (dateStr: string) => {
    if (calendarMode !== 'day_off') {
      setSelectedDate(dateStr)
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/days-off`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date: dateStr, is_full_day: true })
      })
      if (res.ok) {
        const result = await res.json()
        if (result.status === 'deleted') {
          setDaysOff(prev => prev.filter(d => d.date !== dateStr))
          toast.success("День снова рабочий")
        } else if (result.status === 'created') {
          setDaysOff(prev => [...prev, result.data])
          toast.success("Установлен выходной")
        }
      }
    } catch (e) {
      toast.error("Ошибка сети")
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Удалить сеанс?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      toast.success('Сеанс удален')
      onUpdate()
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    
    // Convert Sunday from 0 to 7 to match Monday-first calendar
    const startDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1
    
    const days = []
    
    for (let i = 0; i < startDayOffset; i++) {
      days.push(null)
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const days = getDaysInMonth(currentDate)
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  const selectedDateSessions = selectedDate ? sessions.filter(s => s.session_date === selectedDate).sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00')) : []

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold w-48 text-center text-neutral-900 dark:text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1.5 rounded-xl">
          <button
            onClick={() => setCalendarMode('normal')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              calendarMode === 'normal' 
                ? 'bg-white dark:bg-neutral-900 text-violet-600 dark:text-violet-400 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            Сеансы
          </button>
          <button
            onClick={() => setCalendarMode('day_off')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              calendarMode === 'day_off' 
                ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            <Coffee className="w-4 h-4" />
            Выходные
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
        {dayNames.map(day => (
          <div key={day} className="text-center font-bold text-neutral-400 text-xs sm:text-sm uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 sm:gap-4">
          {days.map((date, i) => {
            if (!date) {
              return <div key={`empty-${i}`} className="aspect-square rounded-2xl bg-neutral-50/50 dark:bg-neutral-800/10 border border-transparent"></div>
            }

            // Fix timezone issue when comparing dates
            const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
            const dateStr = localDate.toISOString().split('T')[0]
            
            const isToday = new Date().toISOString().split('T')[0] === dateStr
            const daySessions = sessions.filter(s => s.session_date === dateStr)
            const dayOff = daysOff.find(d => d.date === dateStr)

            return (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={dateStr}
                onClick={() => toggleDayOff(dateStr)}
                className={`
                  relative aspect-square rounded-2xl p-2 sm:p-3 border transition-all flex flex-col items-start justify-between
                  ${isToday ? 'border-violet-500 shadow-sm' : 'border-neutral-200 dark:border-neutral-800'}
                  ${dayOff ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-neutral-900 hover:border-violet-300 dark:hover:border-violet-700'}
                  ${calendarMode === 'day_off' ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
                `}
              >
                <span className={`font-bold text-sm sm:text-base ${
                  isToday ? 'text-violet-600 dark:text-violet-400' : 
                  dayOff ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-300'
                }`}>
                  {date.getDate()}
                </span>
                
                {dayOff && calendarMode !== 'day_off' && (
                  <div className="w-full text-center text-xs text-red-500 font-bold bg-red-100 dark:bg-red-900/30 rounded px-1 py-0.5 mt-auto truncate">
                    {dayOff.is_full_day ? 'Выходной' : `${dayOff.start_time?.substring(0,5)} - ${dayOff.end_time?.substring(0,5)}`}
                  </div>
                )}

                {daySessions.length > 0 && !dayOff && (
                  <div className="w-full mt-auto space-y-1">
                    {daySessions.slice(0, 2).map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-[10px] sm:text-xs bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-1 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium truncate w-full">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">{s.start_time ? s.start_time.substring(0,5) : 'Без времени'}</span>
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-[10px] text-neutral-500 font-bold text-center">
                        +{daySessions.length - 2} еще
                      </div>
                    )}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {/* Daily Schedule Sidebar / Modal */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[99999] flex justify-end bg-black/20 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDate(null) }}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              className={`bg-white dark:bg-neutral-900 w-full h-full shadow-2xl flex flex-col transition-all duration-300 pb-24 sm:pb-0 ${isSidebarExpanded ? 'max-w-full' : 'max-w-md'}`}
            >
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-xl text-violet-600 dark:text-violet-400">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Расписание дня</h2>
                    <p className="text-sm text-neutral-500">{new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors" title={isSidebarExpanded ? "Свернуть" : "Развернуть"}>
                    {isSidebarExpanded ? <Minimize2 className="w-5 h-5 text-neutral-400" /> : <Maximize2 className="w-5 h-5 text-neutral-400" />}
                  </button>
                  <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                    <Plus className="w-5 h-5 rotate-45 text-neutral-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-neutral-50 dark:bg-neutral-900/50">
                {selectedDateSessions.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400">
                    На этот день нет записей
                  </div>
                ) : (
                  selectedDateSessions.map(s => (
                    <div key={s.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white text-lg">
                            {s.master_clients?.name}
                          </div>
                          <div className="text-sm text-neutral-500 flex items-center gap-2 mt-1">
                            <Clock className="w-3.5 h-3.5" />
                            {s.start_time || '??:??'} - {s.end_time || '??:??'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded text-xs font-bold uppercase text-neutral-600 dark:text-neutral-400 mb-1">
                            {s.status === 'in_progress' ? 'В процессе' : s.status === 'completed' ? 'Завершен' : s.status === 'booked' ? 'Записан' : s.status}
                          </span>
                          <div className="font-bold text-neutral-900 dark:text-white">{s.price ? `${s.price} Kč` : ''}</div>
                        </div>
                      </div>
                      
                      {s.style && <div className="text-sm text-neutral-500 mb-4">Стиль: {s.style}</div>}
                      {s.reference_images && s.reference_images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto mb-4 custom-scrollbar pb-2">
                          {s.reference_images.map((url, idx) => (
                            <img key={idx} src={url} alt="ref" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-neutral-200 dark:border-neutral-700" />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <div className="flex gap-2">
                          {s.status === 'booked' && (
                            <button 
                              onClick={() => {
                                setClientNameForWaiver(s.master_clients?.name || '')
                                setSessionToStart(s.id)
                              }}
                              className="px-3 py-1.5 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-violet-200 transition-colors"
                            >
                              <PlayCircle className="w-3.5 h-3.5" /> Начать
                            </button>
                          )}
                          {s.status === 'in_progress' && (
                            <button 
                              onClick={() => setSessionToComplete(s.id)}
                              className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-green-200 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" /> Завершить
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSessionToEdit(s)} className="p-1.5 text-neutral-400 hover:text-violet-500 rounded-md transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteSession(s.id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 pb-24 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                <button 
                  onClick={() => setIsSessionModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3.5 rounded-xl hover:bg-neutral-800 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  Добавить сеанс
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {sessionToStart && (
        <LiabilityWaiverModal
          isOpen={!!sessionToStart}
          onClose={() => setSessionToStart(null)}
          sessionId={sessionToStart}
          clientName={clientNameForWaiver}
          onSuccess={() => {
            setSessionToStart(null)
            onUpdate()
          }}
        />
      )}

      {sessionToComplete && (
        <CompleteSessionModal
          isOpen={!!sessionToComplete}
          onClose={() => setSessionToComplete(null)}
          sessionId={sessionToComplete}
          onSuccess={() => {
            setSessionToComplete(null)
            onUpdate()
          }}
        />
      )}

      {isSessionModalOpen && (
        <SessionModal
          isOpen={isSessionModalOpen}
          onClose={() => setIsSessionModalOpen(false)}
          onSuccess={() => {
            setIsSessionModalOpen(false)
            onUpdate()
          }}
          initialDate={selectedDate}
          existingClients={clientsForModal}
        />
      )}

      {sessionToEdit && (
        <SessionModal
          isOpen={!!sessionToEdit}
          onClose={() => setSessionToEdit(null)}
          onSuccess={() => {
            setSessionToEdit(null)
            onUpdate()
          }}
          editSession={sessionToEdit}
          existingClients={clientsForModal}
        />
      )}
    </div>
  )
}
