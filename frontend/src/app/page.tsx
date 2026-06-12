'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { LeadForm } from '@/components/LeadForm'
import { Logo } from '@/components/Logo'
import { Sparkles, X, UserCircle2, Brush, HelpCircle, LogIn, UserPlus } from 'lucide-react'
import { OnboardingCarousel } from '@/components/OnboardingCarousel'

export default function HomePage() {
  const router = useRouter()
  const [activeSide, setActiveSide] = useState<'none' | 'client'>('none')
  const [hoveredSide, setHoveredSide] = useState<'none' | 'master' | 'client'>('none')
  const [forceShowOnboarding, setForceShowOnboarding] = useState(false)

  return (
    <div className="dark min-h-[100dvh] bg-[#050505] text-white flex flex-col md:flex-row relative overflow-hidden">
      
      <OnboardingCarousel 
        forceShow={forceShowOnboarding}
        onComplete={() => setForceShowOnboarding(false)} 
      />

      {/* Removed "Кто ты?" for cleaner look */}

      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 z-50 pointer-events-auto">
        <Logo />
      </div>

      {/* Replay Onboarding Button */}
      <button 
        onClick={() => setForceShowOnboarding(true)}
        className="absolute top-6 right-6 z-50 text-neutral-500 hover:text-white transition-colors"
        title="Как это работает?"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Master Side (Left / Top) */}
      <motion.div 
        className="relative flex-1 overflow-hidden flex flex-col items-center justify-center p-8 group"
        onHoverStart={() => setHoveredSide('master')}
        onHoverEnd={() => setHoveredSide('none')}
        animate={{
          flex: hoveredSide === 'master' ? 1.2 : hoveredSide === 'client' ? 0.8 : 1
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        <div className="absolute inset-0 bg-[#0a0a0a] z-0" />
        
        {/* Orange glow for Master */}
        <div className="absolute inset-0 opacity-20 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none">
          <div className="absolute top-[30%] left-[30%] w-[50%] h-[50%] rounded-full bg-orange-600/20 blur-[120px]" />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-50" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-orange-950 border border-orange-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-orange-900/50">
            <Brush className="w-10 h-10 text-orange-400 group-hover:text-orange-300 transition-colors" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-neutral-300 group-hover:text-white transition-colors">Я тату-мастер</h2>
          <p className="text-neutral-500 max-w-sm group-hover:text-neutral-400 transition-colors mb-8">
            Получай горячие заявки от клиентов без затрат на рекламу.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 transition-transform duration-300">
            <button 
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-medium transition-colors border border-neutral-800"
            >
              <LogIn className="w-4 h-4" /> Вход
            </button>
            <button 
              onClick={() => router.push('/login?register=master')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Регистрация мастера
            </button>
          </div>
        </div>
      </motion.div>

      {/* Client Side (Right / Bottom) */}
      <motion.div 
        className="relative flex-1 overflow-hidden flex flex-col items-center justify-center p-8 group"
        onHoverStart={() => setHoveredSide('client')}
        onHoverEnd={() => setHoveredSide('none')}
        animate={{
          flex: hoveredSide === 'client' ? 1.2 : hoveredSide === 'master' ? 0.8 : 1
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        <div className="absolute inset-0 bg-neutral-950 z-0" />
        {/* Vibrant gradients */}
        <div className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-indigo-600/30 blur-[100px]" />
          <div className="absolute bottom-[20%] right-[20%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-2xl shadow-indigo-900/50">
            <UserCircle2 className="w-10 h-10 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">Хочу татуировку!</h2>
          <p className="text-indigo-200/60 max-w-sm group-hover:text-indigo-200/90 transition-colors mb-8">
            Опиши идею один раз, и лучшие мастера города предложат свои эскизы.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 transition-transform duration-300">
            <button 
              onClick={() => router.push('/login?register=client')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-medium transition-colors border border-indigo-900"
            >
              <UserCircle2 className="w-4 h-4" /> Аккаунт клиента
            </button>
            <button 
              onClick={() => setActiveSide('client')}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold transition-all shadow-lg shadow-indigo-500/25"
            >
              <Sparkles className="w-4 h-4" /> Быстрая заявка
            </button>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 z-10 text-center pointer-events-none">
        <p className="text-neutral-600/50 text-xs">© 2026 Tattoo HUB. All rights reserved.</p>
      </div>

      {/* Client Modal Overlay */}
      <AnimatePresence>
        {activeSide === 'client' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl my-auto"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSide('none');
                }}
                className="absolute -top-12 right-0 text-white/50 hover:text-white flex items-center gap-2 transition-colors"
              >
                Закрыть <X className="w-6 h-6" />
              </button>
              
              <div className="relative bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-1">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 blur-[80px] -z-10 pointer-events-none" />
                <LeadForm />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
