import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Coffee, Loader2, Edit3, CalendarPlus, X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { CRMClient } from './CRMBoard'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

interface DayOff {
  id: string
  date: string
  is_full_day: boolean
  start_time: string | null
  end_time: string | null
}

export function CalendarView({ items, onDateClick }: { items: CRMClient[], onDateClick: (date: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [daysOff, setDaysOff] = useState<DayOff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'normal' | 'day_off'>('normal')
  
  // Day Off Edit Modal State
  const [editingDayOff, setEditingDayOff] = useState<DayOff | null>(null)
  const [editStartTime, setEditStartTime] = useState('')
  const [editEndTime, setEditEndTime] = useState('')

  useEffect(() => {
    fetchDaysOff()
  }, [])

  const fetchDaysOff = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/days-off`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setDaysOff(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleDayOff = async (dateStr: string) => {
    if (calendarMode !== 'day_off') {
      // In normal mode, clicking a date opens manual client modal for that date
      // Currently implemented via event bubbling to parent component or using global store
      // But we can fire an event. Actually we'll just show the manual client modal.
      const event = new CustomEvent('openManualClientModal', { detail: { date: dateStr } });
      window.dispatchEvent(event);
      return;
    }

    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
      
      const payload = {
        date: dateStr,
        is_full_day: true
      }
        
      const options: RequestInit = {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/days-off`, options)
      if (res.ok) {
        const result = await res.json()
        if (result.status === 'deleted') {
          setDaysOff(prev => prev.filter(d => d.date !== dateStr))
          toast.success("День снова рабочий")
        } else if (result.status === 'created') {
          setDaysOff(prev => [...prev, result.data])
          toast.success("Установлен выходной")
        }
      } else {
        toast.error("Ошибка при изменении статуса дня")
      }
    } catch (e) {
      console.error(e)
      toast.error("Ошибка сети")
    }
  }

  const saveSpecificHours = async () => {
    if (!editingDayOff) return;
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
      
      const payload = {
        date: editingDayOff.date,
        is_full_day: false,
        start_time: editStartTime || null,
        end_time: editEndTime || null
      }
        
      const options: RequestInit = {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/days-off`, options)
      if (res.ok) {
        const result = await res.json()
        setDaysOff(prev => prev.map(d => d.date === editingDayOff.date ? result.data : d))
        toast.success("Часы сохранены")
        setEditingDayOff(null)
      }
    } catch (e) {
      console.error(e)
      toast.error("Ошибка сети")
    }
  }

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay()

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  
  let firstDay = getFirstDayOfMonth(year, month) - 1
  if (firstDay === -1) firstDay = 6

  const days = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 p-6 min-h-[75vh]">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          {monthNames[month]} {year}
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />}
        </h2>
        
        <div className="flex gap-4 items-center">
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
            <button 
              onClick={() => setCalendarMode('normal')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${calendarMode === 'normal' ? 'bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            >
              <CalendarPlus className="w-4 h-4"/>
              Запись клиента
            </button>
            <button 
              onClick={() => setCalendarMode('day_off')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${calendarMode === 'day_off' ? 'bg-red-500 text-white shadow-sm' : 'text-neutral-500 hover:text-red-500/70'}`}
            >
              <Coffee className="w-4 h-4"/>
              Выходные
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-4 text-sm font-bold text-neutral-500 text-center">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div className="text-red-400">Сб</div><div className="text-red-400">Вс</div>
      </div>

      <div className="grid grid-cols-7 gap-2 md:gap-4 auto-rows-fr">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[100px] bg-neutral-50/50 dark:bg-neutral-950/30 rounded-xl" />
          }
          
          const dateObj = new Date(year, month, day)
          const tzOffset = dateObj.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().split('T')[0]
          const dateStr = localISOTime

          // Find sessions for this day
          const daySessions: {client: CRMClient, session: any}[] = []
          items.forEach(client => {
            if (client.master_sessions) {
              client.master_sessions.forEach(session => {
                if (session.session_date === dateStr) {
                  daySessions.push({client, session})
                }
              })
            }
          })

          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
          const offRecord = daysOff.find(d => d.date === dateStr)
          const isOff = !!offRecord

          return (
            <div 
              key={day} 
              onClick={() => toggleDayOff(dateStr)}
              className={`min-h-[100px] p-2 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 group relative ${
                isOff 
                  ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10' 
                  : isToday 
                    ? 'border-violet-500 bg-violet-50/10' 
                    : 'border-neutral-100 dark:border-white/5 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex flex-col mb-3">
                <div className="flex items-center justify-between">
                  <span className={`font-bold ${isOff ? 'text-red-500' : isToday ? 'text-violet-600' : 'text-neutral-500'}`}>
                    {day}
                  </span>
                  
                  {isOff && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingDayOff(offRecord)
                          setEditStartTime(offRecord.start_time || '')
                          setEditEndTime(offRecord.end_time || '')
                        }}
                        className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded transition-colors"
                      >
                        <Edit3 className="w-4 h-4 text-red-500" />
                      </button>
                      <Coffee className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                
                {isOff && !offRecord.is_full_day && (
                  <div className="mt-1">
                    <span className="text-[10px] font-bold text-red-500 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">
                      {offRecord.start_time?.slice(0,5)} - {offRecord.end_time?.slice(0,5)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                {daySessions.map(({client, session}) => (
                  <div 
                    key={session.id} 
                    className={`text-[10px] p-1.5 rounded flex flex-col gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300`}
                  >
                    <div className="flex items-center gap-1 font-bold">
                      <span className="truncate">{client.name}</span>
                    </div>
                    {session.start_time && (
                      <div className="flex items-center gap-1 opacity-80">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{session.start_time.slice(0,5)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Overlay hover effect in normal mode */}
              {calendarMode === 'normal' && !isOff && (
                <div className="absolute inset-0 bg-violet-500/0 hover:bg-violet-500/5 rounded-xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Plus className="w-6 h-6 text-violet-500" />
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl">
        {calendarMode === 'day_off' ? (
          <><Coffee className="w-4 h-4" /> В режиме "Выходные" кликните на день, чтобы отметить его нерабочим. Используйте карандаш для указания часов.</>
        ) : (
          <><CalendarPlus className="w-4 h-4" /> В режиме "Запись клиента" кликните на любой день, чтобы добавить сеанс.</>
        )}
      </div>

      {/* Edit Day Off Modal */}
      <AnimatePresence>
        {editingDayOff && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
             <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Часы выходного</h3>
                  <button onClick={() => setEditingDayOff(null)} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl">
                    <X className="w-5 h-5 text-neutral-500" />
                  </button>
                </div>
                
                <p className="text-sm text-neutral-500 mb-6">
                  Укажите время, когда вы будете заняты {editingDayOff.date}. В остальное время клиенты смогут записаться.
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-neutral-500 uppercase">Начало</label>
                      <input 
                        type="time" 
                        value={editStartTime}
                        onChange={e => setEditStartTime(e.target.value)}
                        className="mt-1 w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-violet-500 text-neutral-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-neutral-500 uppercase">Конец</label>
                      <input 
                        type="time" 
                        value={editEndTime}
                        onChange={e => setEditEndTime(e.target.value)}
                        className="mt-1 w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-violet-500 text-neutral-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={saveSpecificHours}
                    className="w-full py-4 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/30"
                  >
                    Сохранить
                  </button>
                  <button 
                    onClick={async () => {
                      // Switch back to full day
                      setEditStartTime('')
                      setEditEndTime('')
                      setEditingDayOff({...editingDayOff, is_full_day: true, start_time: null, end_time: null} as any)
                    }}
                    className="w-full py-2 text-neutral-500 font-bold hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors text-sm"
                  >
                    Сделать выходным весь день
                  </button>
                </div>
              </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Plus({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
}
