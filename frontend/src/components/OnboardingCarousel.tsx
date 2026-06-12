'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, X } from 'lucide-react'

const slides = [
  {
    title: 'Tattoo HUB',
    description: 'Премиальная платформа для поиска тату-мастеров и горячих заявок.',
    icon: <Sparkles className="w-16 h-16 text-indigo-400" />
  },
  {
    title: 'Для мастеров',
    description: 'Более 500 мастеров уже находят здесь клиентов без затрат на рекламу.',
    icon: <CheckCircle2 className="w-16 h-16 text-green-400" />
  },
  {
    title: 'Для клиентов',
    description: 'Опиши идею один раз — получай предложения. Выбирай лучшего мастера.',
    icon: <ArrowRight className="w-16 h-16 text-pink-400" />
  },
  {
    title: 'Знак качества',
    description: 'Верифицированные мастера получают специальный значок доверия.',
    icon: <ShieldCheck className="w-16 h-16 text-amber-400" />
  }
]

export function OnboardingCarousel({ onComplete, forceShow = false }: { onComplete: () => void, forceShow?: boolean }) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const hasSeen = localStorage.getItem('has_seen_onboarding')
    if (!hasSeen || forceShow) {
      if (forceShow) setCurrentSlide(0) // Reset to first slide when explicitly shown
      setIsVisible(true)
    } else {
      onComplete()
    }
  }, [forceShow, onComplete])

  if (!isVisible) return null

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(s => s + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = () => {
    localStorage.setItem('has_seen_onboarding', 'true')
    setIsVisible(false)
    setTimeout(onComplete, 500) // allow exit animation
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6"
        >
          <button 
            onClick={handleComplete}
            className="absolute top-8 right-8 text-neutral-500 hover:text-white flex items-center gap-2 transition-colors"
          >
            Пропустить <X className="w-5 h-5" />
          </button>

          <div className="max-w-md w-full relative h-96 flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <div className="mb-8">{slides[currentSlide].icon}</div>
                <h2 className="text-3xl font-bold text-white mb-4">{slides[currentSlide].title}</h2>
                <p className="text-lg text-neutral-400 leading-relaxed">
                  {slides[currentSlide].description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-12 flex flex-col items-center gap-8 w-full max-w-sm">
            <div className="flex gap-2">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-indigo-500' : 'w-2 bg-neutral-800'}`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNext}
              className="w-full py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform"
            >
              {currentSlide === slides.length - 1 ? 'Начать!' : 'Далее'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
