'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight, Link as LinkIcon, Tag, MapPin, Globe, X, Sun, Moon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTranslation, Language } from '@/lib/i18n'
import { Logo } from '@/components/Logo'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [role, setRole] = useState<'master' | 'client'>('master')
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<string>('cs')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // Add gyroscope listener for mobile parallax
    const handleTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        const x = Math.min(Math.max(e.gamma, -30), 30)
        const y = Math.min(Math.max(e.beta - 45, -30), 30) 
        setTilt({ x: x, y: y })
      }
    }

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent && !window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('deviceorientation', handleTilt)
    }
    return () => window.removeEventListener('deviceorientation', handleTilt)
  }, [])

  useEffect(() => {
    // Read from URL params safely
    const registerParam = searchParams.get('register')
    const roleParam = searchParams.get('role')

    if (roleParam === 'client' || roleParam === 'master') {
      setRole(roleParam)
    }

    if (registerParam === 'client') {
      setIsSignUp(true)
      setRole('client')
    } else if (registerParam === 'master') {
      setIsSignUp(true)
      setRole('master')
    }
  }, [searchParams])

  useEffect(() => {
    const savedLang = localStorage.getItem('language')
    if (savedLang) {
      setLanguage(savedLang)
    } else {
      const sysLang = navigator.language.toLowerCase()
      if (sysLang.startsWith('ru')) setLanguage('ru')
      else if (sysLang.startsWith('en')) setLanguage('en')
      else setLanguage('cs')
    }

    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme as 'dark' | 'light')
  }, [])

  const toggleLanguage = () => {
    const langs = ['cs', 'en', 'ru']
    const currentIndex = langs.indexOf(language)
    const newLang = langs[(currentIndex + 1) % langs.length] || 'cs'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
    localStorage.setItem('app_lang', newLang)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    const root = document.documentElement
    if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
    }
  }

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  const [countries, setCountries] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries`)
      .then(res => res.json())
      .then(data => setCountries(data))
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (selectedCountry) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/locations/countries/${selectedCountry}/cities`)
        .then(res => res.json())
        .then(data => {
            setCities(data)
            if (data.length > 0) setSelectedCities([data[0].id])
        })
        .catch(err => console.error(err))
    } else {
      setCities([])
      setSelectedCities([])
    }
  }, [selectedCountry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    


    try {
      if (isSignUp) {
        // Sign up

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              portfolio_url: portfolioUrl,
              referred_by: referralCode,
              country_ids: selectedCountry ? [selectedCountry] : [],
              city_ids: selectedCities,
              role: role,
            }
          }
        })


        if (signUpError) throw signUpError

        if (data.user) {
          const token = data.session?.access_token
          if (token) {
            const maxAge = 60 * 60 * 24 * 7 // 7 days
            document.cookie = `sb-access-token=${token};path=/;max-age=${maxAge};SameSite=Lax${window.location.protocol === 'https:' ? ';Secure' : ''}`
          }

          let redirectUrl = '/dashboard'
          window.location.href = redirectUrl
        }
      } else {
        // Sign in

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })


        if (signInError) throw signInError

        if (data.session) {

          // Manually set cookie for middleware detection
          const token = data.session.access_token
          const maxAge = 60 * 60 * 24 * 7 // 7 days
          document.cookie = `sb-access-token=${token};path=/;max-age=${maxAge};SameSite=Lax${window.location.protocol === 'https:' ? ';Secure' : ''}`

          let redirectUrl = '/dashboard'
          window.location.href = redirectUrl
        } else {
          throw new Error('No session returned')
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row overflow-hidden relative bg-neutral-50 dark:bg-[#050505] transition-colors duration-300">
      
      {/* LEFT SIDE: Visuals & Branding (Hidden on small mobile, stacked on tablet, split on desktop) */}
      <div className="relative w-full md:w-1/2 min-h-[30vh] md:min-h-screen flex flex-col items-center justify-center p-8 lg:p-16 overflow-hidden border-b md:border-b-0 md:border-r border-neutral-200/50 dark:border-white/5 bg-neutral-100 dark:bg-[#0a0a0a] text-neutral-900 dark:text-white transition-colors duration-300 z-0">
        
        {/* Dynamic Abstract Background Orb */}
        <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
          <motion.div 
            animate={{ 
              x: tilt.x * 2, 
              y: tilt.y * 2,
              scale: [1, 1.05, 1],
            }}
            transition={{
              scale: { duration: 10, repeat: Infinity, ease: "easeInOut" },
              x: { type: "spring", damping: 30, stiffness: 50 },
              y: { type: "spring", damping: 30, stiffness: 50 }
            }}
            className="relative w-full h-full max-w-2xl max-h-2xl opacity-30 dark:opacity-60 mix-blend-normal"
          >
            <AnimatePresence mode="wait">
              {role === 'master' ? (
                <motion.div
                  key="master-orb"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 blur-[100px] md:blur-[140px]"
                />
              ) : (
                <motion.div
                  key="client-orb"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 1 }}
                  className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-500 to-fuchsia-400 blur-[100px] md:blur-[140px]"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Premium Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] z-0 pointer-events-none" />

        {/* Branding Content */}
        <div className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left w-full max-w-lg">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 transform hover:scale-105 transition-transform duration-500 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <Logo className="text-6xl md:text-7xl lg:text-8xl drop-shadow-2xl" />
          </motion.div>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-4"
            >
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tighter text-neutral-900 dark:text-white drop-shadow-lg">
                {role === 'master' ? t('loginMasterTitle') : t('loginClientTitle')}
              </h1>
              <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-300 font-light">
                {role === 'master' 
                  ? t('loginMasterDesc')
                  : t('loginClientDesc')}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Form */}
      <div className="relative w-full md:w-1/2 flex flex-col items-center justify-center p-4 pt-20 pb-28 sm:pt-8 sm:pb-8 sm:p-8 lg:p-16 z-10 overflow-y-auto min-h-screen md:min-h-0">
        
        {/* Top bar with Language and Theme Switcher */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50 flex gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2.5 bg-neutral-900/5 dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shadow-sm"
            title="Переключить тему"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-900/5 dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all shadow-sm"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase text-sm font-semibold tracking-wider">{language === 'cs' ? 'cz' : language}</span>
          </button>
        </div>

        <div className="w-full max-w-md space-y-8 animate-fade-in-up mt-12 md:mt-0">
          
          {/* Premium Role Toggle - Only shown on Registration */}
          <AnimatePresence>
            {isSignUp && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative flex p-1.5 bg-neutral-200/50 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full border border-neutral-300/50 dark:border-neutral-800/60 shadow-inner overflow-hidden mb-8"
              >
            <motion.div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full shadow-lg ${role === 'master' ? 'bg-gradient-to-r from-orange-600 to-amber-500' : 'bg-gradient-to-r from-indigo-600 to-purple-500'}`}
              animate={{
                left: role === 'master' ? '6px' : 'calc(50%)',
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
            
            <button
              type="button"
              onClick={() => {
                setRole('master');
              }}
              className={`relative z-10 flex-1 py-3 text-sm font-bold tracking-wide transition-colors duration-300 flex items-center justify-center gap-2 ${role === 'master' ? 'text-white' : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
            >
              🔥 Мастер
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('client');
              }}
              className={`relative z-10 flex-1 py-3 text-sm font-bold tracking-wide transition-colors duration-300 flex items-center justify-center gap-2 ${role === 'client' ? 'text-white' : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300'}`}
            >
              ✨ Клиент
            </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glassmorphism Form Container */}
          <div className="bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-neutral-200/50 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden">
            
            {/* Mode Switcher (Login / Register) */}
            <div className="flex border-b border-neutral-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all ${!isSignUp ? `text-neutral-900 dark:text-white bg-neutral-900/5 dark:bg-white/5 border-b-2 ${role === 'master' ? 'border-orange-500' : 'border-indigo-500'}` : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-900/5 dark:hover:bg-white/5'}`}
              >
                {t('loginTab')}
              </button>
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all ${isSignUp ? `text-neutral-900 dark:text-white bg-neutral-900/5 dark:bg-white/5 border-b-2 ${role === 'master' ? 'border-orange-500' : 'border-indigo-500'}` : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-900/5 dark:hover:bg-white/5'}`}
              >
                {t('registerTab')}
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <AnimatePresence mode="popLayout">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 flex items-center gap-3 overflow-hidden"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-5">
                  <motion.div layout>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-all duration-300 ${role === 'master' ? 'group-focus-within:text-orange-400' : 'group-focus-within:text-indigo-400'}`} />
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all backdrop-blur-md shadow-inner ${role === 'master' ? 'focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10' : 'focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-indigo-950/10'}`}
                        placeholder="E-mail"
                      />
                    </div>
                  </motion.div>

                  <motion.div layout>
                    <div className="relative group">
                      <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-all duration-300 ${role === 'master' ? 'group-focus-within:text-orange-400' : 'group-focus-within:text-indigo-400'}`} />
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all backdrop-blur-md shadow-inner ${role === 'master' ? 'focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10' : 'focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-indigo-950/10'}`}
                        placeholder={t('passwordAuth')}
                      />
                    </div>
                  </motion.div>
                  
                  <AnimatePresence mode="popLayout">
                    {isSignUp && role === 'master' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5 overflow-hidden"
                      >
                        <div className="relative group pt-1">
                          <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-colors group-focus-within:text-orange-400" />
                          <input
                            id="portfolioUrl"
                            type="url"
                            required={isSignUp && role === 'master'}
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                            className="block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10 transition-all backdrop-blur-md shadow-inner"
                            placeholder="Instagram / Portfolio URL"
                          />
                        </div>

                        <div className="relative group">
                          <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-colors group-focus-within:text-orange-400" />
                          <input
                            id="referralCode"
                            type="text"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                            className="block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10 transition-all backdrop-blur-md shadow-inner"
                            placeholder="Referral Code (Optional)"
                          />
                        </div>

                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-colors group-focus-within:text-orange-400 z-10 pointer-events-none" />
                          <select
                            required={isSignUp}
                            value={selectedCountry}
                            onChange={(e) => setSelectedCountry(e.target.value)}
                            className="block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10 transition-all backdrop-blur-md appearance-none shadow-inner cursor-pointer"
                          >
                            <option value="" disabled className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">{t('selectCountry')}</option>
                            {countries.map(c => (
                              <option key={c.id} value={c.id} className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">{c.name_ru}</option>
                            ))}
                          </select>
                        </div>

                        <AnimatePresence>
                          {cities.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="relative group overflow-hidden"
                            >
                              <div 
                                className="w-full flex items-center min-h-[56px] pl-12 pr-4 py-3 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl cursor-pointer backdrop-blur-md shadow-inner hover:border-orange-500/50 transition-colors"
                                onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                              >
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-colors group-focus-within:text-orange-400" />
                                <div className="flex-1 flex flex-wrap gap-2">
                                  {selectedCities.length === 0 ? (
                                    <span className="text-neutral-500">{t('selectCity')}</span>
                                  ) : (
                                    selectedCities.map(cityId => {
                                      const city = cities.find(c => c.id === cityId)
                                      return city ? (
                                        <span key={city.id} className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 bg-orange-500/20 text-orange-600 dark:text-orange-300 border border-orange-500/30">
                                          {city.name_ru}
                                          <button 
                                            type="button" 
                                            className="hover:text-neutral-950 dark:hover:text-white rounded-full transition-colors hover:bg-orange-500/50 p-0.5"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedCities(prev => prev.filter(id => id !== city.id))
                                            }}
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ) : null
                                    })
                                  )}
                                </div>
                              </div>

                              <AnimatePresence>
                                {isCityDropdownOpen && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-2"
                                  >
                                    {cities.map(c => (
                                      <label key={c.id} className="flex items-center gap-3 px-3 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition-colors">
                                        <div className="relative flex items-center justify-center w-5 h-5">
                                          <input 
                                            type="checkbox" 
                                            className="peer appearance-none w-5 h-5 border-2 border-neutral-300 dark:border-neutral-700 rounded-md checked:bg-orange-500 checked:border-orange-500 focus:ring-0 focus:ring-offset-0 bg-white dark:bg-neutral-950 transition-all cursor-pointer"
                                            checked={selectedCities.includes(c.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedCities(prev => [...prev, c.id])
                                              } else {
                                                setSelectedCities(prev => prev.filter(id => id !== c.id))
                                              }
                                            }}
                                          />
                                          <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 5L5 9L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </div>
                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{c.name_ru}</span>
                                      </label>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-3 py-4 px-6 text-white text-lg font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    role === 'master' 
                      ? 'bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 shadow-[0_10px_30px_rgba(234,88,12,0.3)] hover:shadow-[0_10px_40px_rgba(234,88,12,0.5)] border border-orange-500/50' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_10px_40px_rgba(99,102,241,0.5)] border border-indigo-500/50'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? t('createAccount') : t('signIn')}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs font-medium text-neutral-500 px-4 leading-relaxed">
            {t('termsAgreement')}
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-neutral-600">
            <a href="/terms" className="hover:text-neutral-950 dark:hover:text-white transition-colors uppercase tracking-wider">{t('termsOfService')}</a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:text-neutral-950 dark:hover:text-white transition-colors uppercase tracking-wider">{t('privacyPolicy')}</a>
            <span>&middot;</span>
            <a href="/refunds" className="hover:text-neutral-950 dark:hover:text-white transition-colors uppercase tracking-wider">{t('refundPolicy')}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 dark:bg-[#050505]" />}>
      <LoginContent />
    </Suspense>
  )
}
