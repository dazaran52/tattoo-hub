'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Gem, Sparkles, AlertCircle, CreditCard, HeartHandshake, Loader2, X, Copy, Check, MessageCircle, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { playSuccessSound, triggerHaptic } from '@/lib/sounds'
import { getTranslation, Language } from '@/lib/i18n'

interface TopUpMethod {
  id: string
  name: string
  description: React.ReactNode
  icon: React.ReactNode
  color: string
  border: string
  actionText: string
  onClick: () => void
}

export default function TopUpPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)
  const [amountCredits, setAmountCredits] = useState<number>(100)
  const [showRevolutModal, setShowRevolutModal] = useState(false)
  const [showDonatelloModal, setShowDonatelloModal] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [checkoutMethod, setCheckoutMethod] = useState<'revolut' | 'donatello' | null>(null)
  
  // Simulated Card State
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [cardExpiry, setCardExpiry] = useState('12/28')
  const [cardCvc, setCardCvc] = useState('123')
  const [cardName, setCardName] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  const [userEmail, setUserEmail] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)
  const [language, setLanguage] = useState<string>('cs')

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

  const t = (key: Parameters<typeof getTranslation>[1]) => getTranslation(language as Language, key)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        setCardName(session.user.email.split('@')[0].toUpperCase())
      }
    })
  }, [])

  const copyEmail = () => {
    navigator.clipboard.writeText(userEmail)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const openCheckout = (method: 'revolut' | 'donatello') => {
    setCheckoutMethod(method)
    setShowRevolutModal(false)
    setShowDonatelloModal(false)
    setShowCheckoutModal(true)
  }

  const handleSimulatedPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPaying(true)

    // Validate card details length
    if (cardNumber.replace(/\s/g, '').length < 16 || cardExpiry.length < 5 || cardCvc.length < 3) {
      toast.error('Пожалуйста, заполните реквизиты карты корректно')
      setIsPaying(false)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Пользователь не авторизован')
        setIsPaying(false)
        return
      }

      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/payments/checkout/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          amount_balance: amountCredits,
          payment_method: checkoutMethod
        })
      })

      if (!response.ok) {
        throw new Error('Ошибка подтверждения платежа на сервере')
      }

      playSuccessSound()
      triggerHaptic('success')
      toast.success(`Баланс успешно пополнен на ${amountCredits} валюты! 🎉`, { duration: 4000 })
      router.push('/dashboard')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Ошибка обработки платежа')
    } finally {
      setIsPaying(false)
      setShowCheckoutModal(false)
    }
  }

  const topUpMethods: TopUpMethod[] = [
    {
      id: 'donatello',
      name: 'Donatello (Card / UAH)',
      description: (
        <ul className="text-left space-y-1.5 text-sm">
          <li>• Быстрая оплата картой в гривнах (UAH)</li>
          <li>• Автоматическое зачисление валюты</li>
          <li className="text-green-600 dark:text-green-400 font-bold mt-2">ВАЖНО: укажите ваш Email в комментарии.</li>
        </ul>
      ),
      icon: <HeartHandshake className="w-8 h-8 text-rose-500" />,
      color: 'from-rose-500/10 to-rose-500/5 dark:from-rose-950/20 dark:to-rose-950/5',
      border: 'border-rose-200 dark:border-rose-900/30',
      actionText: 'Оплата через Donatello',
      onClick: () => setShowDonatelloModal(true)
    },
    {
      id: 'revolut',
      name: 'Revolut Pay (Card / EUR)',
      description: (
        <ul className="text-left space-y-1.5 text-sm">
          <li>• Оплата картой в евро (EUR)</li>
          <li>• Без комиссии с карт Revolut и банков ЕС</li>
          <li className="text-green-600 dark:text-green-400 font-bold mt-2">ВАЖНО: укажите ваш Email в Note платежа.</li>
        </ul>
      ),
      icon: <CreditCard className="w-8 h-8 text-cyan-500" />,
      color: 'from-cyan-500/10 to-cyan-500/5 dark:from-cyan-950/20 dark:to-cyan-950/5',
      border: 'border-cyan-200 dark:border-cyan-900/30',
      actionText: 'Оплатить через Revolut',
      onClick: () => setShowRevolutModal(true)
    }
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-hidden pb-12">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors mb-8 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться на панель
        </button>

        <div className="relative">
          {/* Glassmorphic main block */}
          <div className="relative bg-white/40 dark:bg-neutral-900/40 backdrop-blur-xl border border-neutral-200/50 dark:border-white/5 rounded-3xl p-6 sm:p-12 shadow-2xl overflow-hidden">
            
            <div className="relative z-10 text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
                <Gem className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4 flex items-center justify-center gap-3">
                Пополнение баланса
                <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
              </h1>
              <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto font-medium">
                {step === 1 ? 'Выберите необходимое количество валюты' : 'Выберите удобный способ оплаты'}
              </p>
            </div>

            {step === 1 && (
              <div className="max-w-md mx-auto mb-10 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-md border border-neutral-200/50 dark:border-white/5 p-6 rounded-3xl shadow-lg">
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-4 text-center">
                  Количество валюты для пополнения
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setAmountCredits(Math.max(10, amountCredits - 10))}
                    className="w-12 h-12 rounded-xl bg-neutral-200/50 dark:bg-neutral-850 text-neutral-900 dark:text-white font-black text-xl hover:bg-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                  >
                    -
                  </button>
                  <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 w-28 text-center">
                    {amountCredits}
                  </div>
                  <button 
                    onClick={() => setAmountCredits(amountCredits + 10)}
                    className="w-12 h-12 rounded-xl bg-neutral-200/50 dark:bg-neutral-850 text-neutral-900 dark:text-white font-black text-xl hover:bg-neutral-300 dark:hover:bg-neutral-800 transition-colors"
                  >
                    +
                  </button>
                </div>
                
                <div className="mt-6 flex flex-col gap-2 p-4 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-2xl border border-neutral-200/30 dark:border-white/5">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-neutral-500">Эквивалент в EUR:</span>
                    <span className="text-neutral-900 dark:text-white">{amountCredits / 10} EUR</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-neutral-500">Эквивалент в UAH:</span>
                    <span className="text-neutral-900 dark:text-white">{amountCredits * 4} UAH</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-2xl font-bold shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  Далее
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
                  <button 
                    onClick={() => setStep(1)}
                    className="text-sm font-bold text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Изменить сумму
                  </button>
                  <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
                    Выбрано: {amountCredits} валюты
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
                  {topUpMethods.map((method) => (
                    <div 
                      key={method.id} 
                      className={`bg-gradient-to-br ${method.color} border ${method.border} rounded-3xl p-6 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-300 shadow-sm`}
                    >
                      <div className="mb-4 bg-white/60 dark:bg-neutral-900/60 p-4 rounded-2xl shadow-sm backdrop-blur-sm">
                        {method.icon}
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{method.name}</h3>
                      <div className="text-neutral-600 dark:text-neutral-400 mb-6 flex-grow">
                        {method.description}
                      </div>
                      <button 
                        onClick={method.onClick}
                        className="w-full py-3.5 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
                      >
                        {method.actionText}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Info blocks */}
                <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                  <div className="bg-white/40 dark:bg-neutral-950/40 border border-neutral-200/50 dark:border-white/5 backdrop-blur-md rounded-2xl p-6 text-left">
                    <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-cyan-500" />
                      Как работает песочница платежей?
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      В этой демонстрационной версии подключена <strong>песочница (sandbox)</strong>. При клике на Revolut или Donatello вы увидите форму оплаты картой. Вы можете использовать тестовую карту 4242 для успешной имитации транзакции и начисления баланса.
                    </p>
                  </div>

                  <div className="bg-white/40 dark:bg-neutral-950/40 border border-neutral-200/50 dark:border-white/5 backdrop-blur-md rounded-2xl p-6 text-left">
                    <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-2">
                      <MessageCircle className="w-5 h-5 text-rose-500" />
                      Требуется помощь?
                    </h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      Если у вас возникли вопросы по зачислению или настройкам SaaS, напишите в онлайн-поддержку в правом нижнем углу экрана.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Revolut Info Modal */}
      {showRevolutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-neutral-200 dark:border-neutral-800 text-center">
            <button 
              onClick={() => setShowRevolutModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Оплата через Revolut
            </h3>
            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-5 rounded-2xl mb-6 text-left">
              <h4 className="font-bold text-cyan-900 dark:text-cyan-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Тестовое пополнение
              </h4>
              <p className="text-sm text-cyan-800 dark:text-cyan-300 mb-4 leading-relaxed font-medium">
                Сумма к оплате: <strong>{amountCredits / 10} EUR</strong>.<br />
                Вы будете перенаправлены на защищенный тестовый шлюз Stripe Checkout Sandbox.
              </p>
              
              <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-neutral-900 dark:text-white truncate text-sm">
                  {userEmail || 'Загрузка...'}
                </span>
                <button 
                  onClick={copyEmail}
                  className="p-2 shrink-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg transition-colors"
                >
                  {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRevolutModal(false)}
                className="flex-1 py-3 px-4 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => openCheckout('revolut')}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Оплатить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donatello Info Modal */}
      {showDonatelloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in-up">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-neutral-200 dark:border-neutral-800 text-center">
            <button 
              onClick={() => setShowDonatelloModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <HeartHandshake className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
              Оплата через Donatello
            </h3>
            
            <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 p-5 rounded-2xl mb-6 text-left">
              <h4 className="font-bold text-cyan-900 dark:text-cyan-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Тестовое пополнение
              </h4>
              <p className="text-sm text-cyan-800 dark:text-cyan-300 mb-4 leading-relaxed font-medium">
                Сумма к оплате: <strong>{amountCredits * 4} UAH</strong>.<br />
                Вы будете перенаправлены на защищенный тестовый шлюз Stripe Checkout Sandbox.
              </p>
              
              <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <span className="font-mono text-neutral-900 dark:text-white truncate text-sm">
                  {userEmail || t('loading')}
                </span>
                <button 
                  onClick={copyEmail}
                  className="p-2 shrink-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg transition-colors"
                >
                  {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowDonatelloModal(false)}
                className="flex-1 py-3 px-4 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-semibold hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => openCheckout('donatello')}
                className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25"
              >
                Оплатить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Checkout Sandbox Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative border border-neutral-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            {/* Stripe Header Brand */}
            <div className="bg-[#635bff] p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span className="font-extrabold tracking-tight">Stripe Sandbox Checkout</span>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSimulatedPayment} className="p-6 space-y-5">
              <div className="text-center py-2 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/50 dark:border-white/5 rounded-2xl">
                <span className="text-xs text-neutral-400 uppercase font-bold block mb-0.5">К оплате</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-white">
                  {checkoutMethod === 'revolut' ? `${amountCredits / 10} EUR` : `${amountCredits * 4} UAH`}
                </span>
                <span className="text-[10px] text-violet-500 dark:text-violet-400 block font-bold mt-1">
                  (Баланс +{amountCredits} валюты)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Номер Карты</label>
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Срок действия</label>
                  <input 
                    type="text" 
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">CVC</label>
                  <input 
                    type="password" 
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-mono text-sm animate-pulse"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">Имя на карте</label>
                <input 
                  type="text" 
                  value={cardName}
                  onChange={e => setCardName(e.target.value)}
                  placeholder="IVAN IVANOV"
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 uppercase text-sm font-semibold"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isPaying}
                className="w-full py-4 bg-[#635bff] hover:bg-[#5a52e0] text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isPaying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Обработка платежа...</span>
                  </>
                ) : (
                  <span>Подтвердить платеж</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
