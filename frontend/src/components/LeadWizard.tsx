'use client'

import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Calendar as CalendarIcon, User, MapPin, FileText, CheckCircle, 
  ArrowLeft, Send, Link as LinkIcon, AtSign, Upload, Loader2,
  X, Image as ImageIcon, ChevronRight, Phone, Clock, DollarSign, 
  Sparkles, AlertTriangle, Check, ChevronDown, ChevronUp, ExternalLink, Share2, ShieldCheck, Mail
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import { format } from 'date-fns'
import { ru, enUS, cs, uk } from 'date-fns/locale'
import { useTranslations, useLocale } from 'next-intl'
import { TATTOO_STYLES, BODY_PLACES, TATTOO_SIZES } from '@/lib/constants'
import imageCompression from 'browser-image-compression'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { PhoneInput } from './PhoneInput'

export interface LeadWizardProps {
  master?: {
    id: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
  masterId?: string;
  source?: 'platform' | 'personal';
  isLoggedIn?: boolean;
  themeClasses?: {
    card?: string;
    input?: string;
    buttonPrimary?: string;
  };
  onSuccess?: () => void;
  initialData?: any;
}

const defaultThemeClasses = {
  card: 'bg-neutral-900/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-white',
  input: 'bg-black/50 border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500',
  buttonPrimary: 'bg-gradient-to-r from-accent-500 via-blue-600 to-primary-600 text-white shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40',
};

function ImagePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const t = useTranslations()
  const previewUrl = React.useMemo(() => URL.createObjectURL(file), [file])

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

  return (
    <div className="relative group aspect-square rounded-2xl overflow-hidden border border-white/20 bg-black/50 shadow-md">
      <Image
        src={previewUrl || ''}
        alt={file.name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
       width={800} height={800} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${t('leadWizard.deleteBtn')} ${file.name}`}
        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200 flex flex-col items-center justify-center text-red-400 hover:text-red-300 cursor-pointer gap-1"
      >
        <X className="w-7 h-7" />
        <span className="text-[11px] font-bold">{t('leadWizard.deleteBtn')}</span>
      </button>
    </div>
  )
}

export function LeadWizard({ master, masterId, source = 'platform', isLoggedIn, themeClasses, onSuccess, initialData }: LeadWizardProps) {
  const router = useRouter()
  const t = useTranslations()
  const lang = useLocale()
  const dateLocale = lang === 'en' ? enUS : lang === 'cs' ? cs : lang === 'uk' ? uk : ru
  const tClasses = { ...defaultThemeClasses, ...themeClasses }

  const [authLoggedIn, setAuthLoggedIn] = useState(Boolean(isLoggedIn))
  const isUserLoggedIn = Boolean(isLoggedIn || authLoggedIn)

  // Гарантированные структурные классы, которые никогда не затираются внешними темами
  const baseCardClass = `w-full rounded-3xl p-6 sm:p-8 md:p-10 transition-all duration-500 relative overflow-hidden ${tClasses.card}`
  const baseInputClass = `w-full rounded-2xl px-4 py-3.5 text-sm sm:text-base transition-all shadow-inner focus:outline-none focus:ring-2 ${tClasses.input}`
  const baseButtonClass = `w-full sm:w-auto min-w-[220px] px-8 py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${tClasses.buttonPrimary}`

  const [resolvedMaster, setResolvedMaster] = useState(master)
  useEffect(() => {
    if (master) {
      setResolvedMaster(master)
    } else if (masterId) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/public/masters/${masterId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setResolvedMaster({
              id: data.id || masterId,
              username: data.username,
              full_name: data.display_name || data.full_name || data.name,
              avatar_url: data.avatar_url
            })
          } else {
            setResolvedMaster({ id: masterId })
          }
        })
        .catch(() => setResolvedMaster({ id: masterId }))
    }
  }, [master, masterId])

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

  // Countries and Cities State
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [city, setCity] = useState('')
  const [locationPrefilled, setLocationPrefilled] = useState(false)
  const [showLocationSelect, setShowLocationSelect] = useState(true)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
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
    if (!resolvedMaster?.id) return
    const fetchUnavailable = async () => {
      try {
        const identifier = resolvedMaster.username || resolvedMaster.id
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
  }, [resolvedMaster?.id, resolvedMaster?.username])

  // Fetch countries and prefill from profile/initialData/localStorage
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error(err))

    if (initialData) {
      if (initialData.description) setDescription(initialData.description)
      if (initialData.style) setStyles(typeof initialData.style === 'string' ? initialData.style.split(',').map((s: string) => s.trim()).filter(Boolean) : initialData.style)
      if (initialData.body_place) setBodyPlace(initialData.body_place)
      if (initialData.size) setSize(initialData.size)
      if (initialData.client_priority || initialData.priority) setClientPriority(initialData.client_priority || initialData.priority)
      if (initialData.budget || initialData.client_budget) {
        const b = String(initialData.budget || initialData.client_budget)
        if (b.toLowerCase().includes('договор') || b.toLowerCase().includes('negotiable')) {
          setIsNegotiable(true)
        } else {
          setBudgetVal(String(parseInt(b, 10) || ''))
        }
      } else if (initialData.budget_val) {
        setBudgetVal(String(initialData.budget_val))
      }
      if (initialData.country_id) setSelectedCountry(initialData.country_id)
      if (initialData.city) setCity(initialData.city)
      if (initialData.name || initialData.client_name) setName(initialData.name || initialData.client_name)
      if (initialData.email || initialData.contact) {
        const c = initialData.email || initialData.contact
        if (String(c).includes('@') && !String(c).includes('Telegram')) setEmail(c)
        else setPhone(c)
      }
      if (initialData.instagram) setInstagram(initialData.instagram)
      if (initialData.image_urls && Array.isArray(initialData.image_urls)) setUploadedUrls(initialData.image_urls)
    } else {
      const pendingLeadStr = localStorage.getItem('pending_lead')
      if (pendingLeadStr) {
        try {
          const pending = JSON.parse(pendingLeadStr)
          if (pending.description) setDescription(pending.description)
          if (pending.style) setStyles(typeof pending.style === 'string' ? pending.style.split(',').map((s: string) => s.trim()).filter(Boolean) : pending.style)
          if (pending.body_place) setBodyPlace(pending.body_place)
          if (pending.size) setSize(pending.size)
          if (pending.client_priority || pending.priority) setClientPriority(pending.client_priority || pending.priority)
          if (pending.is_negotiable_budget || (typeof pending.budget === 'string' && (pending.budget.toLowerCase().includes('договор') || pending.budget.toLowerCase().includes('negotiable')))) {
            setIsNegotiable(true)
          } else if (pending.budget_val) {
            setBudgetVal(String(pending.budget_val))
          } else if (pending.budget) {
            setBudgetVal(String(parseInt(String(pending.budget), 10) || ''))
          }
          if (pending.country_id) setSelectedCountry(pending.country_id)
          if (pending.city) setCity(pending.city)
          if (pending.name || pending.client_name) setName(pending.name || pending.client_name)
          if (pending.email || pending.contact) {
            const c = pending.email || pending.contact
            if (String(c).includes('@') && !String(c).includes('Telegram')) setEmail(c)
            else setPhone(c)
          }
          if (pending.instagram) setInstagram(pending.instagram)
          if (pending.image_urls && Array.isArray(pending.image_urls)) setUploadedUrls(pending.image_urls)
        } catch (e) {
          console.error('Failed to parse pending_lead:', e)
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setAuthLoggedIn(true)
        api.getProfile().then(p => {
          if (p.country_ids && p.country_ids.length > 0 && !selectedCountry && !initialData?.country_id) {
            setSelectedCountry(p.country_ids[0])
            setLocationPrefilled(true)
            setShowLocationSelect(false)
          }
          const profileName = p.display_name || (p as any).full_name || (p as any).name || session.user?.user_metadata?.full_name || session.user?.user_metadata?.name
          if (profileName && !name && !initialData?.name) setName(profileName)
          const profileEmail = p.email || session.user?.email
          if (profileEmail && !email && !initialData?.email) setEmail(profileEmail)
          if (p.phone && !phone && !initialData?.contact) setPhone(p.phone)
          if ((p as any).instagram && !instagram && !initialData?.instagram) setInstagram((p as any).instagram)
        }).catch(err => console.error(err))
      }
    })
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
          setCities(data)
          if (data.length > 0 && !city) {
            const defaultCity = data[0].name_ru || data[0].name
            setCity(defaultCity)
          }
        })
        .catch(err => console.error(err))
    } else {
      setCities([])
    }
  }, [selectedCountry])

  useEffect(() => {
    if (styles.length > 0 || bodyPlace || size) setOpenStep1Details(true)
  }, [styles.length, bodyPlace, size])

  useEffect(() => {
    if (sessionDate || sessionTime) setOpenStep2Details(true)
  }, [sessionDate, sessionTime])

  useEffect(() => {
    if (phone || telegram || instagram) setOpenStep3Details(true)
  }, [phone, telegram, instagram])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const newFiles = Array.from(e.target.files)
    if (images.length + newFiles.length > 10) {
      toast.error(t('leadWizard.errorMaxPhotos'))
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
      toast.error(t('leadWizard.errorPhotoProcess'))
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const validateStep1 = () => {
    if (!description.trim()) {
      toast.error(t('leadWizard.errorIdeaReq'))
      return false
    }
    return true
  }

  const validateStep2 = () => {
    if (!selectedCountry || !city) {
      toast.error(t('leadWizard.errorCityReq'))
      return false
    }
    if (!isNegotiable && (!budgetVal || !budgetVal.trim() || isNaN(parseInt(budgetVal, 10)) || parseInt(budgetVal, 10) <= 0)) {
      toast.error(t('leadWizard.errorBudgetReq'))
      return false
    }
    return true
  }

  const validateStep3 = () => {
    if (!name.trim()) {
      toast.error(t('leadWizard.errorNameReq'))
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error(t('leadWizard.errorEmailReq'))
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
    const toastId = toast.loading(t('leadWizard.submittingLead'))

    try {
      const finalImageUrls = await uploadPhotosToSupabase()

      const parsedVal = budgetVal && !isNaN(parseInt(budgetVal, 10)) ? parseInt(budgetVal, 10) : null
      const budgetStr = isNegotiable ? t('leadWizard.negotiablePriceText') : (budgetVal ? `${budgetVal} CZK` : null)

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
        city: city || null,
        country_id: selectedCountry || null,
        name: name.trim() || t('leadWizard.noNameDefault'),
        contact: [phone, telegram ? `Telegram: ${telegram}` : null].filter(Boolean).join(' | ') || email.trim() || null,
        instagram: instagram.trim() || null,
        is_negotiable_budget: isNegotiable,
        image_urls: finalImageUrls,
        session_date: sessionDate ? sessionDate.toISOString() : null,
        session_time: sessionTime || null,
        client_name: name.trim() || null,
        source: source
      }

      const targetMasterId = resolvedMaster?.id || masterId
      const isDirectEndpoint = Boolean(targetMasterId)
      const endpoint = isDirectEndpoint
        ? `/api/leads/client/direct/${targetMasterId}`
        : '/api/leads/client'
      const { data: { session } } = await supabase.auth.getSession()
      if (isDirectEndpoint && !session) {
        throw new Error(t('leadWizard.errorLoginRequired'))
      }
      if (!session) {
        localStorage.setItem('pending_lead', JSON.stringify({
          ...payload,
          created_at: Date.now()
        }))
        toast.success(t('leadWizard.leadSentSuccess'), { id: toastId })
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
        throw new Error(errData.detail || t('leadWizard.errorSubmitFailed'))
      }

      const resData = await res.json()
      if (resData.login_link) {
        setLoginLink(resData.login_link)
      }

      localStorage.removeItem('pending_lead')
      toast.success(t('leadWizard.leadSentSuccess'), { id: toastId })
      setIsSuccess(true)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || t('leadWizard.errorSubmitGeneral'), { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitToMarketplace = async () => {
    if (isPublishedToMarketplace || isPublishingMarketplace) return
    setIsPublishingMarketplace(true)
    const toastId = toast.loading(t('leadWizard.submittingLead'))

    try {
      const parsedVal = budgetVal && !isNaN(parseInt(budgetVal, 10)) ? parseInt(budgetVal, 10) : null
      const budgetStr = isNegotiable ? t('leadWizard.negotiablePriceText') : (budgetVal ? `${budgetVal} CZK` : null)

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
        city: city || null,
        country_id: selectedCountry || null,
        name: name.trim() || t('leadWizard.noNameDefault'),
        contact: [phone, telegram ? `Telegram: ${telegram}` : null].filter(Boolean).join(' | ') || email.trim() || null,
        instagram: instagram.trim() || null,
        is_negotiable_budget: isNegotiable,
        image_urls: uploadedUrls,
        session_date: sessionDate ? sessionDate.toISOString() : null,
        session_time: sessionTime || null,
        client_name: name.trim() || null,
        source: 'platform'
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error(t('leadWizard.errorMarketplacePublish'))

      toast.success(t('leadWizard.alsoPublishedSuccess'), { id: toastId })
      setIsPublishedToMarketplace(true)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || t('leadWizard.errorPublishGeneral'), { id: toastId })
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

        <h3 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">{t('leadWizard.leadSentSuccess')}</h3>
        <p className="text-neutral-300 text-base mb-8 max-w-md mx-auto leading-relaxed">
          {resolvedMaster && source === 'personal' ? (
            <>{t('leadWizard.ideaSentToMasterDesc')} <strong className="text-white font-bold">{resolvedMaster.full_name || resolvedMaster.username || 'Мастеру'}</strong>. {t('leadWizard.ideaSentToMasterSub')}</>
          ) : (
            <>{t('leadWizard.ideaPublishedToMarketplace')}</>
          )}
        </p>

        {resolvedMaster && source === 'personal' && !isPublishedToMarketplace && (
          <div className="bg-gradient-to-r from-primary-500/15 via-primary-500/15 to-accent-500/15 border border-primary-500/40 rounded-3xl p-6 mb-8 text-left transition-all hover:border-primary-500/60 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary-500/20 text-primary-300 rounded-2xl mt-0.5 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-base sm:text-lg mb-1 flex items-center flex-wrap gap-2">
                  {t('leadWizard.sendAlsoToMarketplace')}
                  <span className="text-[10px] bg-primary-500/30 text-primary-300 border border-primary-500/40 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">{t('leadWizard.freeBadge')}</span>
                </h4>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-5">
                  {t('leadWizard.sendAlsoDesc')}
                </p>
                <button
                  type="button"
                  onClick={submitToMarketplace}
                  disabled={isPublishingMarketplace}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-primary-600 to-primary-600 hover:from-primary-500 hover:to-primary-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPublishingMarketplace && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Share2 className="w-4 h-4" />
                  {t('leadWizard.publishOnMarketplaceBtn')}
                </button>
              </div>
            </div>
          </div>
        )}

        {isPublishedToMarketplace && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-300 rounded-2xl p-4 mb-8 flex items-center justify-center gap-2 text-sm sm:text-base font-semibold shadow-inner">
            <Check className="w-5 h-5 text-green-400 shrink-0" />
            {t('leadWizard.alsoPublishedSuccess')}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleTrackLead}
            className="w-full py-5 px-8 bg-gradient-to-r from-accent-500 via-blue-600 to-primary-600 hover:from-accent-400 hover:to-primary-500 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-2xl shadow-accent-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <ShieldCheck className="w-6 h-6" />
            {t('leadWizard.goToLeadAndChat')}
          </button>
          {!isUserLoggedIn ? (
            <p className="text-xs sm:text-sm text-neutral-400">
              {t('leadWizard.safeLoginFor')} <span className="text-accent-400 font-semibold underline">{email}</span>
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-neutral-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
              <span>{t('leadWizard.savedToYourAccount')}</span> <span className="text-accent-400 font-semibold">{email}</span>
            </p>
          )}
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
              <h3 className="text-2xl font-bold text-center mb-2 tracking-tight">{t('leadWizard.warningModalTitle')}</h3>
              <p className="text-sm sm:text-base text-neutral-300 text-center mb-8 leading-relaxed">
                {t('leadWizard.warningModalDesc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="flex-1 py-4 px-5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-2xl transition-all text-center cursor-pointer"
                >
                  {t('leadWizard.warningModalBack')}
                </button>
                <button
                  type="button"
                  onClick={executeSubmit}
                  className="flex-1 py-4 px-5 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-extrabold text-sm rounded-2xl shadow-lg shadow-yellow-500/20 transition-all text-center cursor-pointer"
                >
                  {t('leadWizard.warningModalSubmit')}
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
              { num: 1, title: t('leadWizard.step1Title'), subtitle: t('leadWizard.step1Sub') },
              { num: 2, title: t('leadWizard.step2Title'), subtitle: t('leadWizard.step2Sub') },
              { num: 3, title: t('leadWizard.step3Title'), subtitle: t('leadWizard.step3Sub') }
            ].map((st) => {
              const isActive = step === st.num
              const isDone = step > st.num
              return (
                <div 
                  key={st.num}
                  onClick={() => isDone && setStep(st.num as any)}
                  className={`p-3 sm:p-4 rounded-2xl border transition-all flex items-center gap-3 ${
                    isActive 
                      ? 'bg-accent-500/15 border-accent-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                      : isDone 
                        ? 'bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10 cursor-pointer' 
                        : 'bg-black/20 border-white/5 text-neutral-500 opacity-60'
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-extrabold text-sm sm:text-base shrink-0 transition-colors ${
                    isActive ? 'bg-accent-500 text-black' : isDone ? 'bg-green-500 text-black' : 'bg-neutral-800 text-neutral-400'
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
              className="bg-gradient-to-r from-accent-500 via-blue-500 to-primary-500 h-full rounded-full shadow-[0_0_12px_rgba(6,182,212,0.8)]"
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
                  {t('leadWizard.ideaLabel')} <span className="text-red-500">*</span>
                </label>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4 leading-relaxed">
                  {t('leadWizard.ideaDesc')}
                </p>
                <div className="relative">
                  <FileText className="absolute right-4 top-4 w-5 h-5 text-neutral-500 pointer-events-none" />
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('leadWizard.ideaPlaceholder')}
                    rows={5}
                    className={`${baseInputClass} pr-12 min-h-[140px] resize-none leading-relaxed text-base`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-base sm:text-lg font-bold text-white">
                    {t('leadWizard.referencesLabel')} <span className="text-neutral-400 font-normal text-sm">{t('leadWizard.referencesMax')}</span>
                  </label>
                  {images.length > 0 && (
                    <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2.5 py-1 rounded-full border border-accent-500/20">
                      {t('leadWizard.uploadedCount')} {images.length} / 10
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4 leading-relaxed">
                  {t('leadWizard.referencesDesc')}
                </p>

                {images.length === 0 ? (
                  <label className="w-full p-8 sm:p-12 rounded-3xl border-2 border-dashed border-white/20 hover:border-accent-500/60 bg-gradient-to-b from-white/[0.03] to-transparent hover:from-accent-500/[0.05] transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group text-center shadow-lg">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-accent-500/20 via-blue-500/20 to-primary-500/20 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-accent-500/50 transition-all duration-300 shadow-xl">
                      {isUploading ? (
                        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-accent-400 animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-accent-400 group-hover:text-accent-300 transition-colors" />
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-extrabold text-white group-hover:text-accent-300 transition-colors mb-1.5">
                      {t('leadWizard.dragDropText')}
                    </span>
                    <span className="text-xs sm:text-sm text-neutral-400 max-w-sm leading-relaxed">
                      {t('leadWizard.supportedFormats')}
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
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-accent-500/50 bg-white/[0.02] hover:bg-white/[0.06] transition-all flex flex-col items-center justify-center cursor-pointer text-neutral-400 hover:text-accent-400 group">
                        {isUploading ? (
                          <Loader2 className="w-7 h-7 animate-spin mb-1 text-accent-400" />
                        ) : (
                          <>
                            <Upload className="w-7 h-7 mb-1.5 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold">{t('leadWizard.addMoreBtn')}</span>
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
                      ? 'bg-gradient-to-br from-accent-500/10 via-primary-500/10 to-transparent border-accent-500/40 shadow-lg'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-500/20 to-primary-500/20 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      🎨
                    </div>
                    <div>
                      <div className="text-base font-bold text-white group-hover:text-accent-300 transition-colors flex items-center flex-wrap gap-2 mb-1">
                        {t('leadWizard.step1AccordionTitle')}
                        <span className="bg-accent-500/20 text-accent-300 border border-accent-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {t('leadWizard.recommendedBadge')}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 leading-normal">
                        {styles.length > 0 || bodyPlace || size ? (
                          <span className="text-accent-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 inline" /> {t('leadWizard.detailsFilled')} ({[styles.length > 0 ? t('leadWizard.detailStyle') : '', bodyPlace ? t('leadWizard.detailPlace') : '', size ? t('leadWizard.detailSize') : ''].filter(Boolean).join(', ')})
                          </span>
                        ) : (
                          t('leadWizard.step1AccordionDesc')
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
                          {t('leadWizard.tattooStyleLabel')}
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
                                    ? 'bg-gradient-to-r from-accent-500 to-blue-600 border-accent-400 text-white shadow-lg shadow-accent-500/25 scale-[1.03]'
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
                          placeholder={t('leadWizard.stylePlaceholder')}
                          className={baseInputClass}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                          {t('leadWizard.bodyPlaceLabel')}
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
                                    ? 'bg-gradient-to-r from-accent-500 to-blue-600 border-accent-400 text-white shadow-lg shadow-accent-500/25 scale-[1.03]'
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
                            placeholder={t('leadWizard.placePlaceholder')}
                            className={`${baseInputClass} pl-12`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                          {t('leadWizard.approxSizeLabel')}
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
                                    ? 'bg-gradient-to-br from-accent-500/20 to-blue-600/20 border-accent-400 text-white shadow-lg shadow-accent-500/15 scale-[1.03]'
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
                          placeholder={t('leadWizard.sizePlaceholder')}
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
                  <span>{t('leadWizard.continueToStep2')}</span>
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
                  {t('leadWizard.priorityQuestion')}
                </label>
                <p className="text-xs sm:text-sm text-neutral-400 mb-4">
                  {t('leadWizard.priorityDesc')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'fast', icon: '⚡', label: t('leadWizard.fastestTime'), desc: t('leadWizard.findNearestSlot') },
                    { id: 'quality', icon: '💎', label: t('leadWizard.maxQuality'), desc: t('leadWizard.detailedWork') },
                    { id: 'cheap', icon: '💸', label: t('leadWizard.fitBudget'), desc: t('leadWizard.optimizePrice') }
                  ].map(p => {
                    const isSel = clientPriority === p.id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setClientPriority(p.id as any)}
                        className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2.5 ${
                          isSel
                            ? 'border-accent-500 bg-gradient-to-b from-accent-500/20 to-transparent text-white shadow-[0_0_30px_rgba(6,182,212,0.2)] scale-[1.03]'
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

              {/* Choice of Country and City */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-white mb-3">
                  {t('leadWizard.locationLabel')} <span className="text-red-500">*</span>
                </label>
                {locationPrefilled && !showLocationSelect ? (
                  <div className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-2xl">
                    <div className="flex items-center gap-3 text-neutral-300">
                      <MapPin className="w-5 h-5 text-accent-400" />
                      <div>
                        <p className="font-semibold text-sm">{t('leadWizard.cityFromProfile')}</p>
                        <p className="text-xs text-neutral-400">{city}</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => setShowLocationSelect(true)}
                      className="text-sm font-bold text-accent-400 hover:text-accent-300 transition-colors cursor-pointer"
                    >
                      {t('leadWizard.changeLocation')}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <select
                        value={selectedCountry}
                        onChange={e => setSelectedCountry(e.target.value)}
                        className={baseInputClass}
                      >
                        <option value="" disabled>{t('leadWizard.selectCountry')}</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.id} className="bg-neutral-900 text-white">{lang === 'ru' ? c.name_ru : c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        className={baseInputClass}
                        disabled={!selectedCountry}
                      >
                        <option value="" disabled>{countries.length === 0 ? t('leadWizard.loading') : t('leadWizard.selectCity')}</option>
                        {cities.map(c => (
                          <option key={c.id} value={lang === 'ru' ? c.name_ru : c.name} className="bg-neutral-900 text-white">{lang === 'ru' ? c.name_ru : c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base sm:text-lg font-bold text-white mb-3">
                  {t('leadWizard.budgetLabel')}
                </label>
                
                <div 
                  onClick={() => {
                    setIsNegotiable(!isNegotiable)
                    if (!isNegotiable) setBudgetVal('')
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 mb-4 w-full sm:w-fit ${
                    isNegotiable 
                      ? 'bg-accent-500/15 border-accent-500 text-white shadow-md' 
                      : 'bg-black/40 border-white/10 hover:bg-white/5 text-neutral-300'
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-lg border transition-all shrink-0 ${
                    isNegotiable
                      ? 'bg-accent-500 border-accent-500 text-black'
                      : 'bg-black/60 border-neutral-700'
                  }`}>
                    {isNegotiable && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>
                  <span className="text-sm sm:text-base font-bold select-none">
                    {t('leadWizard.negotiableOption')}
                  </span>
                </div>

                {!isNegotiable && (
                  <div className="relative max-w-md">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="number"
                      value={budgetVal}
                      onChange={(e) => setBudgetVal(e.target.value)}
                      placeholder={t('leadWizard.budgetPlaceholder')}
                      className={`${baseInputClass} pl-12 pr-20 text-lg font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
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
                      ? 'bg-gradient-to-br from-accent-500/10 via-blue-500/10 to-transparent border-accent-500/40 shadow-lg'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      📅
                    </div>
                    <div>
                      <div className="text-base font-bold text-white group-hover:text-accent-300 transition-colors flex items-center flex-wrap gap-2 mb-1">
                        {t('leadWizard.step2AccordionTitle')}
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          {t('leadWizard.optionalBadge')}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 leading-normal">
                        {sessionDate ? (
                          <span className="text-accent-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 inline" /> {t('leadWizard.selectedDatePrefix')} {format(sessionDate, 'dd MMMM yyyy', { locale: dateLocale })} {sessionTime ? `${t('leadWizard.atTime')} ${sessionTime}` : ''}
                          </span>
                        ) : (
                          t('leadWizard.step2AccordionDesc')
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
                          {t('leadWizard.calendarLabel')}
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
                            locale={dateLocale}
                          />
                        </div>
                      </div>

                      {sessionDate && (
                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-3">
                            {t('leadWizard.timeLabel')} <span className="text-neutral-500 font-normal">{t('leadWizard.optionalBadgeText')}</span>
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
                  {t('leadWizard.backToStep1')}
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className={baseButtonClass}
                >
                  <span>{t('leadWizard.continueToStep3')}</span>
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
              {isUserLoggedIn ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 flex items-center gap-3.5 text-emerald-300 text-sm sm:text-base font-medium shadow-xl">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0 shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <strong className="text-white text-base font-extrabold block mb-0.5">{t('leadWizard.loggedInNoticeTitle')}</strong>
                    <span className="text-neutral-300 text-xs sm:text-sm leading-relaxed">{t('leadWizard.loggedInNoticeDesc')}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-accent-500/15 via-blue-500/15 to-primary-500/15 border border-accent-500/40 rounded-3xl p-5 sm:p-6 flex items-start gap-4 shadow-xl">
                  <div className="p-3 bg-accent-500/20 text-accent-300 rounded-2xl shrink-0 mt-0.5 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                    <strong className="text-white text-base font-extrabold block mb-1">{t('leadWizard.instantAccessTitle')}</strong>
                    {t('leadWizard.instantAccessDesc')}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-base font-bold text-white">
                      {t('leadWizard.yourNameLabel')} <span className="text-red-500">*</span>
                    </label>
                    {isUserLoggedIn && (
                      <span className="text-[11px] font-semibold text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                        {t('leadWizard.fromAccountBadge')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => !isUserLoggedIn && setName(e.target.value)}
                      readOnly={isUserLoggedIn}
                      disabled={isUserLoggedIn}
                      placeholder={t('leadWizard.namePlaceholder')}
                      className={`${baseInputClass} pl-12 text-base font-medium ${
                        isUserLoggedIn ? 'opacity-70 cursor-not-allowed bg-neutral-800/80 border-neutral-700/50 text-neutral-300' : ''
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-base font-bold text-white">
                      {isUserLoggedIn ? (t('leadWizard.emailSimpleLabel') || 'Email') : (t('leadWizard.emailLabel') || 'Email для входа в кабинет')} <span className="text-red-500">*</span>
                    </label>
                    {isUserLoggedIn && (
                      <span className="text-[11px] font-semibold text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
                        {t('leadWizard.fromAccountBadge')}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => !isUserLoggedIn && setEmail(e.target.value)}
                      readOnly={isUserLoggedIn}
                      disabled={isUserLoggedIn}
                      placeholder="example@mail.com"
                      className={`${baseInputClass} pl-12 text-base font-medium ${
                        isUserLoggedIn ? 'opacity-70 cursor-not-allowed bg-neutral-800/80 border-neutral-700/50 text-neutral-300' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Accordion Step 3 */}
              <div className="pt-2">
                <div 
                  onClick={() => setOpenStep3Details(!openStep3Details)}
                  className={`w-full p-5 sm:p-6 rounded-3xl border transition-all cursor-pointer flex items-center justify-between text-left group ${
                    openStep3Details || phone || telegram || instagram
                      ? 'bg-gradient-to-br from-accent-500/10 via-primary-500/10 to-transparent border-accent-500/40 shadow-lg'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent-500/20 to-primary-500/20 border border-white/10 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      📱
                    </div>
                    <div>
                      <div className="text-base font-bold text-white group-hover:text-accent-300 transition-colors flex items-center flex-wrap gap-2 mb-1">
                        {t('leadWizard.step3AccordionTitle')}
                        <span className="bg-neutral-800 text-neutral-400 border border-neutral-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          {t('leadWizard.optionalBadge')}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-neutral-400 leading-normal">
                        {phone || telegram || instagram ? (
                          <span className="text-accent-400 font-semibold flex items-center gap-1.5">
                            <Check className="w-4 h-4 inline" /> {t('leadWizard.addedContacts')} ({[phone ? t('leadWizard.phoneLabel') : '', telegram ? 'Telegram' : '', instagram ? 'Instagram' : ''].filter(Boolean).join(', ')})
                          </span>
                        ) : (
                          t('leadWizard.step3AccordionDesc')
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
                            {t('leadWizard.phoneLabel')}
                          </label>
                          <div className="dark">
                            <PhoneInput
                              value={phone}
                              onChange={setPhone}
                              className="bg-white/5 border-white/10"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-2.5">
                            Telegram
                          </label>
                          <div className="relative">
                            <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                            <input
                              type="text"
                              value={telegram}
                              onChange={(e) => setTelegram(e.target.value)}
                              placeholder="@username"
                              className={`${baseInputClass} pl-12 text-base font-medium`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-extrabold uppercase tracking-widest text-neutral-300 mb-2.5">
                            {t('leadWizard.instagramLabel')}
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
                  {t('leadWizard.backToStep2')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className={`${baseButtonClass} shadow-accent-500/30 hover:shadow-accent-500/50`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span>{t('leadWizard.submittingBtn')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{masterId ? t('leadWizard.submitBtnDirect') : t('leadWizard.submitBtnMarketplace')}</span>
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
