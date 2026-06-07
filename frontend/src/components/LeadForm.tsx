'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ChevronRight, ChevronLeft, Check, AlertCircle, Sparkles, Image as ImageIcon, MapPin, Send } from 'lucide-react'

export function LeadForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    description: '',
    style: '',
    location: '',
    size: '',
    budget: '',
    city: '',
    name: '',
    contact: '', // email or phone
    images: [] as File[]
  })

  const nextStep = () => setStep(s => Math.min(s + 1, 4))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({ ...formData, images: [...formData.images, ...Array.from(e.target.files)] })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const payload = {
        description: formData.description,
        style: formData.style || null,
        location: formData.location || null,
        size: formData.size || null,
        budget: formData.budget || null,
        city: formData.city || null,
        name: formData.name || null,
        contact: formData.contact,
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/leads/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error('Ошибка при отправке заявки')
      }
      
      setIsSuccess(true)
    } catch (error) {
      console.error(error)
      alert('Произошла ошибка при отправке. Пожалуйста, попробуйте еще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepIcons = [
    <Sparkles key={1} className="w-5 h-5" />,
    <MapPin key={2} className="w-5 h-5" />,
    <ImageIcon key={3} className="w-5 h-5" />,
    <Send key={4} className="w-5 h-5" />
  ]

  const stepTitles = [
    "Опиши свою идею",
    "Детали татуировки",
    "Бюджет и референсы",
    "Твои контакты"
  ]

  const inputClasses = "w-full bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-4 text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 focus:bg-white/60 dark:focus:bg-neutral-800/60 transition-all duration-300 shadow-sm"
  const labelClasses = "block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 ml-1"

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
        className="relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2rem] p-8 md:p-12 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 pointer-events-none" />
        
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, bounce: 0.5 }}
          className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30"
        >
          <motion.div
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Check className="w-12 h-12 text-white stroke-[3]" />
          </motion.div>
        </motion.div>
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400 mb-4"
        >
          Заявка отправлена!
        </motion.h3>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-neutral-600 dark:text-neutral-300 text-lg max-w-md mx-auto mb-10 leading-relaxed"
        >
          Лучшие мастера твоего города скоро увидят твою идею и свяжутся с тобой, чтобы обсудить детали и предложить свои эскизы.
        </motion.p>
        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => { setStep(1); setIsSuccess(false); setFormData({description: '', style: '', location: '', size: '', budget: '', city: '', name: '', contact: '', images: []}) }}
          className="group relative inline-flex items-center justify-center bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-neutral-900/20 dark:hover:shadow-white/20"
        >
          <span className="relative z-10">Новая заявка</span>
          <div className="absolute inset-0 bg-white/20 dark:bg-black/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </motion.div>
    )
  }

  return (
    <div className="relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-3xl border border-white/60 dark:border-white/10 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden">
      
      {/* Background ambient glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/20 blur-[100px] rounded-full" />
      </div>

      {/* Progress Bar Container */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-neutral-200/50 dark:bg-neutral-800/50">
        <motion.div 
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 relative"
          initial={{ width: '25%' }}
          animate={{ width: `${(step / 4) * 100}%` }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
        >
          <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/30 blur-[2px]" />
        </motion.div>
      </div>

      <div className="p-8 md:p-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              key={step}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/30"
            >
              {stepIcons[step - 1]}
            </motion.div>
            <h3 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400">
              {stepTitles[step - 1]}
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 overflow-hidden relative">
                <motion.div 
                  initial={false}
                  animate={{ 
                    width: step >= i ? '100%' : '0%',
                    opacity: step >= i ? 1 : 0 
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500"
                />
              </div>
            ))}
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 mt-3 text-sm font-medium">Шаг {step} из 4</p>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>Что будем бить?</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Например: Хочу черно-белого дракона, обвивающего меч..."
                    className={`${inputClasses} min-h-[140px] resize-none`}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Стиль (опционально)</label>
                  <div className="relative">
                    <select 
                      value={formData.style}
                      onChange={e => setFormData({...formData, style: e.target.value})}
                      className={`${inputClasses} appearance-none cursor-pointer`}
                    >
                      <option value="">Не знаю / Жду предложений</option>
                      <option value="realism">Реализм</option>
                      <option value="traditional">Олдскул (Traditional)</option>
                      <option value="minimalism">Минимализм / Лайнворк</option>
                      <option value="japanese">Япония (Irezumi)</option>
                      <option value="blackwork">Блэкворк</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight className="w-5 h-5 text-neutral-400 rotate-90" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>Место нанесения</label>
                  <input 
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="Например: Предплечье, спина, бедро..."
                    className={inputClasses}
                    required
                  />
                </div>
                <div>
                  <label className={labelClasses}>Примерный размер</label>
                  <input 
                    type="text"
                    value={formData.size}
                    onChange={e => setFormData({...formData, size: e.target.value})}
                    placeholder="Например: 15х10 см, или просто 'большая'"
                    className={inputClasses}
                    required
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>Ваш бюджет (опционально)</label>
                  <input 
                    type="text"
                    value={formData.budget}
                    onChange={e => setFormData({...formData, budget: e.target.value})}
                    placeholder="Например: До 5000 Kč"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Примеры и референсы</label>
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="border-2 border-dashed border-violet-300/50 dark:border-violet-700/50 rounded-2xl p-8 text-center bg-white/20 dark:bg-neutral-900/20 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors relative cursor-pointer group"
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
                    <p className="text-neutral-700 dark:text-neutral-300 font-medium">Нажмите или перетащите фото сюда</p>
                    <p className="text-neutral-400 text-sm mt-1">PNG, JPG до 5MB</p>
                    {formData.images.length > 0 && (
                      <div className="mt-6 flex flex-wrap gap-2 justify-center">
                        {formData.images.map((img, i) => (
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={i} 
                            className="bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">{img.name}</span>
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={labelClasses}>Ваш Город</label>
                  <input 
                    type="text"
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="Например: Прага"
                    className={inputClasses}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Как к вам обращаться?</label>
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
                    <label className={labelClasses}>Email или Телефон</label>
                    <input 
                      type="text"
                      value={formData.contact}
                      onChange={e => setFormData({...formData, contact: e.target.value})}
                      placeholder="+420... или email@..."
                      className={inputClasses}
                      required
                    />
                  </div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-4 mt-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/5 dark:to-orange-500/5 backdrop-blur-md p-5 rounded-2xl border border-amber-500/20"
                >
                  <div className="bg-amber-500/20 p-2 rounded-full flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    Твои контакты будут скрыты и станут доступны <span className="font-semibold">только доверенным мастерам</span>, которые захотят взять твою идею в работу.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-neutral-200/50 dark:border-neutral-800/50">
            {step > 1 ? (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button" 
                onClick={prevStep}
                className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors font-medium px-4 py-2 rounded-xl hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </motion.button>
            ) : (
              <div></div>
            )}
            
            {step < 4 ? (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button" 
                onClick={nextStep}
                className="bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-neutral-900/20 dark:shadow-white/10 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">Далее</span>
                <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ) : (
              <motion.button 
                whileHover={!isSubmitting ? { scale: 1.02 } : {}}
                whileTap={!isSubmitting ? { scale: 0.98 } : {}}
                type="submit" 
                disabled={isSubmitting}
                className="relative bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-violet-500/30 disabled:opacity-70 disabled:hover:scale-100 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10">{isSubmitting ? 'Отправляем...' : 'Оставить заявку'}</span>
                {!isSubmitting && <Check className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" />}
              </motion.button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
