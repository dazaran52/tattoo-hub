'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, User, Loader2, ArrowRight, ArrowLeft, Link as LinkIcon, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const [step, setStep] = useState(1)

  // Form State
  const [displayName, setDisplayName] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('2a71599c-91f2-4461-b77b-86a150db3aab')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  
  // Locations Data
  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])

  useEffect(() => {
    fetchProfile()
    fetchCountries()
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      setCities([])
      setSelectedCities([])
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
          setCities(data)
          if (data.length > 0) setSelectedCities([data[0].id])
        })
        .catch(err => console.error(err))
    }
  }, [selectedCountry])

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return router.push('/login')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        if (data.display_name) setDisplayName(data.display_name)
        if (data.portfolio_url) setPortfolioUrl(data.portfolio_url)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCountries = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      const data = await res.json()
      setCountries(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCountry || selectedCities.length === 0 || !displayName.trim()) {
      toast.error('Пожалуйста, заполните все поля')
      return
    }
    if (profile?.role === 'master') {
      setStep(2)
    } else {
      submitProfile()
    }
  }

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (profile?.role === 'master' && !portfolioUrl.trim()) {
      toast.error('Пожалуйста, укажите ссылку на ваше портфолио')
      return
    }
    submitProfile()
  }

  const submitProfile = async () => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const bodyData: any = {
        display_name: displayName,
        country_ids: [selectedCountry],
        city_ids: selectedCities
      }
      if (profile?.role === 'master') {
        bodyData.portfolio_url = portfolioUrl
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      })

      if (!response.ok) throw new Error('Failed to update profile')
      
      toast.success('Профиль успешно настроен!')
      setIsSuccess(true)
    } catch (err: any) {
      toast.error(err.message || 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  const totalSteps = profile?.role === 'master' ? 2 : 1

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row overflow-hidden relative bg-neutral-50 dark:bg-[#050505] transition-colors duration-300">
      
      {/* LEFT SIDE: Visuals */}
      <div className="relative w-full md:w-1/2 min-h-[30vh] md:min-h-screen flex flex-col items-center justify-center p-8 lg:p-16 overflow-hidden border-b md:border-b-0 md:border-r border-neutral-200/50 dark:border-white/5 bg-neutral-100 dark:bg-[#0a0a0a] z-0">
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full h-full max-w-2xl opacity-40 mix-blend-normal"
          >
            <div className={`absolute inset-0 rounded-full blur-[120px] ${profile?.role === 'master' ? 'bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400' : 'bg-gradient-to-tr from-indigo-600 via-purple-500 to-fuchsia-400'}`} />
          </motion.div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] z-0 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left w-full max-w-lg space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white drop-shadow-lg">
            Настройка профиля
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 font-light">
            Осталось всего пара шагов, чтобы {profile?.role === 'master' ? 'начать получать клиентов' : 'найти своего идеального тату-мастера'}.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Form Wizard */}
      <div className="relative w-full md:w-1/2 flex flex-col items-center justify-center p-4 pt-12 pb-28 sm:p-8 lg:p-16 z-10 overflow-y-auto min-h-screen md:min-h-0">
        <div className="w-full max-w-md">
          
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-neutral-200/50 dark:border-white/5 shadow-2xl rounded-3xl p-8 text-center"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-bold mb-4 dark:text-white">Всё готово!</h2>
                <p className="text-neutral-500 mb-8 leading-relaxed text-sm">
                  {profile?.role === 'master' 
                    ? 'Ваш профиль успешно создан! Вы уже можете пользоваться нашей CRM-системой. Доступ к покупке новых клиентов (Маркетплейсу) откроется после быстрой модерации вашего портфолио.'
                    : 'Ваш профиль настроен. Теперь вы можете искать мастеров и записываться на сеансы.'}
                </p>
                <button
                  onClick={() => router.push(profile?.role === 'master' ? '/dashboard' : '/')}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(99,102,241,0.3)]"
                >
                  {profile?.role === 'master' ? 'Перейти в CRM' : 'На главную'} <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key={`step-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-neutral-200/50 dark:border-white/5 shadow-2xl rounded-3xl p-8"
              >
                {/* Progress Bar */}
                <div className="flex items-center gap-2 mb-8">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${step > i ? (profile?.role === 'master' ? 'bg-orange-500' : 'bg-indigo-500') : 'bg-neutral-200 dark:bg-neutral-800'}`} />
                  ))}
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl font-bold dark:text-white mb-2">
                    {step === 1 ? 'Общая информация' : 'Подтверждение квалификации'}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {step === 1 ? 'Расскажите немного о себе.' : 'Добавьте ссылку на свои работы, чтобы клиенты могли вам доверять.'}
                  </p>
                </div>

                {step === 1 ? (
                  <form onSubmit={handleNextStep} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">
                        {profile?.role === 'master' ? 'Ваше имя / Название студии' : 'Ваше имя'}
                      </label>
                      <div className="relative group">
                        <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 transition-colors ${profile?.role === 'master' ? 'group-focus-within:text-orange-500' : 'group-focus-within:text-indigo-500'}`} />
                        <input
                          required
                          type="text"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          placeholder="Имя / Псевдоним"
                          className={`w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 transition-all ${profile?.role === 'master' ? 'focus:ring-orange-500/20 focus:border-orange-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">Город</label>
                      <div className="relative group">
                        <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 transition-colors ${profile?.role === 'master' ? 'group-focus-within:text-orange-500' : 'group-focus-within:text-indigo-500'}`} />
                        <select
                          required
                          value={selectedCities[0] || ''}
                          onChange={e => setSelectedCities([e.target.value])}
                          className={`w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 appearance-none cursor-pointer transition-all ${profile?.role === 'master' ? 'focus:ring-orange-500/20 focus:border-orange-500' : 'focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                        >
                          <option value="" disabled>Выберите город</option>
                          {cities.map(c => (
                            <option key={c.id} value={c.id}>{c.name_ru}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-4 mt-4 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all mt-8 ${profile?.role === 'master' ? 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 shadow-[0_10px_30px_rgba(234,88,12,0.3)]' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_10px_30px_rgba(99,102,241,0.3)]'}`}
                    >
                      {totalSteps === 1 ? 'Завершить' : 'Далее'} <ArrowRight className="w-5 h-5" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleFinalSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 ml-1">
                        Ссылка на портфолио <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 transition-colors group-focus-within:text-orange-500" />
                        <input
                          required
                          type="url"
                          value={portfolioUrl}
                          onChange={e => setPortfolioUrl(e.target.value)}
                          placeholder="https://instagram.com/..."
                          className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                      </div>
                      <p className="text-xs text-neutral-500 ml-1 mt-2 leading-relaxed">
                        Администрация проверит ваши работы перед тем, как открыть полный доступ к лидам. Это помогает поддерживать высокое качество мастеров на платформе.
                      </p>
                    </div>

                    <div className="flex gap-3 mt-8">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="py-4 px-4 bg-white/60 dark:bg-neutral-800/60 border border-neutral-200 dark:border-white/10 hover:bg-white dark:hover:bg-neutral-700 text-neutral-900 dark:text-white rounded-2xl font-bold transition-all flex items-center justify-center backdrop-blur-md"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-4 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(234,88,12,0.3)] disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Завершить регистрацию'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
