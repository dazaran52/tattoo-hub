'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar as CalendarIcon, User, MapPin, FileText, CheckCircle, 
  ArrowLeft, Send, Link as LinkIcon, AtSign, Upload, Loader2,
  X, Image as ImageIcon, ChevronRight, Phone, Clock, DollarSign, 
  Sparkles, AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, Share2, ShieldCheck, Mail
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TATTOO_STYLES, BODY_PLACES, TATTOO_SIZES } from '@/lib/constants'
import imageCompression from 'browser-image-compression'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export interface LeadWizardProps {
  master?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  source?: 'platform' | 'personal';
  themeClasses?: {
    card?: string;
    input?: string;
    buttonPrimary?: string;
  };
  onSuccess?: () => void;
}

const defaultThemeClasses = {
  card: 'bg-neutral-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-white',
  input: 'bg-black/50 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500',
  buttonPrimary: 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40',
};

function ImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const previewUrl = React.useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

  return (
    <div className="relative group aspect-square rounded-2xl overflow-hidden border border-white/20 bg-black/50 shadow-md">
      <img
        src={previewUrl}
        alt={file.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Удалить ${file.name}`}
        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 flex flex-col items-center justify-center text-red-400 hover:text-red-300 cursor-pointer gap-1"
      >
        <X className="w-7 h-7" />
        <span className="text-[11px] font-bold">Удалить</span>
      </button>
    </div>
  )
}

export function LeadWizard({ master, source = 'platform', themeClasses, onSuccess }: LeadWizardProps) {
  const router = useRouter()
  const tClasses = { ...defaultThemeClasses, ...themeClasses }

  // Гарантированные структурные классы, которые никогда не затираются внешними темами
  const baseCardClass = `w-full rounded-3xl p-6 sm:p-8 md:p-10 transition-all duration-500 relative overflow-hidden ${tClasses.card}`
  const baseInputClass = `w-full rounded-2xl px-4 py-3.5 text-sm sm:text-base transition-all shadow-inner focus:outline-none focus:ring-2 ${tClasses.input}`
  const baseButtonClass = `w-full sm:w-auto min-w-[220px] px-8 py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${tClasses.buttonPrimary}`

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // Accordions State
  const [openStep1Details, setOpenStep1Details] = useState(false)
  const [openStep2Details, setOpenStep2Details] = useState(false)
  const [openStep3Details, setOpenStep3Details] = useState(false)

  // Form State
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [styles, setStyles] = useState<string[]>([])
  const [bodyPlace, setBodyPlace] = useState('')
  const [size, setSize] = useState('')

  const [clientPriority, setClientPriority] = useState<'fast' | 'quality' | 'cheap'>('quality')
  const [budgetVal, setBudgetVal] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [sessionDate, setSessionDate] = useState<Date | undefined>(undefined)
  const [sessionTime, setSessionTime] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [instagram, setInstagram] = useState('')

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [loginLink, setLoginLink] = useState<string | null>(null)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [isPublishingMarketplace, setIsPublishingMarketplace] = useState(false)
  const [isPublishedToMarketplace, setIsPublishedToMarketplace] = useState(false)

  // Master unavailable dates
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])

  useEffect(() => {
    if (!master?.id) return
    const fetchUnavailable = async () => {
      try {
        const identifier = master.username || master.id
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/public/master/${identifier}/unavailable-dates`)
        if (res.ok) {
          const data: string[] = await res.json()
          setUnavailableDates(data.map(d => new Date(d)))
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchUnavailable()
  }, [master?.id, master?.username])

  useEffect(() => {
    if (styles.length > 0 || bodyPlace || size) setOpenStep1Details(true)
  }, [styles.length, bodyPlace, size])

  useEffect(() => {
    if (sessionDate || sessionTime) setOpenStep2Details(true)
  }, [sessionDate, sessionTime])

  useEffect(() => {
    if (contact || instagram) setOpenStep3Details(true)
  }, [contact, instagram])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const newFiles = Array.from(e.target.files)
    if (images.length + newFiles.length > 10) {
      toast.error('Можно загрузить не более 10 фотографий')
      return
    }

    setIsUploading(true)
    try {
      const compressedFiles: File[] = []
      for (const file of newFiles) {
        if (!file.type.startsWith('image/')) continue
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        }
        const compressed = await imageCompression(file, options)
        compressedFiles.push(compressed)
      }
      setImages(prev => [...prev, ...compressedFiles])
    } catch (err) {
      console.error(err)
      toast.error('Ошибка при обработке изображения')
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const validateStep1 = () => {
    if (!description.trim()) {
      toast.error('Пожалуйста, опишите вашу идею татуировки')
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!isNegotiable && (!budgetVal || !budgetVal.trim() || isNaN(parseInt(budgetVal, 10)) || parseInt(budgetVal, 10) <= 0)) {
      toast.error('Пожалуйста, укажите ориентировочный бюджет или выберите опцию "Договорная цена"')
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!name.trim()) {
      toast.error('Пожалуйста, укажите ваше имя')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Пожалуйста, укажите корректный email для создания личного кабинета')
      return false
    }
    return true
  }

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) setStep(2)
    } else if (step === 2) {
      if (validateStep2()) setStep(3)
    }
  }

  const handleBeforeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep1() || !validateStep2() || !validateStep3()) return

    const missingRecommended = styles.length === 0 || !bodyPlace.trim() || !size.trim() || !sessionDate
    if (missingRecommended && !showWarningModal) {
      setShowWarningModal(true)
      return
    }

    executeSubmit()
  }

  const uploadPhotosToSupabase = async (): Promise<string[]> => {
    if (uploadedUrls.length > 0 && images.length === 0) return uploadedUrls
    const urls: string[] = []
    for (const file of images) {
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
      const filePath = `leads/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('portfolio')
        .upload(filePath, file)

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath)
        urls.push(publicUrl)
      }
    }
    setUploadedUrls(urls)
    return urls
  }

  const executeSubmit = async () => {
    setShowWarningModal(false)
    setIsSubmitting(true)
    const toastId = toast.loading('Отправляем заявку и создаем личный кабинет...')

    try {
      const finalImageUrls = await uploadPhotosToSupabase()

      const parsedVal = budgetVal && !isNaN(parseInt(budgetVal, 10)) ? parseInt(budgetVal, 10) : null
      const budgetStr = isNegotiable ? 'Договорная цена' : (budgetVal ? `${budgetVal} CZK` : null)

      const payload = {
        description: description.trim(),
        email: email.trim() || null,
        style: styles.length > 0 ? styles.join(', ') : null,
        location: null,
        body_place: bodyPlace.trim() || null,
        size: size.trim() || null,
        budget: budgetStr,
        budget_val: isNegotiable ? null : parsedVal,
        budget_currency: 'CZK',
        client_priority: clientPriority,
        city: null,
        country_id: null,
        name: name.trim() || 'Без имени',
        contact: contact.trim() || email.trim() || null,
        instagram: instagram.trim() || null,
        is_negotiable_budget: isNegotiable,
        image_urls: finalImageUrls,
        session_date: sessionDate ? sessionDate.toISOString() : null,
        session_time: sessionTime || null,
        client_name: name.trim() || null,
      }

      const isDirectBooking = Boolean(master && source === 'personal')
      const endpoint = isDirectBooking
        ? `/api/leads/client/direct/${master!.id}`
        : '/api/leads/client'
      const { data: { session } } = await supabase.auth.getSession()
      if (isDirectBooking && !session) {
        throw new Error('Войдите в аккаунт, чтобы записаться к выбранному мастеру')
      }
      if (!session) {
        localStorage.setItem('pending_lead', JSON.stringify({
          ...payload,
          created_at: Date.now()
        }))
        toast.success('Заявка сохранена. Войдите, чтобы безопасно опубликовать её.', { id: toastId })
        window.location.href = '/login?next=/dashboard'
        return
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      headers.Authorization = `Bearer ${session.access_token}`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Не удалось отправить заявку')
      }

      const resData = await res.json()
      if (resData.login_link) {
        setLoginLink(resData.login_link)
      }

      toast.success('Заявка успешно отправлена!', { id: toastId })
      setIsSuccess(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Произошла ошибка при отправке', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitToMarketplace = async () => {
    if (isPublishedToMarketplace || isPublishingMarketplace) return
    setIsPublishingMarketplace(true)
    const toastId = toast.loading('Публикуем заявку на маркетплейсе...')

    try {
      const parsedVal = budgetVal && !isNaN(parseInt(budgetVal, 10)) ? parseInt(budgetVal, 10) : null
      const budgetStr = isNegotiable ? 'Договорная цена' : (budgetVal ? `${budgetVal} CZK` : null)

      const payload = {
        description: description.trim(),
        email: email.trim() || null,
        style: styles.length > 0 ? styles.join(', ') : null,
        location: null,
        body_place: bodyPlace.trim() || null,
        size: size.trim() || null,
        budget: budgetStr,
        budget_val: isNegotiable ? null : parsedVal,
        budget_currency: 'CZK',
        client_priority: clientPriority,
        city: null,
        country_id: null,
        name: name.trim() || 'Без имени',
        contact: contact.trim() || email.trim() || null,
        instagram: instagram.trim() || null,
        is_negotiable_budget: isNegotiable,
        image_urls: uploadedUrls,
        session_date: sessionDate ? sessionDate.toISOString() : null,
        session_time: sessionTime || null,
        client_name: name.trim() || null,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Ошибка публикации на маркетплейсе')

      toast.success('Заявка опубликована на маркетплейсе! Другие мастера смогут откликнуться.', { id: toastId })
      setIsPublishedToMarketplace(true)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Ошибка при публикации', { id: toastId })
    } finally {
      setIsPublishingMarketplace(false)
    }
  }

  const handleTrackLead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        router.push('/dashboard')
        return
      }
    } catch (e) {
      console.error(e)
    }

    if (loginLink && loginLink !== 'https://tattoo-hub.xyz/login') {
      window.location.href = loginLink
    } else {
      router.push(`/login?email=${encodeURIComponent(email)}`)
    }
  }

  if (isSuccess) {
    return (
      <div className={`${baseCardClass} text-center py-12 px-6 max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-500`}>
        <div className="w-24 h-24 bg-gradient-to-tr from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
          <CheckCircle className="w-12 h-12 animate-bounce" />
        </div>

        <h3 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">Заявка принята! 🎉</h3>
        <p className="text-neutral-300 text-base mb-8 max-w-md mx-auto leading-relaxed">
          {master && source === 'personal' ? (
            <>Ваша идея направлена мастеру <strong className="text-white font-bold">{master.full_name || master.username}</strong>. Мы уже создали для вас личный кабинет для общения и отслеживания статуса сеанса.</>
          ) : (
            <>Ваша идея успешно опубликована на маркетплейсе! Проверенные мастера со всей платформы изучат её и предложат вам свои условия в личном кабинете.</>
          )}
        </p>

        {master && source === 'personal' && !isPublishedToMarketplace && (
          <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-cyan-500/15 border border-purple-500/40 rounded-3xl p-6 mb-8 text-left transition-all hover:border-purple-500/60 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 text-purple-300 rounded-2xl mt-0.5 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-base sm:text-lg mb-1 flex items-center flex-wrap gap-2">
                  Отправить также на маркетплейс
                  <span className="text-[10px] bg-purple-500/30 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">Бесплатно</span>
                </h4>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-5">
                  Хотите получить предложения от других топовых мастеров площадки? Мы продублируем вашу идею в общую ленту маркетплейса в 1 клик.
                </p>
                <button
                  type="button"
                  onClick={submitToMarketplace}
                  disabled={isPublishingMarketplace}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPublishingMarketplace && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Share2 className="w-4 h-4" />
                  Опубликовать на маркетплейсе
                </button>
              </div>
            </div>
          </div>
        )}

        {isPublishedToMarketplace && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-inner">
            <Check className="w-5 h-5 text-green-400 shrink-0" />
            Заявка также успешно опубликована на маркетплейсе!
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleTrackLead}
            className="w-full py-5 px-8 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-2xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <ShieldCheck className="w-6 h-6" />
            Перейти к заявке и чату с мастером ➔
          </button>
          <p className="text-xs sm:text-sm text-neutral-400">
            Вход выполнится мгновенно и безопасно по защищенной ссылке для <span className="text-cyan-400 font-semibold underline">{email}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Warning Modal for Missing Recommended Fields */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-neutral-900 border border-yellow-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-white shadow-2xl"
            >
              <div className="w-16 h-16 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-2xl flex items-center justify-center mb-5 mx-auto shadow-lg">
                <AlertTriangle className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-2 tracking-tight">Заполнены не все детали</h3>
              <p className="text-sm sm:text-base text-neutral-300 text-center mb-8 leading-relaxed">
                Вы не указали некоторые рекомендуемые параметры (стиль, место, размер или дату сеанса). С ними мастеру будет гораздо проще оценить время и стоимость работы.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-4 px-5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-2xl transition-all text-center cursor-pointer"
                >
                  Вернуться и дополнить
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  className="flex-1 py-4 px-5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-extrabold text-sm rounded-2xl shadow-lg shadow-yellow-500/20 transition-all text-center cursor-pointer"
                >
                  Отправить как есть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={baseCardClass}>
        {/* Sleek Step Indicator & Progress Bar */}
        <div className="mb-8 sm:mb-10">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            {[
              { num: 1, title: 'Идея', subtitle: 'Эскиз и стиль' },
              { num: 2, title: 'Условия', subtitle: 'Бюджет и дата' },
              { num: 3, title: 'Контакты', subtitle: 'Личный кабинет' }
            ].map((st) => {
              const isActive = step === st.num
              const isDone = step > st.num
              return (
                <div 
                  key={st.num}
                  onClick={() => isDone && setStep(st.num as any)}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                    isActive 
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                      : isDone 
                        ? 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 cursor-pointer' 
                        : 'bg-black/20 border-white/5 text-neutral-500 opacity-60'
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 transition-colors ${
                    isActive ? 'bg-cyan-500 text-black' : isDone ? 'bg-green-500 text-black' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {isDone ? <Check className="w-5 h-5 stroke-[3]" /> : st.num}
                  </div>
                  <div className="hidden sm:block overflow-hidden">
                    <div className="text-xs sm:text-sm font-bold truncate leading-tight">{st.title}</div>
                    <div className="text-[10px] sm:text-xs text-neutral-400 truncate mt-0.5">{st.subtitle}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden p-0.5 border border-white/10">
            <motion.div
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 h-full rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
              initial={{ width: '33%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>

        <form onSubmit={handleBeforeSubmit} className="space-y-8">
          {/* STEP 1: IDEA & REFERENCES */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-8"
            >
              <div>
                <label className="block text-base sm:text-lg font-bold text-white mb-2">
                  Опишите вашу идею татуировки <span className="text-red-500">*</span>
                </label>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4 leading-relaxed">
                  Что именно вы хотите набить? Есть ли пожелания по элементам, атмосфере или деталям?
                </p>
                <div className="relative">
                  <FileText className="absolute right-4 top-4 w-5 h-5 text-neutral-500 pointer-events-none" />
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Например: Хочу реалистичного волка на плече с элементами хвойного леса на заднем плане. Желательно сделать акцент на взгляд..."
                    rows={5}
                    className={`${baseInputClass} pr-12 min-h-[140px] resize-none leading-relaxed text-base`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-base sm:text-lg font-bold text-white">
                    Фото-референсы или эскизы <span className="text-neutral-400 font-normal text-sm">(до 10 шт)</span>
                  </label>
                  {images.length > 0 && (
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
                      Загружено: {images.length} / 10
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4 leading-relaxed">
                  Прикрепите примеры работ, стиль или то, что вас вдохновляет. Мастеру будет проще понять вашу задумку.
                </p>

                {images.length === 0 ? (
                  <label className="w-full p-8 sm:p-12 rounded-3xl border-2 border-dashed border-white/20 hover:border-cyan-500/60 bg-gradient-to-b from-white/[0.03] to-transparent hover:from-cyan-500/[0.05] transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group text-center shadow-lg">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-cyan-500/50 transition-all duration-300 shadow-xl">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-extrabold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                      Нажмите для выбора или перетащите фото сюда
                    </span>
                    <span className="text-xs sm:text-sm text-neutral-400 max-w-sm leading-relaxed">
                      Поддерживаются JPG, PNG, WEBP. Мы автоматически оптимизируем размер для быстрой отправки.
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                    {images.map((file, idx) => (
                      <ImagePreview
                        key={`${file.name}-${file.lastModified}-${idx}`}
                        file={file}
                        onRemove={() => removeImage(idx)}
                      />
                    ))}
                    {images.length < 10 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-cyan-500/50 bg-white/[0.02] hover:bg-white/[0.06] transition-all flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-cyan-400 group">
                        {isUploading ? (
                          <Loader2 className="w-7 h-7 animate-spin mb-1 text-cyan-400" />
                        ) : (
                          <>
                            <Upload className="w-7 h-7 mb-1.5 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold">Добавить ещё</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Collapsible Accordion Step 1 */}
              <div className="pt-2">
                <div 
                  onClick={() => setOpenStep1Details(!openStep1Details)}
                  className={`w-full p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between text-left group ${
                    openStep1Details || styles.length > 0 || bodyPlace || size
                      ? 'bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-transparent border-cyan-500/40 shadow-lg'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      🎨
                    </div>
                    <div>
                      <div className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center flex-wrap gap-2 mb-1">
                        Уточнить стиль, место на теле и размер
                        <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Рекомендуется
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 leading-normal">
                        {styles.length > 0 || bodyPlace || size ? (
                          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 inline" /> Заполнены детали ({[styles.length > 0 ? 'Стиль' : '', bodyPlace ? 'Место' : '', size ? 'Размер' : ''].filter(Boolean).join(', ')})
                          </span>
                        ) : (
                          'Поможет мастеру сразу назвать точную цену и время сеанса'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 text-neutral-300 transition-colors shrink-0">
                    {openStep1Details ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                <AnimatePresence>
                  {openStep1Details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-6 pt-6 px-2 sm:px-3"
                    >
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                          Стиль татуировки
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3.5">
                          {TATTOO_STYLES.map(s => {
                            const isSel = styles.includes(s)
                            return (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setStyles(prev => isSel ? prev.filter(item => item !== s) : [...prev, s])
                                }}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                                  isSel
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/25 scale-[1.03]'
                                    : 'bg-black/40 border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white hover:border-white/20'
                                }`}
                              >
                                {s}
                              </button>
                            )
                          })}
                        </div>
                        <input
                          type="text"
                          value={styles.join(', ')}
                          onChange={(e) => setStyles(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="Или введите свой вариант через запятую..."
                          className={baseInputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                          Место на теле
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3.5">
                          {BODY_PLACES.map(place => {
                            const isSel = bodyPlace === place
                            return (
                              <button
                                key={place}
                                type="button"
                                onClick={() => setBodyPlace(place)}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                                  isSel
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/25 scale-[1.03]'
                                    : 'bg-black/40 border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white hover:border-white/20'
                                }`}
                              >
                                {place}
                              </button>
                            )
                          })}
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                          <input
                            type="text"
                            value={bodyPlace}
                            onChange={(e) => setBodyPlace(e.target.value)}
                            placeholder="Уточнение (например: Внутренняя сторона предплечья ближе к запястью)"
                            className={`${baseInputClass} pl-12`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                          Примерный размер
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3.5">
                          {TATTOO_SIZES.map(sz => {
                            const isSel = size === sz.id
                            return (
                              <button
                                key={sz.id}
                                type="button"
                                onClick={() => setSize(sz.id)}
                                className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border text-center cursor-pointer ${
                                  isSel
                                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/15 scale-[1.03]'
                                    : 'bg-black/40 border-white/10 hover:bg-white/10 text-neutral-300 hover:text-white hover:border-white/20'
                                }`}
                              >
                                <span className="text-sm font-extrabold">{sz.name}</span>
                                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">{sz.desc}</span>
                              </button>
                            )
                          })}
                        </div>
                        <input
                          type="text"
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="Или укажите точные размеры в сантиметрах (например: 15x10 см)"
                          className={baseInputClass}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleNext}
                  className={baseButtonClass}
                >
                  <span>Продолжить ко 2 шагу</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CONDITIONS & BUDGET */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-8"
            >
              <div>
                <label className="block text-base sm:text-lg font-bold text-white mb-2">
                  Что для вас важнее всего?
                </label>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4">
                  Выберите ключевой приоритет для мастера при планировании сеанса
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'fast', icon: '⚡', label: 'В кратчайшие сроки', desc: 'Найти ближайшее окно' },
                    { id: 'quality', icon: '💎', label: 'Максимальное качество', desc: 'Детальная проработка' },
                    { id: 'cheap', icon: '💸', label: 'Уложиться в бюджет', desc: 'Оптимизировать цену' }
                  ].map(p => {
                    const isSel = clientPriority === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setClientPriority(p.id as any)}
                        className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2.5 ${
                          isSel
                            ? 'border-cyan-500 bg-gradient-to-b from-cyan-500/20 to-transparent text-white shadow-[0_0_30px_rgba(6,182,212,0.2)] scale-[1.03]'
                            : 'border-white/10 bg-black/40 hover:bg-white/5 hover:border-white/20 text-neutral-300 hover:text-white'
                        }`}
                      >
                        <span className="text-3xl mb-1">{p.icon}</span>
                        <span className="font-extrabold text-base">{p.label}</span>
                        <span className="text-xs text-neutral-400 font-medium">{p.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-base sm:text-lg font-bold text-white mb-3">
                  Ориентировочный бюджет
                </label>
                
                <div 
                  onClick={() => {
                    setIsNegotiable(!isNegotiable)
                    if (!isNegotiable) setBudgetVal('')
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 mb-4 w-full sm:w-fit ${
                    isNegotiable 
                      ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-md' 
                      : 'bg-black/40 border-white/10 hover:bg-white/5 text-neutral-300'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-lg border transition-all shrink-0 ${
                    isNegotiable
                      ? 'bg-cyan-500 border-cyan-500 text-black'
                      : 'bg-black/60 border-neutral-700'
                  }`}>
                    {isNegotiable && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span className="text-sm sm:text-base font-bold select-none">
                    Договорная цена / Обсудить лично с мастером
                  </span>
                </div>

                {!isNegotiable && (
                  <div className="relative max-w-md">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="number"
                      value={budgetVal}
                      onChange={(e) => setBudgetVal(e.target.value)}
                      placeholder="Например: 5000"
                      className={`${baseInputClass} pl-12 pr-20 text-lg font-bold`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-neutral-400 text-sm bg-neutral-800/80 px-2.5 py-1 rounded-lg">
                      Kč / CZK
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Accordion Step 2 */}
              <div className="pt-2">
                <div 
                  onClick={() => setOpenStep2Details(!openStep2Details)}
                  className={`w-full p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between text-left group ${
                    openStep2Details || sessionDate
                      ? 'bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-transparent border-cyan-500/40 shadow-lg'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      📅
                    </div>
                    <div>
                      <div className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center flex-wrap gap-2 mb-1">
                        Выбрать желаемую дату и время сеанса
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          Необязательно
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 leading-normal">
                        {sessionDate ? (
                          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 inline" /> Выбрано: {format(sessionDate, 'dd MMMM yyyy', { locale: ru })} {sessionTime ? `в ${sessionTime}` : ''}
                          </span>
                        ) : (
                          'Если у вас есть конкретные пожелания по датам или расписанию'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 text-neutral-300 transition-colors shrink-0">
                    {openStep2Details ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                <AnimatePresence>
                  {openStep2Details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-6 pt-6 px-2 sm:px-3"
                    >
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                          Календарь свободных дней
                        </label>
                        <div className="bg-black/50 p-6 rounded-3xl border border-white/10 flex justify-center overflow-x-auto shadow-inner">
                          <style>{`
                            .rdp-root { 
                              --rdp-day-height: 42px; 
                              --rdp-day-width: 42px;
                              --rdp-accent-color: #06b6d4 !important; 
                              --rdp-accent-background-color: rgba(6, 182, 212, 0.25) !important;
                              margin: 0; 
                            }
                            .rdp-day_button { 
                              border-radius: 12px !important; 
                              font-weight: 600; 
                              color: #e5e5e5;
                              transition: all 0.2s;
                            }
                            .rdp-day_button:hover:not([disabled]):not(.rdp-selected) { background-color: rgba(255, 255, 255, 0.15); }
                            .rdp-disabled { opacity: 0.25; text-decoration: line-through; }
                          `}</style>
                          <DayPicker
                            mode="single"
                            selected={sessionDate}
                            onSelect={setSessionDate}
                            disabled={[{ before: new Date() }, ...unavailableDates]}
                            locale={ru}
                          />
                        </div>
                      </div>

                      {sessionDate && (
                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                            Желаемое время начала сеанса <span className="text-neutral-500 font-normal">(Необязательно)</span>
                          </label>
                          <div className="relative max-w-xs">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="time"
                              value={sessionTime}
                              onChange={(e) => setSessionTime(e.target.value)}
                              className={`${baseInputClass} pl-12 text-base font-bold`}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-2xl transition-all text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Назад к 1 шагу
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={baseButtonClass}
                >
                  <span>Продолжить к 3 шагу</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONTACTS & SUBMIT */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-8"
            >
              <div className="bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 border border-cyan-500/40 rounded-3xl p-5 sm:p-6 flex items-start gap-4 shadow-xl">
                <div className="p-3 bg-cyan-500/20 text-cyan-300 rounded-2xl shrink-0 mt-0.5 shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  <strong className="text-white text-base font-extrabold block mb-1">Мгновенный доступ без паролей</strong>
                  Мы создадим для вас безопасный личный кабинет по вашему Email. Входить в него можно будет в один клик по ссылке из письма или прямо с экрана завершения заявки!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-bold text-white mb-2">
                    Ваше имя <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Иван"
                      className={`${baseInputClass} pl-12 text-base font-medium`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-white mb-2">
                    Email для входа в кабинет <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@mail.com"
                      className={`${baseInputClass} pl-12 text-base font-medium`}
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Accordion Step 3 */}
              <div className="pt-2">
                <div 
                  onClick={() => setOpenStep3Details(!openStep3Details)}
                  className={`w-full p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between text-left group ${
                    openStep3Details || contact || instagram
                      ? 'bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-transparent border-cyan-500/40 shadow-lg'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      📱
                    </div>
                    <div>
                      <div className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center flex-wrap gap-2 mb-1">
                        Добавить Telegram, Instagram или телефон
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          Необязательно
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 leading-normal">
                        {contact || instagram ? (
                          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 inline" /> Указаны доп. контакты ({[contact ? 'Телеграм/Телефон' : '', instagram ? 'Instagram' : ''].filter(Boolean).join(', ')})
                          </span>
                        ) : (
                          'Если вам удобнее обсуждать детали эскиза в мессенджерах'
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 text-neutral-300 transition-colors shrink-0">
                    {openStep3Details ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                <AnimatePresence>
                  {openStep3Details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden space-y-6 pt-6 px-2 sm:px-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-2.5">
                            Телефон или Telegram
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={contact}
                              onChange={(e) => setContact(e.target.value)}
                              placeholder="+420... или @username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-2.5">
                            Instagram профиль
                          </label>
                          <div className="relative">
                            <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              placeholder="@username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-neutral-300 font-bold rounded-2xl transition-all text-base flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Назад ко 2 шагу
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className={`${baseButtonClass} shadow-cyan-500/30 hover:shadow-cyan-500/50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>Отправка заявки...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Отправить заявку мастеру 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  )
}
