'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Gem, Sparkles, AlertCircle, CreditCard, Wallet, HeartHandshake, ExternalLink, Loader2, X, Copy, Check, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface TopUpMethod {
  id: string
  name: string
  description: React.ReactNode
  icon: React.ReactNode
  color: string
  border: string
  actionText: string
  isDynamic?: boolean
  onClick?: () => void
  link?: string
}

export default function TopUpPage() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)
  const [amountCredits, setAmountCredits] = useState<number>(100)
  const [showRevolutModal, setShowRevolutModal] = useState(false)
  const [showDonatelloModal, setShowDonatelloModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)
  const [isCreatingRequest, setIsCreatingRequest] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email)
      }
    })
  }, [])

  const copyEmail = () => {
    navigator.clipboard.writeText(userEmail)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleRevolutContinue = async () => {
    try {
      setIsCreatingRequest(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      // Open Revolut link
      window.open('https://checkout.revolut.com/pay/e79e0c52-e699-4abc-ab7d-ac68b1a62276', '_blank')
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      toast.error('Произошла ошибка при перенаправлении')
    } finally {
      setIsCreatingRequest(false)
      setShowRevolutModal(false)
    }
  }

  const topUpMethods: TopUpMethod[] = [
    {
      id: 'donatello',
      name: 'Donatello',
      description: (
        <ul className="text-left space-y-1">
          <li>• Быстрая оплата вводом реквизитов карты</li>
          <li>• ⚠️ Apple Pay/Google Pay НЕ поддерживаются</li>
          <li>• Автоматическое зачисление</li>
          <li className="text-green-600 dark:text-green-400 font-semibold mt-2">ВАЖНО: укажите ваш Email в комментарии к платежу.</li>
        </ul>
      ),
      icon: <HeartHandshake className="w-8 h-8 text-rose-500" />,
      color: 'from-rose-100 to-rose-50 dark:from-rose-900/40 dark:to-rose-900/10',
      border: 'border-rose-200 dark:border-rose-800',
      actionText: 'Оплата через Donatello',
      isDynamic: true,
      onClick: () => setShowDonatelloModal(true)
    },
    {
      id: 'revolut',
      name: 'Revolut Pro',
      description: (
        <ul className="text-left space-y-1">
          <li>• Быстрая оплата через Apple/Google Pay</li>
          <li>• Без комиссий с любой европейской, украинской, Revolut карт</li>
          <li>• Автоматическое зачисление</li>
          <li className="text-green-600 dark:text-green-400 font-semibold mt-2">ВАЖНО: укажите ваш Email в комментарии (Note) к платежу.</li>
        </ul>
      ),
      icon: <CreditCard className="w-8 h-8 text-black dark:text-white" />,
      color: 'from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/10',
      border: 'border-blue-200 dark:border-blue-800',
      actionText: 'Оплатить через Revolut',
      isDynamic: true,
      onClick: () => setShowRevolutModal(true)
    },


  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться назад
        </button>

        <div className="relative animate-fade-in-up">
          {/* Animated background glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 rounded-3xl blur opacity-20 dark:opacity-30 animate-pulse"></div>
          
          <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 dark:border-neutral-800 rounded-3xl p-6 sm:p-12 shadow-2xl overflow-hidden">
            
            {/* Top decorative elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>

            <div className="relative z-10 text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
                <Gem className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4 flex items-center justify-center gap-3">
                Пополнение баланса
                <Sparkles className="w-6 h-6 text-amber-500" />
              </h1>
              <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-xl mx-auto">
                {step === 1 ? 'Выберите необходимое количество кредитов' : 'Выберите удобный способ оплаты'}
              </p>
            </div>

            {step === 1 && (
              <div className="max-w-md mx-auto mb-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 rounded-2xl shadow-sm animate-in fade-in slide-in-from-bottom-4">
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3 text-center">
                  Количество кредитов для пополнения
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button 
                    onClick={() => setAmountCredits(Math.max(10, amountCredits - 10))}
                    className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    -
                  </button>
                  <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 w-24 text-center">
                    {amountCredits}
                  </div>
                  <button 
                    onClick={() => setAmountCredits(amountCredits + 10)}
                    className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold text-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                  >
                    +
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-2 p-4 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Эквивалент в EUR:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{amountCredits / 10} EUR</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">Эквивалент в UAH:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{amountCredits * 4} UAH</span>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full mt-6 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40"
                >
                  Далее
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
                  <button 
                    onClick={() => setStep(1)}
                    className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Изменить сумму
                  </button>
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
                    Выбрано: {amountCredits} кредитов
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 max-w-3xl mx-auto">
                  {topUpMethods.map((method) => (
                    <div 
                      key={method.id} 
                      className={`bg-gradient-to-br ${method.color} border ${method.border} rounded-2xl p-6 flex flex-col items-center text-center transition-transform hover:-translate-y-1 duration-300`}
                    >
                      <div className="mb-4 bg-white/50 dark:bg-neutral-900/50 p-4 rounded-2xl shadow-sm backdrop-blur-sm">
                        {method.icon}
                      </div>
                      <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{method.name}</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 flex-grow">
                        {method.description}
                      </p>
                      {method.isDynamic ? (
                        <button 
                          onClick={method.onClick}
                          className="w-full py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          {method.actionText}
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      ) : (
                        <a 
                          href={method.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3 px-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                        >
                          {method.actionText}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bottom info section */}
                <div className="flex flex-col gap-4 mt-6">
                  <div className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-left">
                    <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
                      <AlertCircle className="w-5 h-5 text-cyan-500" />
                      Как работает пополнение?
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Оба метода обрабатываются <b>автоматически</b>. Главное правило — обязательно укажите ваш Email в комментарии (Note) к платежу, чтобы система смогла вас распознать. Кредиты зачисляются в течение 1-2 минут после оплаты.
                    </p>
                  </div>

                  <div className="bg-neutral-100 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 text-left">
                    <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2 mb-1">
                      <MessageCircle className="w-5 h-5 text-rose-500" />
                      Проблемы с зачислением кредитов?
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      Напиши в поддержку в правом нижнем углу страницы, и мы всё исправим!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Revolut Trust Modal */}
      {showRevolutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
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
                Обязательный шаг
              </h4>
              <p className="text-sm text-cyan-800 dark:text-cyan-300 mb-4 leading-relaxed">
                Вы пополняете баланс на <strong>{amountCredits} кредитов</strong>.<br />
                Пожалуйста, переведите ровно <strong>{amountCredits / 10} EUR</strong> по нашей ссылке.<br /><br />
                Для <b>автоматического</b> зачисления кредитов в течение 1-2 минут, обязательно скопируйте ваш Email ниже и вставьте в комментарий (Note) к платежу.
              </p>
              
              <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 mb-4">
                <span className="font-mono text-neutral-900 dark:text-white truncate">
                  {userEmail || 'Загрузка...'}
                </span>
                <button 
                  onClick={copyEmail}
                  className="p-2 shrink-0 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg transition-colors"
                >
                  {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-xs text-cyan-700 dark:text-cyan-400">
                После нажатия "Перейти к оплате", ссылка откроется в соседней вкладке. Если вы забыли указать Email, вы сможете прикрепить скриншот чека на Главной странице.
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRevolutModal(false)}
                className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleRevolutContinue}
                disabled={isCreatingRequest}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isCreatingRequest ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Перейти к оплате'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Donatello Trust Modal */}
      {showDonatelloModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
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
                Обязательный шаг
              </h4>
              <p className="text-sm text-cyan-800 dark:text-cyan-300 mb-4 leading-relaxed">
                Вы пополняете баланс на <strong>{amountCredits} кредитов</strong>.<br />
                Сумма к оплате: <strong>{amountCredits * 4} UAH</strong> или <strong>{amountCredits / 10} EUR</strong>.<br /><br />
                Вы можете оплатить картой украинского банка (в гривнах) или картой ЕС (в евро), выбрав нужный метод на странице оплаты.<br /><br />
                ⚠️ <b>Внимание:</b> Apple Pay и Google Pay не работают. Потребуется ввести реквизиты карты вручную.<br /><br />
                Для <b>автоматического</b> зачисления кредитов, обязательно скопируйте ваш Email ниже и вставьте в комментарий к платежу.
              </p>
              
              <div className="bg-white dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                <span className="font-mono text-neutral-900 dark:text-white truncate">
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
                onClick={() => setShowDonatelloModal(false)}
                className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-xl font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              >
                Отмена
              </button>
              <a
                href="https://donatello.to/TattooHub"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowDonatelloModal(false)}
                className="flex-1 py-3 px-4 bg-rose-500 text-white rounded-xl font-medium hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25"
              >
                К оплате
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
