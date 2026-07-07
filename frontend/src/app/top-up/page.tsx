'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Gem, Sparkles, CheckCircle2, ShieldCheck, Zap, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'
interface Package {
  id: string
  name: string
  priceCZK: number
  amountCredits: number
  link: string
  popular?: boolean
  color: string
  borderColor: string
}

export default function TopUpPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [isLoadingPackage, setIsLoadingPackage] = useState<string | null>(null)
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id)
        setUserEmail(session.user.email || '')
      }
    })
  }, [])
  
  const handleBuyPackage = async (pkgId: string) => {
    if (!userId) return
    
    try {
      setIsLoadingPackage(pkgId)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("No session")
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ package_id: pkgId })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }
      
      const data = await response.json()
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error("Payment error:", error)
      alert("Произошла ошибка при создании платежа. Попробуйте позже.")
    } finally {
      setIsLoadingPackage(null)
    }
  }



  const packages: Package[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      priceCZK: 300,
      amountCredits: 300,
      link: 'https://checkout.revolut.com/pay/56cf8971-7682-44bb-a110-367adaaf4aa6',
      color: 'from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/5',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'standard',
      name: 'Standard Pack',
      priceCZK: 500,
      amountCredits: 500,
      link: 'https://checkout.revolut.com/pay/ee159515-1108-419a-bdc1-7449f085dc44',
      popular: true,
      color: 'from-cyan-500/10 to-purple-500/10 dark:from-cyan-900/20 dark:to-purple-900/20',
      borderColor: 'border-cyan-400 dark:border-cyan-500 shadow-lg shadow-cyan-500/20'
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      priceCZK: 1000,
      amountCredits: 1000,
      link: 'https://checkout.revolut.com/pay/de28e5ef-8085-47f8-b5c2-817046933b65',
      color: 'from-amber-500/10 to-amber-500/5 dark:from-amber-900/20 dark:to-amber-900/5',
      borderColor: 'border-amber-200 dark:border-amber-800'
    },
    {
      id: 'vip',
      name: 'VIP Pack',
      priceCZK: 2000,
      amountCredits: 2000,
      link: 'https://checkout.revolut.com/pay/f1e0a061-5ec3-458c-b4ec-b5ae67bf4861',
      color: 'from-rose-500/10 to-rose-500/5 dark:from-rose-900/20 dark:to-rose-900/5',
      borderColor: 'border-rose-200 dark:border-rose-800'
    }
  ]

  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden pb-12">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 dark:bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[120px]" />
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors mb-8 font-semibold"
        >
          <ArrowLeft className="w-5 h-5" />
          Вернуться на панель
        </button>

        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-6">
            <Gem className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4 flex items-center justify-center gap-3">
            Пополнение баланса
            <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto font-medium">
            Выберите подходящий пакет для покупки лидов. Баланс будет начислен мгновенно после оплаты.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
          {packages.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`relative bg-gradient-to-br ${pkg.color} border ${pkg.borderColor} rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-300 transform-gpu`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-black uppercase px-4 py-1.5 rounded-full shadow-lg">
                  Хит продаж
                </div>
              )}

              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 mt-2">{pkg.name}</h3>
              
              <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-purple-500 my-6">
                {pkg.priceCZK} CZK
              </div>

              <ul className="text-left space-y-3 w-full mb-8 flex-grow">
                <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Баланс: {pkg.amountCredits} CZK
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  Apple Pay / Google Pay / Карта
                </li>
                <li className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 font-medium">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Мгновенное зачисление
                </li>
              </ul>

              <button 
                onClick={() => handleBuyPackage(pkg.id)}
                disabled={isLoadingPackage === pkg.id}
                className={`w-full py-4 px-4 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md ${
                  pkg.popular 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-cyan-500/25' 
                    : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90'
                } ${isLoadingPackage === pkg.id ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoadingPackage === pkg.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Купить пакет"
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto bg-white/40 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-white/5 backdrop-blur-xl rounded-2xl p-6 text-center shadow-lg">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Платежи безопасно обрабатываются нашим партнером <strong>Stripe</strong>.<br className="hidden sm:block" /> Мы не храним данные ваших карт. Нажимая кнопку оплаты, вы соглашаетесь с нашими правилами сервиса.
          </p>
        </div>
      </main>
    </div>
  )
}
