'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { Sparkles, UserCircle2, Brush, LogIn, UserPlus, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { LanguageSelector } from '@/i18n/LanguageSelector'

type Role = 'none' | 'master' | 'client'

export default function HomePage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  
  // step 0: Welcome, step 1: Role Selection, step 2: Guide & Actions
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<Role>('none')
  const [guideSlide, setGuideSlide] = useState(0)
  const [hoveredSide, setHoveredSide] = useState<Role>('none')
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  // Prevent hydration errors by not rendering until client is ready
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    
    // Add gyroscope listener for mobile parallax
    const handleTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null && e.beta !== null) {
        // limit the tilt to reasonable degrees (-30 to 30)
        const x = Math.min(Math.max(e.gamma, -30), 30)
        const y = Math.min(Math.max(e.beta - 45, -30), 30) // assume user holds phone at ~45 deg
        setTilt({ x: x, y: y })
      }
    }

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent && !window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('deviceorientation', handleTilt)
    }
    return () => window.removeEventListener('deviceorientation', handleTilt)
  }, [])

  if (!mounted) return null

  const masterSlides = [
    { title: t('guide.master_slide1_title'), desc: t('guide.master_slide1_desc'), icon: <Sparkles className="w-16 h-16 text-orange-400" /> },
    { title: t('guide.master_slide2_title'), desc: t('guide.master_slide2_desc'), icon: <CheckCircle2 className="w-16 h-16 text-amber-400" /> },
    { title: t('guide.shield_title'), desc: t('guide.shield_desc'), icon: <ShieldCheck className="w-16 h-16 text-yellow-400" /> }
  ]

  const clientSlides = [
    { title: t('guide.client_slide1_title'), desc: t('guide.client_slide1_desc'), icon: <CheckCircle2 className="w-16 h-16 text-indigo-400" /> },
    { title: t('guide.client_slide2_title'), desc: t('guide.client_slide2_desc'), icon: <ArrowRight className="w-16 h-16 text-purple-400" /> },
    { title: t('guide.shield_title'), desc: t('guide.client_shield_desc'), icon: <ShieldCheck className="w-16 h-16 text-yellow-400" /> }
  ]

  const currentSlides = role === 'master' ? masterSlides : clientSlides

  const handleNextGuide = () => {
    if (guideSlide < currentSlides.length - 1) {
      setGuideSlide(s => s + 1)
    } else {
      setGuideSlide(currentSlides.length) // this means guide is finished, show actions
    }
  }

  return (
    <div className="dark min-h-[100dvh] bg-[#050505] text-white flex flex-col md:flex-row relative overflow-hidden pb-safe">
      
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto"><Logo /></div>
        <div className="pointer-events-auto"><LanguageSelector /></div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              animate={{ x: tilt.x * 2, y: tilt.y * 2 }}
              transition={{ type: "tween", ease: "linear", duration: 0.1 }}
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,70,229,0.15)_0%,transparent_70%)] pointer-events-none scale-110" 
            />
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              {t('landing.welcome')}
            </h1>
            <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mb-12 leading-relaxed">
              {t('landing.description')}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onTap={() => setStep(1)}
              className="px-10 py-5 rounded-full bg-white text-black font-bold text-xl transition-shadow shadow-[0_0_40px_rgba(255,255,255,0.3)]"
            >
              {t('landing.start_btn')}
            </motion.button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col-reverse md:flex-row overflow-y-auto overflow-x-hidden"
          >
            {/* Center delimiter */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none hidden md:flex flex-col items-center gap-6">
              <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              <div className="px-5 py-2 rounded-full border border-white/5 bg-black/40 backdrop-blur-xl text-white/40 text-xs tracking-[0.2em] uppercase font-medium shadow-2xl">
                {t('landing.who_are_you')}
              </div>
              <div className="w-px h-24 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            </div>

            {/* Master Side */}
            <motion.div 
              className="relative flex-1 overflow-hidden flex flex-col items-center justify-center p-8 group cursor-pointer"
              onTap={() => { setRole('master'); setStep(2); }}
              onHoverStart={() => { if (window.matchMedia('(hover: hover)').matches) setHoveredSide('master') }}
              onHoverEnd={() => { if (window.matchMedia('(hover: hover)').matches) setHoveredSide('none') }}
              animate={{ flex: hoveredSide === 'master' ? 1.2 : hoveredSide === 'client' ? 0.8 : 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            >
              <div className="absolute inset-0 bg-[#0a0a0a] z-0" />
              <motion.div 
                animate={{ x: tilt.x * -1, y: tilt.y * -1 }}
                className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none scale-110"
              >
                <div className="absolute top-[20%] right-[20%] w-[60%] h-[60%] rounded-full bg-orange-600/30 blur-[100px]" />
                <div className="absolute bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-amber-600/30 blur-[100px]" />
              </motion.div>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-50 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-orange-950 border border-orange-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-orange-900/50">
                  <Brush className="w-12 h-12 text-orange-400 group-hover:text-orange-300 transition-colors" />
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-neutral-300 group-hover:text-white transition-colors">
                  {t('landing.master_title')}
                </h2>
                <p className="text-lg md:text-xl text-neutral-500 max-w-sm group-hover:text-neutral-300 transition-colors">
                  {t('landing.master_desc')}
                </p>
              </div>
            </motion.div>

            {/* Client Side */}
            <motion.div 
              className="relative flex-1 overflow-hidden flex flex-col items-center justify-center p-8 group cursor-pointer"
              onTap={() => { setRole('client'); setStep(2); }}
              onHoverStart={() => { if (window.matchMedia('(hover: hover)').matches) setHoveredSide('client') }}
              onHoverEnd={() => { if (window.matchMedia('(hover: hover)').matches) setHoveredSide('none') }}
              animate={{ flex: hoveredSide === 'client' ? 1.2 : hoveredSide === 'master' ? 0.8 : 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            >
              <div className="absolute inset-0 bg-neutral-950 z-0" />
              <motion.div 
                animate={{ x: tilt.x * -1.5, y: tilt.y * -1.5 }}
                className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none scale-110"
              >
                <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[100px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[100px]" />
              </motion.div>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-50 pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-indigo-900/50">
                  <UserCircle2 className="w-12 h-12 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-neutral-300 group-hover:text-white transition-colors">
                  {t('landing.client_title')}
                </h2>
                <p className="text-lg md:text-xl text-neutral-500 max-w-sm group-hover:text-neutral-300 transition-colors">
                  {t('landing.client_desc')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6"
          >
            {/* Dynamic Background */}
            <motion.div 
              animate={{ x: tilt.x * 1.5, y: tilt.y * 1.5 }}
              className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-50 pointer-events-none scale-[1.1]" 
            />
            <motion.div 
              animate={{ x: tilt.x * -2, y: tilt.y * -2 }}
              className="absolute inset-0 opacity-40 pointer-events-none scale-110"
            >
              {role === 'master' ? (
                 <div className="absolute top-[20%] right-[20%] w-[60%] h-[60%] rounded-full bg-orange-600/20 blur-[120px]" />
              ) : (
                 <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px]" />
              )}
            </motion.div>

            <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center pb-24 md:pb-0">
              
              {guideSlide < currentSlides.length ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={guideSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex flex-col items-center min-h-[300px] justify-center"
                  >
                    <div className="mb-8">{currentSlides[guideSlide].icon}</div>
                    <h2 className="text-3xl font-bold text-white mb-4">{currentSlides[guideSlide].title}</h2>
                    <p className="text-lg text-neutral-400 leading-relaxed">
                      {currentSlides[guideSlide].desc}
                    </p>
                    
                    <div className="mt-12 flex flex-col items-center gap-6 w-full">
                      <div className="flex gap-2">
                        {currentSlides.map((_, i) => (
                          <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === guideSlide ? (role === 'master' ? 'w-8 bg-orange-500' : 'w-8 bg-indigo-500') : 'w-2 bg-neutral-800'}`} />
                        ))}
                      </div>
                      <button
                        onClick={handleNextGuide}
                        className={`w-full py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform ${role === 'master' ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {guideSlide === currentSlides.length - 1 ? t('guide.understand') : t('guide.next')}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col w-full gap-4"
                >
                  <div className="mb-8">
                    {role === 'master' ? <Brush className="w-16 h-16 text-orange-400 mx-auto" /> : <UserCircle2 className="w-16 h-16 text-indigo-400 mx-auto" />}
                  </div>
                  
                  {role === 'client' && (
                    <button 
                      onClick={() => router.push('/new-lead')}
                      className="w-full flex items-center justify-center gap-2 px-6 py-5 md:py-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold text-lg transition-all shadow-lg shadow-indigo-500/25"
                    >
                      <Sparkles className="w-5 h-5" /> {t('landing.btn_apply')}
                    </button>
                  )}

                  {role === 'master' && (
                    <button 
                      onClick={() => router.push(`/login?register=master`)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-5 md:py-4 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg transition-all shadow-lg shadow-orange-600/25"
                    >
                      <UserPlus className="w-5 h-5" /> {t('landing.btn_register')}
                    </button>
                  )}

                  <div className="flex gap-3">
                    <button 
                      onClick={() => router.push(`/login?role=${role}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10"
                    >
                      <LogIn className="w-5 h-5" /> {t('landing.btn_login')}
                    </button>
                    
                    {role === 'client' && (
                      <button 
                        onClick={() => router.push(`/login?register=client`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium transition-colors border border-white/10"
                      >
                        <UserPlus className="w-5 h-5" /> {t('landing.btn_register')}
                      </button>
                    )}
                  </div>
                  <button onClick={() => {setStep(1); setGuideSlide(0)}} className="mt-6 text-sm text-neutral-500 hover:text-white transition-colors">
                    Назад к выбору роли
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

