'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar as CalendarIcon, User, MapPin, FileText, CheckCircle, ArrowLeft, Send, Link as LinkIcon, Instagram, Upload, Loader2, X, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format, parseISO } from 'date-fns'
import { cs, ru, enUS } from 'date-fns/locale'
import { ImageViewerModal } from '@/components/ImageViewerModal'

// Use a subset of Lucide icons or basic SVG if needed
export default function BookMasterPage({ params }: { params: { username: string } }) {
  const router = useRouter()
  const [master, setMaster] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'booking' | 'portfolio'>('booking')
  const [selectedPortfolioImage, setSelectedPortfolioImage] = useState<string | null>(null)

  // Form State
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [description, setDescription] = useState('')
  const [bodyPlace, setBodyPlace] = useState('')
  const [size, setSize] = useState('')
  const [sessionDate, setSessionDate] = useState<Date | undefined>(undefined)
  const [images, setImages] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])
  
  useEffect(() => {
    fetchMasterProfile()
    fetchUnavailableDates()
  }, [params.username])

  const fetchUnavailableDates = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/public/master/${params.username}/unavailable-dates`)
      if (res.ok) {
        const data: string[] = await res.json()
        setUnavailableDates(data.map(d => parseISO(d)))
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchMasterProfile = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/master/${params.username}`)
      
      if (!res.ok) {
        throw new Error('Мастер не найден')
      }
      
      const data = await res.json()
      setMaster(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки профиля')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !contact || !description) {
      alert('Пожалуйста, заполните обязательные поля')
      return
    }

    try {
      setIsSubmitting(true)
      setIsUploading(true)
      
      let imageUrls: string[] = []
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('lead_images')
          .upload(filePath, file)
          
        if (uploadError) {
          console.error('Error uploading image', uploadError)
          continue
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('lead_images')
          .getPublicUrl(filePath)
          
        if (publicUrlData) {
          imageUrls.push(publicUrlData.publicUrl)
        }
      }
      setIsUploading(false)

      const payload = {
        name,
        contact,
        description,
        body_place: bodyPlace,
        size,
        image_urls: imageUrls,
        session_date: sessionDate ? new Date(sessionDate).toISOString() : null,
        assigned_master_id: master.id,
        is_negotiable_budget: true, // Default for personal leads to let them discuss in chat
        is_personal: true
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Ошибка при отправке заявки')
      }

      setIsSuccess(true)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-24 h-24 bg-neutral-200 dark:bg-neutral-800 rounded-full mb-4"></div>
          <div className="w-48 h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-2"></div>
          <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !master) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-neutral-200 dark:border-neutral-800">
          <User className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Страница не найдена</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            На главную
          </button>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Заявка отправлена!</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">
            Мастер получил вашу идею и свяжется с вами в ближайшее время для обсуждения деталей и цены.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            Отправить еще одну
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* Profile Card */}
        <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 shadow-2xl rounded-3xl p-8 mb-8 text-center">
          <div className="w-28 h-28 bg-gradient-to-br from-neutral-200 dark:from-neutral-800 to-neutral-300 dark:to-neutral-700 rounded-full mx-auto mb-5 flex items-center justify-center border-4 border-white dark:border-neutral-950 shadow-xl">
            <User className="w-12 h-12 text-neutral-500" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">
            {master.display_name || master.username || 'Мастер'}
          </h1>
          
          {master.bio && (
            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6">
              {master.bio}
            </p>
          )}

          {master.portfolio_url && (
            <a 
              href={master.portfolio_url.startsWith('http') ? master.portfolio_url : `https://${master.portfolio_url}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-full transition-colors font-medium text-sm"
            >
              {master.portfolio_url.includes('instagram') ? (
                <Instagram className="w-4 h-4" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              Смотреть внешнее портфолио
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-neutral-100 dark:bg-neutral-900 p-1.5 rounded-2xl max-w-sm mx-auto relative z-10">
          <button
            onClick={() => setActiveTab('booking')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'booking'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-neutral-800/50'
            }`}
          >
            Запись на сеанс
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === 'portfolio'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-white/50 dark:hover:bg-neutral-800/50'
            }`}
          >
            Портфолио
          </button>
        </div>

        {activeTab === 'booking' ? (
        <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 shadow-xl rounded-3xl p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Запись на сеанс</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Опишите свою идею, и мастер свяжется с вами.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Ваше имя *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Иванов"
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Телефон или Telegram *
                </label>
                <div className="relative">
                  <Send className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="@username или +420..."
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Место на теле
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="text"
                    value={bodyPlace}
                    onChange={(e) => setBodyPlace(e.target.value)}
                    placeholder="Например: Предплечье"
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Примерный размер (см)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    placeholder="Например: 15x10 см"
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Идея татуировки *
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3.5 w-5 h-5 text-neutral-400" />
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите что хотите набить, размер и место..."
                  rows={4}
                  className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-11 pr-4 py-3.5 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all resize-none shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Желаемая дата (Необязательно)
              </label>
              <div className="relative bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex justify-center shadow-inner overflow-hidden">
                <style>{`
                  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #06b6d4; --rdp-background-color: #cffafe; margin: 0; }
                  .dark .rdp { --rdp-accent-color: #06b6d4; --rdp-background-color: #164e63; }
                  .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover { background-color: var(--rdp-accent-color); color: white; }
                  .rdp-day_disabled { opacity: 0.3; text-decoration: line-through; }
                `}</style>
                <DayPicker
                  mode="single"
                  selected={sessionDate}
                  onSelect={setSessionDate}
                  disabled={[
                    { before: new Date() },
                    ...unavailableDates
                  ]}
                  locale={ru} // TODO: dynamic locale based on user lang
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                Фото-референсы (До 3 шт)
              </label>
              <div className="flex flex-wrap gap-4">
                {images.map((file, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                    <img src={URL.createObjectURL(file)} alt="ref" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {images.length < 3 && (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center text-neutral-500 hover:text-cyan-500 hover:border-cyan-500 transition-colors cursor-pointer bg-white dark:bg-neutral-950">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Добавить</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files) {
                          const newFiles = Array.from(e.target.files)
                          setImages(prev => [...prev, ...newFiles].slice(0, 3))
                        }
                      }} 
                    />
                  </label>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-4 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {(isSubmitting || isUploading) ? (
                <div className="w-6 h-6 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
              ) : (
                'Отправить заявку'
              )}
            </button>
            <p className="text-center text-xs text-neutral-500">
              Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных
            </p>
          </form>
        </div>
        ) : (
          <div className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 shadow-xl rounded-3xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Портфолио</h2>
            {master.portfolio_image_urls && master.portfolio_image_urls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {master.portfolio_image_urls.map((url: string, idx: number) => (
                  <div 
                    key={`port-${idx}`} 
                    onClick={() => setSelectedPortfolioImage(url)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 shadow-md cursor-pointer"
                  >
                    <img src={url} alt={`Portfolio ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-full shadow-lg">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Мастер пока не добавил фото в портфолио</p>
              </div>
            )}
          </div>
        )}
      </div>

      <ImageViewerModal
        isOpen={!!selectedPortfolioImage}
        imageUrl={selectedPortfolioImage}
        onClose={() => setSelectedPortfolioImage(null)}
        showActions={false}
      />
    </div>
  )
}
