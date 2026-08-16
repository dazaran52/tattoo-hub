import { useTranslations } from "next-intl";
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, Coffee, Plus, Calendar as CalendarIcon, PlayCircle, CheckCircle, Trash2, Edit3, Loader2, Maximize2, Minimize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { CRMSession } from './CRMBoard'
import { LiabilityWaiverModal } from './LiabilityWaiverModal'
import { CompleteSessionModal } from './CompleteSessionModal'
import { ImageViewerModal } from './ImageViewerModal'
import { EmptyState } from '@/components/EmptyState'

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
  onSessionClick: (session: CRMSession) => void
  onCreateSession: () => void
  onSessionComplete: (id: string) => void
}

export function CalendarView({ sessions, onUpdate, onSessionClick, onCreateSession, onSessionComplete }: CalendarViewProps) {
    const t = useTranslations();
  const [currentDate, setCurrentDate] = useState(new Date())
  const [daysOff, setDaysOff] = useState<DayOff[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [calendarMode, setCalendarMode] = useState<'normal' | 'day_off'>('normal')
  
  // Modals state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sessionToStart, setSessionToStart] = useState<string | null>(null)
  const [clientNameForWaiver, setClientNameForWaiver] = useState('')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [viewerImage, setViewerImage] = useState<string | null>(null)

  useEffect(() => {
    fetchDaysOff()
  }, [])

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
          toast.success(t('Auto.text_451922'))
        } else if (result.status === 'created') {
          setDaysOff(prev => [...prev, result.data])
          toast.success(t('Auto.text_18bca9'))
        }
      }
    } catch (e) {
      toast.error(t('Auto.text_4920f0'))
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm(t('Auto.text_cd8c9f'))) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      toast.success(t('Auto.text_dd99a3'))
      onUpdate()
    } catch {
      toast.error(t('crmBoard.deleteError'))
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
  const monthNames = [t('Auto.text_ee8620'), t('Auto.text_28ffcf'), t('Auto.text_d766d4'), t('Auto.text_03e90d'), t('Auto.text_2e53bf'), t('Auto.text_cfcb9c'), t('Auto.text_89fb2f'), t('Auto.text_de5ab5'), t('Auto.text_ebfbae'), t('Auto.text_17208f'), t('Auto.text_66fbc4'), t('Auto.text_39b3dc')]
  const dayNames = [t('Auto.text_2c1ec3'), t('Auto.text_714517'), t('Auto.text_c6e47c'), t('Auto.text_a51f2e'), t('Auto.text_012388'), t('Auto.text_3a4b2b'), t('Auto.text_4ad91d')]

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
                ? 'bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {t('crmBoard.tabSessions')}
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
            {t('Auto.text_f38afb')}
                                </button>
        </div>
      </div>

      {calendarMode === 'day_off' && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm flex items-start sm:items-center gap-3 border border-red-100 dark:border-red-900/30">
          <Coffee className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
          <p><strong>{t('Auto.text_0443c5')}</strong> {t('Auto.text_73e1ed')}</p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-4">
        {dayNames.map(day => (
          <div key={day} className="text-center font-bold text-neutral-400 text-xs sm:text-sm uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-2 sm:gap-4 animate-pulse">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200/50 dark:border-neutral-800 p-2 sm:p-3 flex flex-col justify-between">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-6"></div>
              <div className="h-3 bg-neutral-200/60 dark:bg-neutral-700/60 rounded w-3/4"></div>
            </div>
          ))}
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
                  ${isToday ? 'border-primary-500 shadow-sm' : 'border-neutral-200 dark:border-neutral-800'}
                  ${dayOff ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-primary-700'}
                  ${calendarMode === 'day_off' ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
                `}
              >
                <span className={`font-bold text-sm sm:text-base ${
                  isToday ? 'text-primary-600 dark:text-primary-400' : 
                  dayOff ? 'text-red-500' : 'text-neutral-700 dark:text-neutral-300'
                }`}>
                  {date.getDate()}
                </span>
                
                {dayOff && calendarMode !== 'day_off' && (
                  <div className="w-full text-center text-xs text-red-500 font-bold bg-red-100 dark:bg-red-900/30 rounded px-1 py-0.5 mt-auto truncate">
                    {dayOff.is_full_day ? t('Auto.text_cff546') : `${dayOff.start_time?.substring(0,5)} - ${dayOff.end_time?.substring(0,5)}`}
                  </div>
                )}

                {daySessions.length > 0 && !dayOff && (
                  <div className="w-full mt-auto space-y-1">
                    {daySessions.slice(0, 2).map((s, idx) => (
                      <div key={idx} className={`flex items-center gap-1 text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium truncate w-full ${s.status === 'new' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'}`}>
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">{s.start_time ? s.start_time.substring(0,5) : t('Auto.text_d45b5c')}</span>
                      </div>
                    ))}
                    {daySessions.length > 2 && (
                      <div className="text-[10px] text-neutral-500 font-bold text-center">
                        +{daySessions.length - 2} {t('Auto.text_ff5a4e')}
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
          <div className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedDate(null) }}>
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              className={`bg-white dark:bg-neutral-900 w-full h-full shadow-2xl flex flex-col transition-[max-width] duration-300 pb-24 sm:pb-0 ${isSidebarExpanded ? 'max-w-full' : 'max-w-md'}`}
            >
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t('Auto.text_716cbc')}</h2>
                    <p className="text-sm text-neutral-500">{new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors" title={isSidebarExpanded ? t('Auto.text_ca9f19') : t('Auto.text_3fbb81')}>
                    {isSidebarExpanded ? <Minimize2 className="w-5 h-5 text-neutral-400" /> : <Maximize2 className="w-5 h-5 text-neutral-400" />}
                  </button>
                  <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                    <Plus className="w-5 h-5 rotate-45 text-neutral-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-neutral-50 dark:bg-neutral-900/50">
                {selectedDateSessions.length === 0 ? (
                  <EmptyState
                    variant="compact"
                    icon={<CalendarIcon className="w-8 h-8" />}
                    title={t('Auto.text_fdebc0')}
                    description={t('Auto.text_76b984')}
                  />
                ) : (
                  <div className={isSidebarExpanded ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-4"}>
                    {selectedDateSessions.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => onSessionClick(s)}
                        className={`bg-white dark:bg-neutral-800 border rounded-2xl p-4 shadow-sm h-full flex flex-col cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] ${s.status === 'new' ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'}`}
                      >
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
                            {s.status === 'in_progress' ? t('crmBoard.columns.in_progress') : s.status === 'completed' ? t('Auto.text_00219e') : s.status === 'booked' ? t('Auto.text_277bbc') : s.status}
                          </span>
                          <div className="font-bold text-neutral-900 dark:text-white">{s.price ? `${s.price} Kč` : ''}</div>
                        </div>
                      </div>
                      
                      {s.style && <div className="text-sm text-neutral-500 mb-4">{t('styleLabel')} {s.style}</div>}
                      {s.reference_images && s.reference_images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto mb-4 custom-scrollbar pb-2" onClick={(e) => e.stopPropagation()}>
                          {s.reference_images.map((url, idx) => (
                            <Image key={idx} src={url || ''} alt="ref" onClick={() => setViewerImage(url)} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-neutral-200 dark:border-neutral-700 cursor-pointer"  width={64} height={64} />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 w-full justify-between">
                          <div className="flex gap-2">
                            {s.status === 'new' && (
                              <button 
                                onClick={() => onSessionClick(s)}
                                className="px-3 py-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-emerald-200 transition-colors w-full"
                              >
                                {t('Auto.text_12650b')}
                                                                              </button>
                            )}
                            {s.status === 'booked' && (
                              <button 
                                onClick={() => {
                                  setClientNameForWaiver(s.master_clients?.name || '')
                                  setSessionToStart(s.id)
                                }}
                                className="px-3 py-1.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-primary-200 transition-colors"
                              >
                                <PlayCircle className="w-3.5 h-3.5" /> {t('onboarding.onb_start')}
                                                                              </button>
                            )}
                            {s.status === 'in_progress' && (
                              <button 
                                onClick={() => onSessionComplete(s.id)}
                                className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-green-200 transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> {t('Auto.text_b0e3a5')}
                                                                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {s.status !== 'new' && (
                              <button onClick={() => onSessionClick(s)} className="p-1.5 text-neutral-400 hover:text-primary-500 rounded-md transition-colors" title={t('edit')}>
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDeleteSession(s.id)} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md transition-colors" title={t('delete')}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 mt-auto">
                <button 
                  onClick={onCreateSession}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3.5 rounded-xl hover:bg-neutral-800 transition-all shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  {t('Auto.text_d650b9')}
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



      <ImageViewerModal
        isOpen={!!viewerImage}
        imageUrl={viewerImage}
        onClose={() => setViewerImage(null)}
        showActions={true}
      />
    </div>
  )
}
