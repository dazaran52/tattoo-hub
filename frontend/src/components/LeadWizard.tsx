'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar as CalendarIcon, User, MapPin, FileText, CheckCircle, 
  ArrowLeft, Send, Link as LinkIcon, Instagram, Upload, Loader2, 
  X, Image as ImageIcon, ChevronRight, Phone, Clock, DollarSign, 
  Sparkles, AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, Share2, ShieldCheck
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
  card: 'bg-neutral-900/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-6 sm:p-8 text-white',
  input: 'bg-black/50 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 rounded-xl px-4 py-3 shadow-inner transition-all w-full',
  buttonPrimary: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all',
};

export function LeadWizard({ master, source = 'platform', themeClasses, onSuccess }: LeadWizardProps) {
  const router = useRouter()
  const tClasses = { ...defaultThemeClasses, ...themeClasses }

  // Wizard Step State
  const [step, setStep] = useState<1 | 2 | 3>(1)
  
  // Accordions State (collapsible optional fields)
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
  const [isNegotiable, setIsNegotiable] = useState(false)
  const [budgetVal, setBudgetVal] = useState('')
  const [sessionDate, setSessionDate] = useState<Date | undefined>(undefined)
  const [sessionTime, setSessionTime] = useState('')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [instagram, setInstagram] = useState('')

  // Submission & UI State
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [loginLink, setLoginLink] = useState<string | null>(null)
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([])
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [isPublishedToMarketplace, setIsPublishedToMarketplace] = useState(false)
  const [isPublishingMarketplace, setIsPublishingMarketplace] = useState(false)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([])

  // Pre-fill user data if logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        if (session.user.email) setEmail(session.user.email)
        if (session.user.user_metadata?.name) setName(session.user.user_metadata.name)
        if (session.user.user_metadata?.phone) setContact(session.user.user_metadata.phone)
      }
    }
    checkUser()

    if (master?.username) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/public/master/${master.username}/unavailable-dates`)
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setUnavailableDates(data.map((d: string) => new Date(d)))
          }
        })
        .catch(() => {})
    }
  }, [master?.username])

  // Auto-expand accordion if field is filled
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
      setStep(3)
    }
  }

  const handleBeforeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep1() || !validateStep3()) return

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

      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        instagram: instagram.trim(),
        description: description.trim(),
        style: styles.join(', '),
        body_place: bodyPlace.trim(),
        size: size.trim(),
        session_date: sessionDate ? format(sessionDate, 'yyyy-MM-dd') : null,
        session_time: sessionTime || null,
        budget_val: isNegotiable ? 'Договорная' : budgetVal,
        client_priority: clientPriority,
        image_urls: finalImageUrls,
        is_personal: master && source === 'personal' ? true : false,
        assigned_master_id: master && source === 'personal' ? master.id : null,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const payload = {
        name: name.trim(),
        contact: contact.trim(),
        email: email.trim(),
        instagram: instagram.trim(),
        description: description.trim(),
        style: styles.join(', '),
        body_place: bodyPlace.trim(),
        size: size.trim(),
        session_date: sessionDate ? format(sessionDate, 'yyyy-MM-dd') : null,
        session_time: sessionTime || null,
        budget_val: isNegotiable ? 'Договорная' : budgetVal,
        client_priority: clientPriority,
        image_urls: uploadedUrls,
        is_personal: false,
        assigned_master_id: null,
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
      <div className={`${tClasses.card} text-center py-10 px-6 max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-500`}>
        <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          <CheckCircle className="w-10 h-10 animate-bounce" />
        </div>

        <h3 className="text-3xl font-extrabold mb-3">Заявка принята! 🎉</h3>
        <p className="text-neutral-300 text-base mb-6 max-w-md mx-auto leading-relaxed">
          {master && source === 'personal' ? (
            <>Ваша заявка направлена мастеру <strong className="text-white font-bold">{master.full_name || master.username}</strong>. Мы создали для вас личный кабинет, где вы сможете переписываться с мастером и следить за статусом сеанса.</>
          ) : (
            <>Ваша идея опубликована на маркетплейсе! Мастера со всей платформы ознакомятся с ней и предложат вам свои условия в личном кабинете.</>
          )}
        </p>

        {master && source === 'personal' && !isPublishedToMarketplace && (
          <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-cyan-500/10 border border-purple-500/30 rounded-2xl p-5 mb-8 text-left transition-all hover:border-purple-500/50">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl mt-0.5">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  Отправить заявку также на маркетплейс
                  <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-semibold uppercase">Рекомендуется</span>
                </h4>
                <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                  Хотите получить предложения от других проверенных мастеров платформы? Мы продублируем вашу идею в общую ленту маркетплейса бесплатно.
                </p>
                <button
                  type="button"
                  onClick={submitToMarketplace}
                  disabled={isPublishingMarketplace}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                >
                  {isPublishingMarketplace && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Share2 className="w-3.5 h-3.5" />
                  Опубликовать на маркетплейсе в 1 клик
                </button>
              </div>
            </div>
          </div>
        )}

        {isPublishedToMarketplace && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2 text-sm font-semibold">
            <Check className="w-4 h-4 text-green-400" />
            Заявка также успешно опубликована на маркетплейсе!
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleTrackLead}
            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <ShieldCheck className="w-5 h-5" />
            Отслеживать заявку в личном кабинете ➔
          </button>
          <p className="text-xs text-neutral-400">
            Вход выполнится автоматически по защищенной ссылке для <span className="text-neutral-300 underline">{email}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Warning Modal for Missing Recommended Fields */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-yellow-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full text-white shadow-2xl"
            >
              <div className="w-14 h-14 bg-yellow-500/20 text-yellow-400 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">Заполнены не все детали</h3>
              <p className="text-sm text-neutral-300 text-center mb-6 leading-relaxed">
                Вы не указали некоторые рекомендуемые параметры (стиль, место нанесения, размер или дату сеанса). Без них мастеру будет сложнее оценить стоимость работы.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-colors text-center"
                >
                  Вернуться и дополнить
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold text-sm rounded-xl shadow-lg shadow-yellow-500/20 transition-all text-center"
                >
                  Отправить как есть
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className={tClasses.card}>
        {/* Progress Bar & Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            <span>
              Шаг {step} из 3: {' '}
              <strong className="text-white">
                {step === 1 && 'Идея и референсы'}
                {step === 2 && 'Условия сеанса'}
                {step === 3 && 'Контактные данные'}
              </strong>
            </span>
            <span className="text-cyan-400">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-neutral-800/80 h-2 rounded-full overflow-hidden p-0.5">
            <motion.div
              className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 h-full rounded-full"
              initial={{ width: '33%' }}
              animate={{ width: `${(step / 3) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <form onSubmit={handleBeforeSubmit} className="space-y-6">
          {/* STEP 1: IDEA & REFERENCES */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-bold mb-2">
                  Опишите вашу идею <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-neutral-400 mb-3">
                  Что именно вы хотите набить? Есть ли особые пожелания или элементы?
                </p>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3.5 w-5 h-5 opacity-40" />
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Например: Хочу реалистичного волка на плече с элементами леса на заднем плане..."
                    rows={4}
                    className={`${tClasses.input} pl-11 resize-none`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Фото-референсы (До 10 шт)
                </label>
                <p className="text-xs text-neutral-400 mb-3">
                  Прикрепите эскизы или примеры работ, которые вам нравятся
                </p>
                <div className="flex flex-wrap gap-3">
                  {images.map((file, idx) => (
                    <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-white/20 bg-black/40">
                      <img
                        src={URL.createObjectURL(file)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 hover:text-red-300"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                  {images.length < 10 && (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 hover:border-cyan-500/50 bg-black/20 hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-cyan-400">
                      {isUploading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mb-1" />
                          <span className="text-[10px] font-medium">Фото</span>
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
              </div>

              {/* Collapsible Accordion Step 1 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOpenStep1Details(!openStep1Details)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🎨</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                        Уточнить стиль, место на теле и размер
                        <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                          Рекомендуется
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        {styles.length > 0 || bodyPlace || size ? (
                          <span className="text-cyan-400 font-medium">
                            ✓ Заполнены детали ({[styles.length > 0 ? 'Стиль' : '', bodyPlace ? 'Место' : '', size ? 'Размер' : ''].filter(Boolean).join(', ')})
                          </span>
                        ) : (
                          'Поможет мастеру точнее рассчитать время и цену'
                        )}
                      </div>
                    </div>
                  </div>
                  {openStep1Details ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
                </button>

                <AnimatePresence>
                  {openStep1Details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-6 pt-5 px-2"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                          Стиль татуировки
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {TATTOO_STYLES.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                setStyles(prev => prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s])
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                styles.includes(s)
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm scale-[1.02]'
                                  : 'bg-black/30 border-white/10 hover:bg-white/5 text-neutral-300 hover:scale-[1.01]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={styles.join(', ')}
                          onChange={(e) => setStyles(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="Или введите свой вариант..."
                          className={tClasses.input}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                          Место на теле
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {BODY_PLACES.map(place => (
                            <button
                              key={place}
                              type="button"
                              onClick={() => setBodyPlace(place)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                bodyPlace === place
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm scale-[1.02]'
                                  : 'bg-black/30 border-white/10 hover:bg-white/5 text-neutral-300 hover:scale-[1.01]'
                              }`}
                            >
                              {place}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                          <input
                            type="text"
                            value={bodyPlace}
                            onChange={(e) => setBodyPlace(e.target.value)}
                            placeholder="Уточнение (например: Внутренняя сторона предплечья)"
                            className={`${tClasses.input} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                          Примерный размер
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                          {TATTOO_SIZES.map(sz => (
                            <button
                              key={sz.id}
                              type="button"
                              onClick={() => setSize(sz.id)}
                              className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border text-center ${
                                size === sz.id
                                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm scale-[1.02]'
                                  : 'bg-black/30 border-white/10 hover:bg-white/5 text-neutral-300 hover:scale-[1.01]'
                              }`}
                            >
                              <span className="text-xs font-bold">{sz.name}</span>
                              <span className="text-[9px] opacity-60 uppercase">{sz.desc}</span>
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={size}
                          onChange={(e) => setSize(e.target.value)}
                          placeholder="Или точный размер (например: 15x10 см)"
                          className={tClasses.input}
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
                  className={tClasses.buttonPrimary}
                >
                  Продолжить ➔
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CONDITIONS & BUDGET */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-bold mb-2">
                  Что для вас важнее всего?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'fast', icon: '⚡', label: 'В кратчайшие сроки' },
                    { id: 'quality', icon: '💎', label: 'Максимальное качество' },
                    { id: 'cheap', icon: '💸', label: 'Уложиться в бюджет' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setClientPriority(p.id as any)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${
                        clientPriority === p.id
                          ? 'border-cyan-500 bg-cyan-500/15 text-white shadow-lg shadow-cyan-500/10 scale-[1.02]'
                          : 'border-white/5 bg-black/30 hover:bg-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <span className="font-bold text-sm">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3">
                  Ориентировочный бюджет
                </label>
                
                <label className="flex items-center gap-3 mb-4 cursor-pointer group w-fit">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-md border transition-all ${
                    isNegotiable
                      ? 'bg-cyan-500 border-cyan-500'
                      : 'bg-black/40 border-neutral-700 group-hover:border-cyan-500/50'
                  }`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isNegotiable}
                      onChange={(e) => {
                        setIsNegotiable(e.target.checked)
                        if (e.target.checked) setBudgetVal('')
                      }}
                    />
                    {isNegotiable && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                    Договорная цена / Обсудить с мастером
                  </span>
                </label>

                {!isNegotiable && (
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                    <input
                      type="number"
                      value={budgetVal}
                      onChange={(e) => setBudgetVal(e.target.value)}
                      placeholder="Например: 5000"
                      className={`${tClasses.input} pl-11 pr-16`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-neutral-500 text-sm">
                      Kč / CZK
                    </div>
                  </div>
                )}
              </div>

              {/* Collapsible Accordion Step 2 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOpenStep2Details(!openStep2Details)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                        Выбрать желаемую дату и время сеанса
                        <span className="bg-neutral-800 text-neutral-400 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase">
                          Необязательно
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        {sessionDate ? (
                          <span className="text-cyan-400 font-medium">
                            ✓ Выбрано: {format(sessionDate, 'dd MMMM yyyy', { locale: ru })} {sessionTime ? `в ${sessionTime}` : ''}
                          </span>
                        ) : (
                          'Если у вас есть конкретные пожелания по датам'
                        )}
                      </div>
                    </div>
                  </div>
                  {openStep2Details ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
                </button>

                <AnimatePresence>
                  {openStep2Details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-6 pt-5 px-2"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-3">
                          Календарь свободных дней
                        </label>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex justify-center overflow-x-auto">
                          <style>{`
                            .rdp-root { 
                              --rdp-day-height: 38px; 
                              --rdp-day-width: 38px;
                              --rdp-accent-color: #06b6d4 !important; 
                              --rdp-accent-background-color: rgba(6, 182, 212, 0.2) !important;
                              margin: 0; 
                            }
                            .rdp-day_button:hover:not([disabled]):not(.rdp-selected) { background-color: rgba(255, 255, 255, 0.1); }
                            .rdp-disabled { opacity: 0.3; text-decoration: line-through; }
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
                          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2.5">
                            Желаемое время (Необязательно)
                          </label>
                          <div className="relative">
                            <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                            <input
                              type="time"
                              value={sessionTime}
                              onChange={(e) => setSessionTime(e.target.value)}
                              className={`${tClasses.input} pl-11`}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold rounded-full transition-colors text-sm"
                >
                  ⬅ Назад
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={tClasses.buttonPrimary}
                >
                  Продолжить ➔
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CONTACTS & SUBMIT */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs text-neutral-300 leading-relaxed">
                  <strong className="text-white block mb-0.5">Безопасное общение без лишних паролей</strong>
                  Мы автоматически создадим для вас личный кабинет по вашему Email. Входить в него можно в один клик по ссылке из письма или прямо с экрана завершения!
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Ваше имя <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Иванов"
                    className={`${tClasses.input} pl-11`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Email для личного кабинета <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className={tClasses.input}
                  />
                </div>
              </div>

              {/* Collapsible Accordion Step 3 */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setOpenStep3Details(!openStep3Details)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📱</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                        Добавить Telegram, Instagram или телефон
                        <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                          Рекомендуется
                        </span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        {contact || instagram ? (
                          <span className="text-cyan-400 font-medium">
                            ✓ Указаны доп. контакты ({[contact ? 'Телеграм/Телефон' : '', instagram ? 'Instagram' : ''].filter(Boolean).join(', ')})
                          </span>
                        ) : (
                          'Если вам удобнее общаться в мессенджерах'
                        )}
                      </div>
                    </div>
                  </div>
                  {openStep3Details ? <ChevronUp className="w-5 h-5 text-neutral-400" /> : <ChevronDown className="w-5 h-5 text-neutral-400" />}
                </button>

                <AnimatePresence>
                  {openStep3Details && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden space-y-4 pt-5 px-2"
                    >
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                          Телефон или Telegram
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                          <input
                            type="text"
                            value={contact}
                            onChange={(e) => setContact(e.target.value)}
                            placeholder="+420... или @username"
                            className={`${tClasses.input} pl-11`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                          Instagram
                        </label>
                        <div className="relative">
                          <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                          <input
                            type="text"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            placeholder="@username"
                            className={`${tClasses.input} pl-11`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold rounded-full transition-colors text-sm"
                >
                  ⬅ Назад
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className={`${tClasses.buttonPrimary} flex items-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Отправка...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Отправить заявку 🚀
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
