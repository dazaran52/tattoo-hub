'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ChevronRight, ChevronLeft, Check, AlertCircle, Sparkles, Image as ImageIcon, MapPin, Send, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/i18n/LanguageContext'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export function LeadForm() {
  const { t, lang } = useLanguage()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    description: '',
    style: '',
    body_place: '',
    size: '',
    budget: '5000 CZK',
    city: '',
    name: '',
    contact: '', // email or phone
    contact_method: 'on_site', // 'on_site' or 'off_site'
    priority: 'quality', // fast, cheap, quality
    is_negotiable: false,
    images: [] as File[]
  })

  // Theme support
  const [currency, setCurrency] = useState('CZK')
  const [budgetVal, setBudgetVal] = useState(5000)
  const [isDragActive, setIsDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // Countries and Cities
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [locationPrefilled, setLocationPrefilled] = useState(false)
  const [showLocationSelect, setShowLocationSelect] = useState(true)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error(err))
      
    // Load from profile if logged in
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    }
    const token = getCookie('sb-access-token')
    if (token) {
      api.getProfile().then(p => {
        if (p.country_ids && p.country_ids.length > 0) {
          setSelectedCountry(p.country_ids[0])
          setLocationPrefilled(true)
          setShowLocationSelect(false)
        }
        if (p.display_name) {
          setFormData(prev => ({ ...prev, name: p.display_name! }))
        }
        if (p.phone || p.email) {
          setFormData(prev => ({ ...prev, contact: (p.phone || p.email)! }))
        }
      }).catch(err => console.error(err))
    }

    // Load pending lead if exists
    const pendingLeadStr = localStorage.getItem('pending_lead')
    if (pendingLeadStr) {
      try {
        const pendingLead = JSON.parse(pendingLeadStr)
        setFormData(prev => ({
          ...prev,
          description: pendingLead.description || prev.description,
          size: pendingLead.size || prev.size,
          priority: pendingLead.priority || prev.priority
        }))
        setStep(2)
      } catch (e) {
        console.error('Failed to parse pending lead', e)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find(c => c.id === selectedCountry)
      if (country) {
        const cCode = country.code || 'CZ'
        let newCurr = 'EUR'
        if (cCode === 'CZ') newCurr = 'CZK'
        if (cCode === 'PL') newCurr = 'PLN'
        setCurrency(newCurr)
        
        const defaults: Record<string, number> = { CZK: 5000, EUR: 200, PLN: 1000 }
        if (!formData.budget || !formData.budget.includes(newCurr)) {
          setBudgetVal(defaults[newCurr])
          setFormData(prev => ({ ...prev, budget: `${defaults[newCurr]} ${newCurr}` }))
        }
      }

      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
          setCities(data)
          if (data.length > 0 && !formData.city) {
            const defaultCity = data[0].name_ru || data[0].name
            setFormData(prev => ({ 
              ...prev, 
              city: defaultCity
            }))
          }
        })
        .catch(err => console.error(err))
    } else {
      setCities([])
    }
  }, [selectedCountry, countries])

  const nextStep = () => {
    if (step === 1) {
      if (formData.description.length < 10) {
        toast.error(t('errorDescShort') || 'Описание должно быть не менее 10 символов')
        return
      }
      if (!formData.style) {
        toast.error(t('errorStyleReq') || 'Выберите стиль татуировки')
        return
      }
    } else if (step === 2) {
      if (!formData.body_place) {
        toast.error(t('errorBodyReq') || 'Укажите место нанесения')
        return
      }
      if (!formData.size) {
        toast.error(t('errorSizeReq') || 'Укажите примерный размер')
        return
      }
      if (!selectedCountry || !formData.city) {
        toast.error(t('errorCityReq') || 'Выберите страну и город')
        return
      }
    }
    setStep(s => Math.min(s + 1, 4))
  }
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateUploadProgress(Array.from(e.dataTransfer.files))
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateUploadProgress(Array.from(e.target.files))
    }
  }

  const simulateUploadProgress = (files: File[]) => {
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null
        if (prev >= 100) {
          clearInterval(interval)
          setFormData(prevForm => ({ ...prevForm, images: [...prevForm.images, ...files] }))
          toast.success('Изображения прикреплены')
          return null
        }
        return prev + 20
      })
    }, 80)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step !== 4) {
      nextStep()
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const imageUrls: string[] = []
      if (formData.images.length > 0) {
        for (const file of formData.images) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `client_leads/${fileName}`
          const { error: uploadError } = await supabase.storage.from('lead_images').upload(filePath, file)
          if (uploadError) throw uploadError
          const { data } = supabase.storage.from('lead_images').getPublicUrl(filePath)
          imageUrls.push(data.publicUrl)
        }
      }

      const payload = {
        description: formData.description,
        style: formData.style || null,
        body_place: formData.body_place || null,
        size: formData.size || null,
        budget: formData.is_negotiable ? 'Договорная цена' : formData.budget || null,
        budget_val: budgetVal,
        budget_currency: currency,
        is_negotiable_budget: formData.is_negotiable,
        client_priority: formData.priority,
        country_id: selectedCountry || null,
        city: formData.city || null,
        name: formData.name || null,
        contact: formData.contact_method === 'on_site' ? 'На сайте' : formData.contact,
        image_urls: imageUrls,
      }

      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      }
      const token = getCookie('sb-access-token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Ошибка при отправке заявки')
      }
      
      // Clear pending lead if exists
      localStorage.removeItem('pending_lead')
      
      setIsSuccess(true)
    } catch (error) {
      console.error(error)
      toast.error(t('errorSubmitLead') || 'Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepIcons = [
    <Sparkles key={1} className="w-5 h-5" />,
    <MapPin key={2} className="w-5 h-5" />,
    <ImageIcon key={3} className="w-5 h-5" />,
    <Send key={4} className="w-5 h-5" />
  ]

  const stepTitles = [
    t('step1Title') || "Опиши свою идею",
    t('step2Title') || "Детали татуировки",
    t('step3Title') || "Бюджет и референсы",
    t('step4Title') || "Твои контакты"
  ]

  const inputClasses = "w-full bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all duration-300 shadow-sm"
  const labelClasses = "block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 ml-1"

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl border border-neutral-200/50 dark:border-white/5 rounded-[2rem] p-8 md:p-12 text-center shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 pointer-events-none" />
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
          className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30"
        >
          <Check className="w-12 h-12 text-white stroke-[3]" />
        </motion.div>
        <motion.h3 
          className="text-3xl md:text-4xl font-extrabold text-neutral-900 dark:text-white mb-4"
        >
          {t('leadSentTitle') || 'Заявка отправлена!'}
        </motion.h3>
        <motion.p 
          className="text-neutral-600 dark:text-neutral-300 text-lg max-w-md mx-auto mb-10 leading-relaxed font-medium"
        >
          {t('leadSentDesc') || 'Лучшие мастера твоего города скоро увидят твою идею и свяжутся с тобой, чтобы обсудить детали и предложить свои эскизы.'}
        </motion.p>
        <motion.button 
          onClick={() => { 
            setStep(1)
            setIsSuccess(false)
            setFormData({
              description: '', 
              style: '', 
              body_place: '', 
              size: '', 
              budget: '5000 CZK', 
              city: '', 
              name: '', 
              contact: '', 
              contact_method: 'on_site',
              priority: 'quality', 
              is_negotiable: false, 
              images: []
            }) 
            setCurrency('CZK')
            setBudgetVal(5000)
            setSelectedCountry('')
          }}
          className="group relative inline-flex items-center justify-center bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-md"
        >
          <span className="relative z-10">{t('newLeadBtn') || 'Новая заявка'}</span>
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div className="relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl border border-neutral-200/50 dark:border-white/5 rounded-[2rem] shadow-2xl overflow-hidden">
      
      {/* Progress Bar Container */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-neutral-200/50 dark:bg-neutral-800/50">
        <motion.div 
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 relative"
          initial={{ width: '25%' }}
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-[2px]" />
        </motion.div>
      </div>

      <div className="p-8 md:p-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              key={step}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30"
            >
              {stepIcons[step - 1]}
            </motion.div>
            <h3 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white">
              {stepTitles[step - 1]}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 overflow-hidden relative">
                <motion.div 
                  initial={false}
                  animate={{ 
                    width: step >= i ? '100%' : '0%',
                    opacity: step >= i ? 1 : 0 
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
              </div>
            ))}
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 mt-3 text-sm font-semibold">Шаг {step} из 4</p>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>{t('describeIdeaTitle') || 'Расскажи, что хочешь набить'}</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder={t('describeIdeaPlaceholder') || "Например: Хочу черно-белого дракона, обвивающего меч..."}
                    className={`${inputClasses} min-h-[140px] resize-none`}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>{t('styleOptional') || 'Стиль'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'Не определился', name: 'Пока не знаю', emoji: '✨' },
                      { id: 'Реализм', name: 'Реализм', emoji: '👁️' },
                      { id: 'Олдскул', name: 'Олдскул', emoji: '⚓' },
                      { id: 'Минимализм', name: 'Минимализм', emoji: '🖋️' },
                      { id: 'Япония', name: 'Япония', emoji: '🐉' },
                      { id: 'Блэкворк', name: 'Блэкворк', emoji: '💀' },
                      { id: 'Лайнворк', name: 'Лайнворк', emoji: '〰️' },
                      { id: 'Неотрад', name: 'Неотрад', emoji: '🌹' },
                      { id: 'Леттеринг', name: 'Леттеринг', emoji: '📝' },
                      { id: 'Акварель', name: 'Акварель', emoji: '🎨' },
                      { id: 'Аниме', name: 'Аниме', emoji: '🎌' },
                      { id: 'Другое', name: 'Другое', emoji: '🤔' },
                    ].map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setFormData({...formData, style: style.id})}
                        className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all backdrop-blur-md font-semibold ${
                          formData.style === style.id
                            ? 'bg-violet-500/20 border-violet-500 text-violet-700 dark:text-violet-300 scale-[1.02] shadow-md'
                            : 'bg-white/20 dark:bg-neutral-900/20 border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-neutral-800/40'
                        }`}
                      >
                        <span className="text-2xl">{style.emoji}</span>
                        <span className="text-sm text-center">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>{t('tattooPlacement') || 'Место нанесения'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { id: 'Не определился', name: 'Пока не знаю' },
                      { id: 'Рука', name: 'Рука' },
                      { id: 'Предплечье', name: 'Предплечье' },
                      { id: 'Плечо', name: 'Плечо' },
                      { id: 'Нога', name: 'Нога' },
                      { id: 'Бедро', name: 'Бедро' },
                      { id: 'Голень', name: 'Голень' },
                      { id: 'Спина', name: 'Спина' },
                      { id: 'Грудь', name: 'Грудь' },
                      { id: 'Живот', name: 'Живот' },
                      { id: 'Шея', name: 'Шея' },
                      { id: 'Кисть', name: 'Кисть' }
                    ].map(part => (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setFormData({...formData, body_place: part.id})}
                        className={`p-3 rounded-2xl border transition-all text-sm font-semibold ${
                          formData.body_place === part.id
                            ? 'bg-violet-500/20 border-violet-500 text-violet-700 dark:text-violet-300 shadow-sm'
                            : 'bg-white/20 dark:bg-neutral-900/20 border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-neutral-800/40'
                        }`}
                      >
                        {part.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClasses}>{t('approximateSize') || 'Примерный размер'}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                      { id: 'Мини (до 5 см)', name: 'Мини (до 5 см)' },
                      { id: 'Средняя (до 15 см)', name: 'Средняя (15 см)' },
                      { id: 'Крупная (от 20 см)', name: 'Крупная (от 20 см)' },
                      { id: 'Рукав / Масштабная', name: 'Масштабная' }
                    ].map(sz => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => setFormData({...formData, size: sz.id})}
                        className={`p-3 rounded-2xl border transition-all text-sm font-semibold ${
                          formData.size === sz.id
                            ? 'bg-violet-500/20 border-violet-500 text-violet-700 dark:text-violet-300 shadow-sm'
                            : 'bg-white/20 dark:bg-neutral-900/20 border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-neutral-800/40'
                        }`}
                      >
                        {sz.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {locationPrefilled && !showLocationSelect ? (
                  <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                      <MapPin className="w-5 h-5 text-violet-500" />
                      <div>
                        <p className="font-semibold text-sm">Ваш город из профиля</p>
                        <p className="text-xs text-neutral-500">{formData.city}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowLocationSelect(true)}
                      className="text-sm font-bold text-violet-500 hover:text-violet-600 transition-colors"
                    >
                      Изменить
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClasses}>{t('country') || 'Страна'}</label>
                      <select
                        value={selectedCountry}
                        onChange={e => setSelectedCountry(e.target.value)}
                        className="w-full bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 appearance-none font-semibold cursor-pointer"
                        required
                      >
                        <option value="" disabled className="bg-white dark:bg-neutral-900">{t('selectCountry') || 'Выбери страну'}</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.id} className="bg-white dark:bg-neutral-900">{lang === 'ru' ? c.name_ru : c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses}>{t('city') || 'Город'}</label>
                      <select
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl p-4 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 appearance-none font-semibold cursor-pointer"
                        disabled={!selectedCountry}
                        required
                      >
                        <option value="" disabled className="bg-white dark:bg-neutral-900">{countries.length === 0 ? 'Загрузка...' : (t('selectCity') || 'Выбери город')}</option>
                        {cities.map(c => (
                          <option key={c.id} value={lang === 'ru' ? c.name_ru : c.name} className="bg-white dark:bg-neutral-900">{lang === 'ru' ? c.name_ru : c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="mb-8">
                  <label className={labelClasses}>{t('masterPriority') || 'Что для вас важнее всего?'}</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'fast', icon: '⚡', label: t('fasterPriority') || 'В кратчайшие сроки', desc: '' },
                      { id: 'quality', icon: '💎', label: t('qualityPriority') || 'Максимальное качество', desc: '' },
                      { id: 'cheap', icon: '💸', label: t('cheaperPriority') || 'Уложиться в бюджет', desc: '' }
                    ].map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setFormData({ ...formData, priority: p.id })}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${
                          formData.priority === p.id 
                            ? 'border-violet-500 bg-violet-500/10' 
                            : 'border-transparent bg-white/40 dark:bg-neutral-800/40 hover:bg-white/60 dark:hover:bg-neutral-800/60'
                        }`}
                      >
                        <span className="text-2xl">{p.icon}</span>
                        <span className="font-bold text-sm text-neutral-800 dark:text-white">{p.label}</span>
                        <span className="text-xs text-neutral-500">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 ml-1">
                    <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {t('budgetLabel') || 'Ваш бюджет'}
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {t('negotiableBudget') || 'Договорная цена'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, is_negotiable: !formData.is_negotiable })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 ${
                          formData.is_negotiable ? 'bg-violet-600' : 'bg-neutral-300 dark:bg-neutral-700'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.is_negotiable ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                  
                  {!formData.is_negotiable && formData.priority !== 'cheap' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-xl text-neutral-900 dark:text-white">
                          {budgetVal} {currency}
                        </span>
                        <div className="flex gap-2 p-1.5 bg-white/20 dark:bg-neutral-900/20 backdrop-blur-md border border-neutral-200 dark:border-white/5 rounded-2xl w-fit">
                           <span className="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-violet-500 text-white shadow-md">
                             {currency}
                           </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={currency === 'EUR' ? '50' : currency === 'PLN' ? '200' : '1000'}
                        max={currency === 'EUR' ? '2000' : currency === 'PLN' ? '10000' : '50000'}
                        step={currency === 'EUR' ? '50' : currency === 'PLN' ? '100' : '500'}
                        value={budgetVal}
                        onChange={e => {
                          const val = parseInt(e.target.value)
                          setBudgetVal(val)
                          setFormData({ ...formData, budget: `${val} ${currency}` })
                        }}
                        className="w-full accent-violet-500 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-xs text-neutral-400 mt-2 font-semibold">
                        <span>{currency === 'EUR' ? '50' : currency === 'PLN' ? '200' : '1000'} {currency}</span>
                        <span>{currency === 'EUR' ? '2000' : currency === 'PLN' ? '10000' : '50000'} {currency}</span>
                      </div>
                    </motion.div>
                  )}
                  
                  {formData.priority === 'cheap' && !formData.is_negotiable && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-500/20"
                    >
                      <p className="text-sm text-violet-800 dark:text-violet-300 flex items-start gap-2">
                        <span className="text-xl leading-none">💡</span>
                        Мастера будут пытаться предложить как можно более дешевую цену. Точный бюджет не указывается.
                      </p>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className={labelClasses}>{t('referencesTitle') || 'Примеры и референсы'}</label>
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all relative cursor-pointer group ${
                      isDragActive 
                        ? 'border-violet-500 bg-violet-500/10' 
                        : 'border-neutral-200 dark:border-white/10 bg-white/20 dark:bg-neutral-900/20 hover:bg-white/40 dark:hover:bg-neutral-800/40'
                    }`}
                  >
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                    <div className="w-16 h-16 bg-white/50 dark:bg-neutral-800/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <Upload className="w-8 h-8 text-violet-500" />
                    </div>
                    <p className="text-neutral-700 dark:text-neutral-300 font-bold">{t('uploadPhoto') || 'Нажмите или перетащите фото сюда'}</p>
                    <p className="text-neutral-400 text-sm mt-1">{t('referencesOptionalText') || 'Необязательно, но очень поможет мастерам понять идею'}</p>

                    {uploadProgress !== null && (
                      <div className="mt-4 w-full max-w-xs mx-auto">
                        <div className="h-1.5 w-full bg-neutral-200/50 dark:bg-neutral-800/50 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-violet-500" 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {formData.images.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        {formData.images.map((img, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-violet-500/30 group shadow-sm bg-white dark:bg-neutral-800 flex items-center justify-center">
                            <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })
                              }}
                              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>Где мастерам отвечать на вашу заявку?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {[
                      { id: 'on_site', name: 'Здесь на сайте (Встроенный чат)', icon: '💬' },
                      { id: 'off_site', name: 'Вне сайта (Мессенджеры / Телефон)', icon: '📱' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setFormData({...formData, contact_method: m.id})}
                        className={`p-4 rounded-2xl border flex items-center gap-3 transition-all font-semibold text-left ${
                          formData.contact_method === m.id
                            ? 'bg-violet-500/20 border-violet-500 text-violet-700 dark:text-violet-300 shadow-sm'
                            : 'bg-white/20 dark:bg-neutral-900/20 border-neutral-200 dark:border-white/5 text-neutral-700 dark:text-neutral-300 hover:bg-white/40 dark:hover:bg-neutral-800/40'
                        }`}
                      >
                        <span className="text-2xl">{m.icon}</span>
                        <span>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {formData.contact_method === 'off_site' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden"
                    >
                      <div>
                        <label className={labelClasses}>{t('howToAddressYou') || 'Как к вам обращаться?'}</label>
                        <input 
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          placeholder={t('yourName') || "Имя"}
                          className={inputClasses}
                          required
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Куда писать? (Telegram, WhatsApp, Email)</label>
                        <input 
                          type="text"
                          value={formData.contact}
                          onChange={e => setFormData({...formData, contact: e.target.value})}
                          placeholder={t('contactPlaceholder') || "@telegram, +420... или email@..."}
                          className={inputClasses}
                          required
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4 mt-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5 backdrop-blur-md p-5 rounded-2xl border border-amber-500/20"
                >
                  <div className="bg-amber-500/20 p-2 rounded-full flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {formData.contact_method === 'on_site' 
                      ? 'Уведомления о новых откликах придут вам в личный кабинет. Вы сможете общаться с мастерами во встроенном чате абсолютно безопасно.'
                      : (t('contactPrivacyNotice') || 'Твои контакты будут скрыты и станут доступны только доверенным мастерам, которые захотят взять твою идею в работу.')}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
            {step > 1 ? (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button" 
                onClick={prevStep}
                className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium px-4 py-2 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
              >
                <ChevronLeft className="w-5 h-5" />
                {t('backBtn') || 'Назад'}
              </motion.button>
            ) : (
              <div></div>
            )}
            
            {step < 4 ? (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button" 
                onClick={nextStep}
                className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-neutral-900/20 dark:shadow-white/10 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">{t('nextBtn') || 'Далее'}</span>
                <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ) : (
              <motion.button 
                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                type="submit" 
                disabled={isSubmitting}
                className="relative bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-violet-500/30 disabled:opacity-70 disabled:hover:scale-100 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">{isSubmitting ? t('loading') || 'Отправляем...' : t('publishLeadBtn') || 'Оставить заявку'}</span>
                {!isSubmitting && <Check className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" />}
              </motion.button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
