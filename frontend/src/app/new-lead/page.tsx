'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles, Upload, Image as ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function NewLeadPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [description, setDescription] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [priority, setPriority] = useState<'cheap' | 'fast' | 'quality'>('quality')

  const canContinue = description.trim().length > 0 && selectedSize !== ''

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white flex flex-col relative overflow-x-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.15)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-0 opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="p-6 relative z-10 flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-medium tracking-widest uppercase text-neutral-400">
          Быстрая заявка
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Опиши свою идею</h1>
            <p className="text-neutral-400 text-lg">
              Заполни короткую форму, и лучшие мастера сами предложат тебе свои услуги.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Что будем бить?</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                    placeholder="Опиши идею, стиль, место нанесения..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Примерный размер</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Мини', 'Средняя', 'Большая'].map(size => (
                      <button 
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`py-3 px-4 rounded-xl border transition-all text-sm font-medium text-center ${selectedSize === size ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Что в приоритете?</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'cheap', name: 'Дешево', emoji: '💸' },
                      { id: 'fast', name: 'Быстро', emoji: '⚡' },
                      { id: 'quality', name: 'Качественно', emoji: '💎' }
                    ].map(p => (
                      <button 
                        key={p.id}
                        type="button"
                        onClick={() => setPriority(p.id as any)}
                        className={`py-3 px-2 rounded-xl border transition-all text-sm font-medium text-center flex flex-col items-center justify-center gap-1 ${priority === p.id ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white'}`}
                      >
                        <span className="text-base">{p.emoji}</span>
                        <span className="text-xs">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Референсы (по желанию)</label>
                  <button className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-500/50 hover:bg-white/5 transition-all text-neutral-500 hover:text-indigo-400">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-sm font-medium">Загрузить фото или скетч</span>
                  </button>
                </div>

                <button 
                  onClick={() => canContinue && setStep(2)}
                  disabled={!canContinue}
                  className={`w-full py-4 rounded-full font-bold text-lg transition-all flex items-center justify-center gap-2 mt-8 ${canContinue ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 shadow-lg shadow-indigo-500/25' : 'bg-white/5 text-neutral-500 cursor-not-allowed'}`}
                >
                  Продолжить <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6 text-center py-8"
              >
                <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Отличная идея!</h2>
                <p className="text-neutral-400 mb-8">
                  Чтобы опубликовать заявку и начать получать отклики от мастеров, необходимо войти в систему.
                </p>

                <div className="space-y-4">
                  <button 
                    onClick={() => {
                      localStorage.setItem('pending_lead', JSON.stringify({ description, size: selectedSize, priority }))
                      router.push('/login?register=client')
                    }}
                    className="w-full py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform"
                  >
                    Зарегистрироваться
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('pending_lead', JSON.stringify({ description, size: selectedSize, priority }))
                      router.push('/login?role=client')
                    }}
                    className="w-full py-4 rounded-full bg-white/5 text-white font-bold text-lg hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Уже есть аккаунт
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
