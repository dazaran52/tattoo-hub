'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Check, Sparkles, MapPin, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/i18n/LanguageContext'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import imageCompression from 'browser-image-compression'

export function LeadForm({ masterId, source = 'platform' }: { masterId?: string, source?: 'platform' | 'personal' }) {
  const { t, lang } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    description: '',
    style: [] as string[],
    body_place: '',
    size: '',
    budget: '5000 CZK',
    city: '',
    name: '',
    contact: '', // email
    contact_method: 'on_site',
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
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
            setFormData(prev => ({ ...prev, contact: (p.email || p.phone)! }))
          }
        }).catch(err => console.error(err))
      }
    })

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
      } catch (e) {
        console.error('Failed to parse pending lead', e)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find(c => c.id === selectedCountry)
      if (country) {
        setCurrency('CZK')
        if (!formData.budget || !formData.budget.includes('CZK')) {
          setBudgetVal(5000)
          setFormData(prev => ({ ...prev, budget: '5000 CZK' }))
        }
      }

      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
          setCities(data)
          if (data.length > 0 && !formData.city) {
            const defaultCity = data[0].name_ru || data[0].name
            setFormData(prev => ({ ...prev, city: defaultCity }))
          }
        })
        .catch(err => console.error(err))
    } else {
      setCities([])
    }
  }, [selectedCountry, countries])

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
    
    // Validation
    if (formData.description.length < 10) {
      toast.error(t('errorDescShort') || 'Описание должно быть не менее 10 символов')
      return
    }
    if (!formData.body_place || formData.body_place === 'Не определился') {
      // It's allowed to not know, but if we require it strictly:
      // Let's allow "Не определился" since it's an option.
    }
    if (!selectedCountry || !formData.city) {
      toast.error(t('errorCityReq') || 'Выберите страну и город')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const imageUrls: string[] = []
      if (formData.images.length > 0) {
        for (const file of formData.images) {
          const compressionOptions = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          }
          const compressedFile = await imageCompression(file, compressionOptions)
          const fileExt = compressedFile.name.split('.').pop() || 'webp'
          const fileName = `${Math.random()}.${fileExt}`
          const filePath = `client_leads/${fileName}`
          const { error: uploadError } = await supabase.storage.from('lead_images').upload(filePath, compressedFile)
          if (uploadError) throw uploadError
          const { data } = supabase.storage.from('lead_images').getPublicUrl(filePath)
          imageUrls.push(data.publicUrl)
        }
      }

      const payload = {
        description: formData.description,
        style: formData.style.length > 0 ? formData.style.join(', ') : null,
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
        email: formData.contact,
        contact: formData.contact,
        assigned_master_id: masterId || null,
        is_personal: source === 'personal',
        image_urls: imageUrls
      }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

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
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || 'Ошибка при отправке заявки')
      }
      
      localStorage.removeItem('pending_lead')
      setIsSuccess(true)
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || t('errorSubmitLead') || 'Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

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
          {source === 'personal' 
            ? 'Мастер получил вашу идею и свяжется с вами в ближайшее время для обсуждения деталей и цены.'
            : (t('leadSentDesc') || 'Лучшие мастера твоего города скоро увидят твою идею и свяжутся с тобой, чтобы обсудить детали и предложить свои эскизы.')}
        </motion.p>
        <motion.button 
          type="button"
          onClick={() => { 
            setIsSuccess(false)
            setFormData({
              description: '', 
              style: [] as string[], 
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
          <span className="relative z-10">{t('newLeadBtn') || 'Отправить еще одну'}</span>
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div className="relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl border border-neutral-200/50 dark:border-white/5 rounded-[2rem] shadow-2xl overflow-hidden p-6 md:p-10">
      
      <div className="mb-10 text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold text-neutral-900 dark:text-white mb-2">
          {source === 'personal' ? 'Запись на сеанс' : 'Оставь заявку'}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400 font-medium">
          {source === 'personal' 
            ? 'Опишите свою идею, и мастер свяжется с вами.' 
            : 'Расскажи о татуировке мечты, и мастера сами предложат свои варианты!'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        
        {/* Section 1: Contacts */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold border-b border-neutral-200 dark:border-neutral-800 pb-2">1. Контакты</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Как к вам обращаться? <span className="text-red-500">*</span></label>
              <input 
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Имя"
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>Ваш Email <span className="text-red-500">*</span></label>
              <input 
                type="email"
                value={formData.contact}
                onChange={e => setFormData({...formData, contact: e.target.value})}
                placeholder="email@example.com"
                className={inputClasses}
                required
              />
            </div>
          </div>
          
          <div className="flex items-start gap-3 bg-violet-50 dark:bg-violet-900/10 p-4 rounded-xl border border-violet-100 dark:border-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-violet-800 dark:text-violet-300">
              После отправки мы автоматически создадим вам личный кабинет без паролей. Вы сможете безопасно общаться с {source === 'personal' ? 'мастером' : 'мастерами'} во встроенном чате платформы!
            </p>
          </div>
        </section>

        {/* Section 2: Details */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold border-b border-neutral-200 dark:border-neutral-800 pb-2">2. Идея и Детали</h3>
          <div>
            <label className={labelClasses}>{t('describeIdeaTitle') || 'Что хотите набить?'} <span className="text-red-500">*</span></label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder={t('describeIdeaPlaceholder') || "Например: Хочу черно-белого дракона, обвивающего меч..."}
              className={`${inputClasses} min-h-[120px] resize-none`}
              required
            />
          </div>
          
          <div>
            <label className={labelClasses}>{t('styleOptional') || 'Стиль'}</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'Не определился', name: 'Пока не знаю' },
                { id: 'Реализм', name: 'Реализм' },
                { id: 'Олдскул', name: 'Олдскул' },
                { id: 'Минимализм', name: 'Минимализм' },
                { id: 'Япония', name: 'Япония' },
                { id: 'Блэкворк', name: 'Блэкворк' },
                { id: 'Лайнворк', name: 'Лайнворк' },
                { id: 'Неотрад', name: 'Неотрад' },
                { id: 'Леттеринг', name: 'Леттеринг' },
                { id: 'Акварель', name: 'Акварель' },
                { id: 'Аниме', name: 'Аниме' },
                { id: 'Другое', name: 'Другое' },
              ].map(style => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    if (style.id === 'Не определился') {
                      setFormData({...formData, style: ['Не определился']})
                    } else {
                      const newStyles = formData.style.includes('Не определился') 
                        ? [style.id]
                        : formData.style.includes(style.id) 
                          ? formData.style.filter(s => s !== style.id)
                          : [...formData.style, style.id]
                      setFormData({...formData, style: newStyles})
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    formData.style.includes(style.id)
                      ? 'bg-violet-500 border-violet-500 text-white shadow-md'
                      : 'bg-white/20 dark:bg-neutral-800/50 border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>{t('tattooPlacement') || 'Место нанесения'}</label>
              <select
                value={formData.body_place}
                onChange={e => setFormData({ ...formData, body_place: e.target.value })}
                className={inputClasses}
              >
                <option value="" disabled>Выберите место</option>
                <option value="Не определился">Пока не знаю</option>
                <option value="Рука">Рука</option>
                <option value="Предплечье">Предплечье</option>
                <option value="Плечо">Плечо</option>
                <option value="Нога">Нога</option>
                <option value="Бедро">Бедро</option>
                <option value="Голень">Голень</option>
                <option value="Спина">Спина</option>
                <option value="Грудь">Грудь</option>
                <option value="Живот">Живот</option>
                <option value="Шея">Шея</option>
                <option value="Кисть">Кисть</option>
              </select>
            </div>
            <div>
              <label className={labelClasses}>{t('approximateSize') || 'Размер'}</label>
              <select
                value={formData.size}
                onChange={e => setFormData({ ...formData, size: e.target.value })}
                className={inputClasses}
              >
                <option value="" disabled>Выберите размер</option>
                <option value="Мини (до 5 см)">Мини (до 5 см)</option>
                <option value="Средняя (до 15 см)">Средняя (до 15 см)</option>
                <option value="Крупная (от 20 см)">Крупная (от 20 см)</option>
                <option value="Рукав / Масштабная">Рукав / Масштабная</option>
              </select>
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
                <label className={labelClasses}>{t('country') || 'Страна'} <span className="text-red-500">*</span></label>
                <select
                  value={selectedCountry}
                  onChange={e => setSelectedCountry(e.target.value)}
                  className={inputClasses}
                  required
                >
                  <option value="" disabled>Выбери страну</option>
                  {countries.map(c => (
                    <option key={c.id} value={c.id}>{lang === 'ru' ? c.name_ru : c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClasses}>{t('city') || 'Город'} <span className="text-red-500">*</span></label>
                <select
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className={inputClasses}
                  disabled={!selectedCountry}
                  required
                >
                  <option value="" disabled>{countries.length === 0 ? 'Загрузка...' : 'Выбери город'}</option>
                  {cities.map(c => (
                    <option key={c.id} value={lang === 'ru' ? c.name_ru : c.name}>{lang === 'ru' ? c.name_ru : c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: Priority & Budget */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold border-b border-neutral-200 dark:border-neutral-800 pb-2">3. Приоритет и Бюджет</h3>
          
          <div>
            <label className={labelClasses}>Что для вас важнее всего?</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'fast', icon: '⚡', label: 'В кратчайшие сроки' },
                { id: 'quality', icon: '💎', label: 'Максимальное качество' },
                { id: 'cheap', icon: '💸', label: 'Уложиться в бюджет' }
              ].map(p => (
                <button 
                  key={p.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: p.id })}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${
                    formData.priority === p.id 
                      ? 'border-violet-500 bg-violet-500/10' 
                      : 'border-transparent bg-white/40 dark:bg-neutral-800/40 hover:bg-white/60 dark:hover:bg-neutral-800/60'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="font-bold text-sm text-neutral-800 dark:text-white">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/40 dark:bg-neutral-900/40 p-5 rounded-2xl border border-neutral-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Ваш бюджет
              </label>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  Договорная цена
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_negotiable: !formData.is_negotiable })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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
                </div>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="500"
                  value={budgetVal}
                  onChange={e => {
                    const val = parseInt(e.target.value)
                    setBudgetVal(val)
                    setFormData({ ...formData, budget: `${val} ${currency}` })
                  }}
                  className="w-full accent-violet-500 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-xs text-neutral-400 mt-2 font-semibold">
                  <span>1000 {currency}</span>
                  <span>50000 {currency}</span>
                </div>
              </motion.div>
            )}
            
            {formData.priority === 'cheap' && !formData.is_negotiable && (
              <div className="mt-4 p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-500/20">
                <p className="text-sm text-violet-800 dark:text-violet-300 flex items-start gap-2">
                  <span className="text-xl leading-none">💡</span>
                  Мастера будут пытаться предложить как можно более дешевую цену. Точный бюджет не указывается.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Images */}
        <section className="space-y-6">
          <h3 className="text-xl font-bold border-b border-neutral-200 dark:border-neutral-800 pb-2">4. Примеры и референсы</h3>
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
            <p className="text-neutral-700 dark:text-neutral-300 font-bold">Нажмите или перетащите фото сюда</p>
            <p className="text-neutral-400 text-sm mt-1">Необязательно, но очень поможет мастерам понять идею</p>

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
        </section>

        {/* Submit Button */}
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
          <motion.button 
            whileHover={!isSubmitting ? { scale: 1.02 } : {}}
            whileTap={!isSubmitting ? { scale: 0.98 } : {}}
            type="submit" 
            disabled={isSubmitting}
            className="w-full md:w-auto bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-10 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-violet-500/30 disabled:opacity-70 disabled:hover:scale-100"
          >
            {isSubmitting ? t('loading') || 'Отправляем...' : (source === 'personal' ? 'Оставить заявку мастеру' : 'Опубликовать заявку')}
          </motion.button>
        </div>
      </form>
    </div>
  )
}
