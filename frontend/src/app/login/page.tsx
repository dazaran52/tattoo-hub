'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Loader2, ArrowRight, Link as LinkIcon, Tag, MapPin, Globe, X, Sun, Moon, KeyRound, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTranslation, Language } from '@/lib/i18n'
import { Logo } from '@/components/Logo'

type AuthMode = 'login' | 'signup' | 'verify_email' | 'forgot_password' | 'reset_password' | 'magic_link'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [role, setRole] = useState<'master' | 'client'>('master')
  const [referredBy, setReferredBy] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [language, setLanguage] = useState<string>('cs')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
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
    const registerParam = searchParams.get('register')
    const roleParam = searchParams.get('role')

    if (roleParam === 'client' || roleParam === 'master') {
      setRole(roleParam)
    }

    if (registerParam === 'client') {
      setAuthMode('signup')
      setRole('client')
    } else if (registerParam === 'master') {
      setAuthMode('signup')
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
    const langs = ['cs', 'en', 'ru', 'uk']
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

  const handleAuthSuccess = (session: any, isSpecialAdmin: boolean = false) => {
    if (session) {
      const token = session.access_token
      const maxAge = 60 * 60 * 24 * 7 // 7 days
      document.cookie = `sb-access-token=${token};path=/;max-age=${maxAge};SameSite=Lax${window.location.protocol === 'https:' ? ';Secure' : ''}`
      window.location.href = isSpecialAdmin ? '/admin' : '/dashboard'
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard&role=${role}`
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Ошибка входа через Google / Google login error')
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccessMsg('')
    
    try {
      if (authMode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: role,
              username: email.split('@')[0],
              referred_by: referredBy || undefined
            }
          }
        })
        if (signUpError) throw signUpError
        if (data.session) {
          handleAuthSuccess(data.session)
        } else {
          setAuthMode('verify_email')
        }
      } 
      else if (authMode === 'verify_email') {
        const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' })
        if (error) throw error
        if (data.session) handleAuthSuccess(data.session)
        else throw new Error('No session returned')
      }
      else if (authMode === 'login') {
        let loginEmail = email
        let isSpecialAdmin = false
        
        if (email.toLowerCase() === 'admin') {
          loginEmail = 'admin@tattoohub.cz'
          isSpecialAdmin = true
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
        if (signInError) throw signInError
        if (data.session) handleAuthSuccess(data.session, isSpecialAdmin)
        else throw new Error('No session returned')
      }
      else if (authMode === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/update-password`
        })
        if (error) throw error
        setSuccessMsg(t('codeSent')) // Text can be repurposed for 'link sent'
      }
      else if (authMode === 'magic_link') {
        if (!successMsg) {
          const { error } = await supabase.auth.signInWithOtp({ 
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
            }
          })
          if (error) throw error
          setSuccessMsg(t('codeSent')) // Text can be repurposed for 'link sent'
        }
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const isSignUp = authMode === 'signup'
  const needsCode = authMode === 'verify_email'
  const isForgotPassword = authMode === 'forgot_password'
  
  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row overflow-hidden relative bg-neutral-50 dark:bg-[#050505] transition-colors duration-300">
      
      {/* LEFT SIDE: Visuals & Branding */}
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
            
            {/* Mode Switcher */}
            <div className="flex border-b border-neutral-200/50 dark:border-white/5">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg('') }}
                className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all ${!isSignUp && !isForgotPassword && authMode !== 'magic_link' ? `text-neutral-900 dark:text-white bg-neutral-900/5 dark:bg-white/5 border-b-2 ${role === 'master' ? 'border-orange-500' : 'border-indigo-500'}` : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-900/5 dark:hover:bg-white/5'}`}
              >
                {t('loginTab')}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setError(''); setSuccessMsg('') }}
                className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all ${isSignUp ? `text-neutral-900 dark:text-white bg-neutral-900/5 dark:bg-white/5 border-b-2 ${role === 'master' ? 'border-orange-500' : 'border-indigo-500'}` : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-900/5 dark:hover:bg-white/5'}`}
              >
                {t('registerTab')}
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
                
                {authMode === 'verify_email' && (
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">{t('verifyEmailTitle')}</h2>
                    <p className="text-neutral-500 text-sm mt-2">{t('verifyEmailDesc')}</p>
                  </div>
                )}
                {isForgotPassword && (
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold dark:text-white">{t('forgotPassword')}</h2>
                    <p className="text-neutral-500 text-sm mt-2">{t('verifyEmailDesc')}</p>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 flex items-center gap-3 overflow-hidden mb-4"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                      {error}
                    </motion.div>
                  )}
                  {successMsg && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-sm text-green-500 flex items-center gap-3 overflow-hidden mb-4"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                      {successMsg}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-5">
                  <motion.div layout>
                    <div className="relative group">
                      <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-all duration-300 ${role === 'master' ? 'group-focus-within:text-orange-400' : 'group-focus-within:text-indigo-400'}`} />
                      <input
                        id="email"
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={needsCode}
                        className={`block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all backdrop-blur-md shadow-inner disabled:opacity-50 ${role === 'master' ? 'focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10' : 'focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-indigo-950/10'}`}
                        placeholder="E-mail"
                      />
                    </div>
                  </motion.div>

                  {!needsCode && authMode !== 'forgot_password' && authMode !== 'magic_link' && (
                    <motion.div layout>
                      <div className="relative group">
                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-all duration-300 ${role === 'master' ? 'group-focus-within:text-orange-400' : 'group-focus-within:text-indigo-400'}`} />
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`block w-full pl-12 pr-12 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all backdrop-blur-md shadow-inner ${role === 'master' ? 'focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10' : 'focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-indigo-950/10'}`}
                          placeholder={t('passwordAuth')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {needsCode && (
                    <motion.div layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <div className="relative group">
                        <KeyRound className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-all duration-300 ${role === 'master' ? 'group-focus-within:text-orange-400' : 'group-focus-within:text-indigo-400'}`} />
                        <input
                          id="code"
                          type="text"
                          required
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\s+/g, ''))}
                          className={`block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all backdrop-blur-md shadow-inner tracking-widest font-mono text-center text-lg ${role === 'master' ? 'focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10' : 'focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-indigo-950/10'}`}
                          placeholder="------"
                          maxLength={6}
                        />
                      </div>
                    </motion.div>
                  )}

                  {isSignUp && role === 'master' && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                    >
                      <div className="relative group">
                        <Tag className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 transition-all duration-300 ${role === 'master' ? 'group-focus-within:text-orange-400' : 'group-focus-within:text-indigo-400'}`} />
                        <input
                          id="referredBy"
                          type="text"
                          value={referredBy}
                          onChange={(e) => setReferredBy(e.target.value)}
                          className={`block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all backdrop-blur-md shadow-inner ${role === 'master' ? 'focus:border-orange-500 focus:ring-orange-500/20 focus:bg-orange-950/10' : 'focus:border-indigo-500 focus:ring-indigo-500/20 focus:bg-indigo-950/10'}`}
                          placeholder={t('referralCode')}
                        />
                      </div>
                    </motion.div>
                  )}

                  <AnimatePresence>
                    {isSignUp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2"
                      >
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                            <input 
                              type="checkbox" 
                              required 
                              className="peer sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 border-neutral-300 dark:border-neutral-600 flex items-center justify-center transition-colors peer-checked:bg-neutral-900 dark:peer-checked:bg-white peer-checked:border-neutral-900 dark:peer-checked:border-white ${role === 'master' ? 'group-hover:border-orange-500' : 'group-hover:border-indigo-500'}`}>
                              <svg className="w-3 h-3 text-white dark:text-black opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-neutral-500 leading-relaxed">
                            {language === 'cs' && <>Souhlasím s <a href="/terms" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Terms of Service</a> a <a href="/privacy" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Privacy Policy</a>.</>}
                            {language === 'ru' && <>Я соглашаюсь с <a href="/terms" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Terms of Service</a> и <a href="/privacy" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Privacy Policy</a>.</>}
                            {language === 'en' && <>I agree to the <a href="/terms" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Privacy Policy</a>.</>}
                            {language === 'uk' && <>Я погоджуюсь з <a href="/terms" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Terms of Service</a> та <a href="/privacy" target="_blank" className="text-neutral-900 dark:text-white hover:underline">Privacy Policy</a>.</>}
                          </span>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !!successMsg}
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
                      {authMode === 'signup' ? t('createAccount') : 
                       authMode === 'login' ? t('signIn') : 
                       (authMode === 'forgot_password' || (authMode === 'magic_link' && !successMsg)) ? t('nextBtn') : 
                       t('confirmBtn')}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>

              {(authMode === 'login' || authMode === 'signup') && (
                <div className="mt-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10"></div>
                    <span className="text-sm font-medium text-neutral-500">{t('or')}</span>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-white/10"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-white/60 dark:bg-neutral-900/60 border border-neutral-200 dark:border-white/10 hover:bg-white dark:hover:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm backdrop-blur-md"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    {t('continueWithGoogle')}
                  </button>
                </div>
              )}

              {authMode === 'login' && (
                <div className="mt-6 flex flex-col items-center gap-3 text-sm font-medium">
                  <button type="button" onClick={() => { setAuthMode('forgot_password'); setError(''); setSuccessMsg('') }} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">{t('forgotPassword')}</button>
                  <button type="button" onClick={() => { setAuthMode('magic_link'); setError(''); setSuccessMsg('') }} className={`transition-colors ${role === 'master' ? 'text-orange-500 hover:text-orange-600' : 'text-indigo-500 hover:text-indigo-600'}`}>{t('loginWithCode')}</button>
                </div>
              )}
              {authMode === 'magic_link' && (
                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={() => { setAuthMode('login'); setError(''); setSuccessMsg('') }} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm font-medium">{t('loginWithPassword')}</button>
                </div>
              )}
            </div>
          </div>

          {!isSignUp && authMode === 'login' && (
            <p className="text-center text-xs font-medium text-neutral-500 px-4 leading-relaxed">
              {t('termsAgreement')}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-xs font-semibold text-neutral-600 mt-8">
            <a href="/terms" className="hover:text-neutral-950 dark:hover:text-white transition-colors uppercase tracking-wider">Terms of Service</a>
            <span>&middot;</span>
            <a href="/privacy" className="hover:text-neutral-950 dark:hover:text-white transition-colors uppercase tracking-wider">Privacy Policy</a>
            <span>&middot;</span>
            <a href="/refunds" className="hover:text-neutral-950 dark:hover:text-white transition-colors uppercase tracking-wider">Refund Policy</a>
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
