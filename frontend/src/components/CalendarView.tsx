import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'

export function CalendarView({ items }: { items: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

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
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {monthNames[month]} {year}
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
          
          const dayItems = scheduledItems.filter(item => {
            const d = new Date(item.proposed_dates) // Assuming it's ISO string or parseable
            return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year
          })

          const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year

          return (
            <div key={day} className={`min-h-[100px] p-2 rounded-xl border ${isToday ? 'border-violet-500 bg-violet-50/10' : 'border-neutral-100 dark:border-white/5 bg-white dark:bg-neutral-900'}`}>
              <div className={`font-bold mb-2 ${isToday ? 'text-violet-600' : 'text-neutral-500'}`}>{day}</div>
              <div className="space-y-1">
                {dayItems.map(item => {
                  const isDayOff = item.leads.title === 'Выходной'
                  return (
                    <div 
                      key={item.lead_id} 
                      className={`text-[10px] p-1.5 rounded flex items-center gap-1 ${
                        isDayOff 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                          : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      }`}
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
    </div>
  )
}
