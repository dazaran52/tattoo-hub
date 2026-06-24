import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Coffee, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export function CalendarView({ items }: { items: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [daysOff, setDaysOff] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDaysOff()
  }, [])

  const fetchDaysOff = async () => {
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/days-off`, {
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
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('sb-access-token='))?.split('=')[1]
      const isOff = daysOff.includes(dateStr)
      
      const method = isOff ? 'DELETE' : 'POST'
      const url = isOff 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/unavailable-dates/${dateStr}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/unavailable-dates`
        
      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }

      if (!isOff) {
        options.body = JSON.stringify({ date: dateStr })
      }

      const res = await fetch(url, options)
      if (res.ok) {
        if (isOff) {
          setDaysOff(prev => prev.filter(d => d !== dateStr))
          toast.success("День снова рабочий")
        } else {
          setDaysOff(prev => [...prev, dateStr])
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

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  
  // Adjust so Monday is 0, Sunday is 6
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

  // Extract items with dates
  const scheduledItems = items.filter(i => i.proposed_dates)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-white/5 p-6 min-h-[75vh]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
          {monthNames[month]} {year}
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 border rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-2 border rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-4 text-sm font-bold text-neutral-500 text-center">
        <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div className="text-red-400">Сб</div><div className="text-red-400">Вс</div>
      </div>

      <div className="grid grid-cols-7 gap-4 auto-rows-fr">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[100px] bg-neutral-50/50 dark:bg-neutral-950/30 rounded-xl" />
          }
          
          const dateObj = new Date(year, month, day)
          // Format as YYYY-MM-DD
          const tzOffset = dateObj.getTimezoneOffset() * 60000; //offset in milliseconds
          const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().split('T')[0]
          
          const dateStr = localISOTime

          const dayItems = scheduledItems.filter(item => {
            if (!item.proposed_dates) return false
            const d = new Date(item.proposed_dates)
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
          })

          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year
          const isOff = daysOff.includes(dateStr)

          return (
            <div 
              key={day} 
              onClick={() => toggleDayOff(dateStr)}
              className={`min-h-[100px] p-2 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${
                isOff 
                  ? 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10' 
                  : isToday 
                    ? 'border-violet-500 bg-violet-50/10' 
                    : 'border-neutral-100 dark:border-white/5 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold ${isOff ? 'text-red-500' : isToday ? 'text-violet-600' : 'text-neutral-500'}`}>
                  {day}
                </span>
                {isOff && <Coffee className="w-4 h-4 text-red-500" />}
              </div>
              <div className="space-y-1">
                {dayItems.map(item => {
                  return (
                    <div 
                      key={item.lead_id} 
                      className={`text-[10px] p-1.5 rounded flex items-center gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300`}
                    >
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{item.leads.title}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl">
        <Coffee className="w-4 h-4" />
        Кликни на любой день, чтобы сделать его выходным. Клиенты не смогут записаться на эту дату.
      </div>
    </div>
  )
}
