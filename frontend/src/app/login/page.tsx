'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, ArrowRight, Link as LinkIcon, Tag, MapPin, Globe } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTranslation, Language } from '@/lib/i18n'
import { Logo } from '@/components/Logo'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [role, setRole] = useState<'master' | 'client'>('master')
  const [error, setError] = useState('')
  const [language, setLanguage] = useState<string>('cs')

  useEffect(() => {
    // Read from URL if available
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      const registerParam = searchParams.get('register')
      if (registerParam === 'client') {
        setIsSignUp(true)
        setRole('client')
      } else if (registerParam === 'master') {
        setIsSignUp(true)
        setRole('master')
      }
    }

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
  }, [])

  const toggleLanguage = () => {
    const langs = ['cs', 'en', 'ru']
    const currentIndex = langs.indexOf(language)
    const newLang = langs[(currentIndex + 1) % langs.length] || 'cs'
    setLanguage(newLang)
    localStorage.setItem('language', newLang)
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
          window.location.href = '/dashboard'
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

          window.location.href = '/dashboard'
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-x-hidden overflow-y-auto transition-colors duration-500">
      
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span className="uppercase text-sm font-semibold">{language === 'cs' ? 'cz' : language}</span>
        </button>
      </div>

      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-2xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000 pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 relative z-10 animate-fade-in-up">
        {/* Header/Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-4 transform hover:scale-105 transition-transform duration-300">
            <Logo className="text-5xl" />
          </div>
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${role === 'master' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50'}`}>
              {role === 'master' ? '🔥 Аккаунт Мастера' : '✨ Аккаунт Клиента'}
            </div>
            <button 
              onClick={() => setRole(r => r === 'master' ? 'client' : 'master')}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline underline-offset-2 transition-colors"
            >
              (сменить)
            </button>
          </div>
        </div>

        {/* Glassmorphism Form Container */}
        <div className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-xl border border-white/20 dark:border-neutral-800/50 shadow-2xl rounded-3xl">
          {/* Tabs */}
          <div className="flex border-b border-neutral-200/50 dark:border-neutral-800/50">
            <button
              type="button"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${!isSignUp ? 'bg-white/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
            >
              {t('loginTab')}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${isSignUp ? 'bg-white/50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'}`}
            >
              {t('registerTab')}
            </button>
          </div>

          <div className="p-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('email')}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('passwordAuth')}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              {isSignUp && role === 'master' && (
                <>
                  <div className="animate-fade-in-up">
                    <label htmlFor="portfolioUrl" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      {t('portfolioUrl')}
                    </label>
                    <div className="relative group">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                      <input
                        id="portfolioUrl"
                        type="url"
                        required={isSignUp && role === 'master'}
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                  </div>

                  <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <label htmlFor="referralCode" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      {t('referralCode')}
                    </label>
                    <div className="relative group">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                      <input
                        id="referralCode"
                        type="text"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm"
                        placeholder="OUT-12345"
                      />
                    </div>
                  </div>

                  <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                      {t('country')}
                    </label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                      <select
                        required={isSignUp}
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3.5 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent transition-all backdrop-blur-sm appearance-none"
                      >
                        <option value="" disabled>{t('selectCountry')}</option>
                        {countries.map(c => (
                          <option key={c.id} value={c.id}>{c.name_ru}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {cities.length > 0 && (
                    <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                      <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                        {t('city')}
                      </label>
                      <div className="relative group">
                        <div 
                          className="w-full flex items-center min-h-[50px] pl-12 pr-4 py-2 bg-white/50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-neutral-800 rounded-xl cursor-pointer backdrop-blur-sm"
                          onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                        >
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-900 dark:group-focus-within:text-white transition-colors" />
                          <div className="flex-1 flex flex-wrap gap-1">
                            {selectedCities.length === 0 ? (
                              <span className="text-neutral-400">{t('selectCity')}</span>
                            ) : (
                              selectedCities.map(cityId => {
                                const city = cities.find(c => c.id === cityId)
                                return city ? (
                                  <span key={city.id} className="text-xs bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 px-2 py-1 rounded-md flex items-center gap-1">
                                    {city.name_ru}
                                    <button 
                                      type="button" 
                                      className="hover:text-red-400"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedCities(prev => prev.filter(id => id !== city.id))
                                      }}
                                    >
                                      &times;
                                    </button>
                                  </span>
                                ) : null
                              })
                            )}
                          </div>
                        </div>

                        {isCityDropdownOpen && (
                          <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl">
                            {cities.map(c => (
                              <label key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer border-b border-neutral-100 dark:border-neutral-800/50 last:border-0">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:checked:bg-white"
                                  checked={selectedCities.includes(c.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedCities(prev => [...prev, c.id])
                                    } else {
                                      setSelectedCities(prev => prev.filter(id => id !== c.id))
                                    }
                                  }}
                                />
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{c.name_ru}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? t('createAccount') : t('signIn')}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          </div>
        </div>

        <p className="text-center text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-4">
          {t('termsAgreement')}
        </p>

        <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-500">
          <a href="/terms" className="hover:text-neutral-900 dark:hover:text-white transition-colors">{t('termsOfService')}</a>
          <span>&middot;</span>
          <a href="/privacy" className="hover:text-neutral-900 dark:hover:text-white transition-colors">{t('privacyPolicy')}</a>
          <span>&middot;</span>
          <a href="/refunds" className="hover:text-neutral-900 dark:hover:text-white transition-colors">{t('refundPolicy')}</a>
        </div>
      </div>
    </div>
  )
}
