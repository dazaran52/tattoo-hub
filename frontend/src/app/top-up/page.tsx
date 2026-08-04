'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Gem, Sparkles, CheckCircle2, ShieldCheck, Zap, Loader2, Star, Crown, Gift, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Package {
  id: string
  name: string
  badge?: string
  amounts: Record<string, number>
  creditAmounts: Record<string, number>
  bonusText?: string
  perks: string[]
  popular?: boolean
  vip?: boolean
  color: string
  borderColor: string
}

export default function TopUpPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string>('')
  const [walletCurrency, setWalletCurrency] = useState<string>('CZK')
  const [walletError, setWalletError] = useState<string | null>(null)
  const [isLoadingPackage, setIsLoadingPackage] = useState<string | null>(null)
  
  // Custom amount state (for amounts >= VIP price)
  const [customAmount, setCustomAmount] = useState<string>('3000')

  const minCustomAmounts: Record<string, number> = { CZK: 3000, EUR: 120, USD: 132 }
  const currentMinCustom = minCustomAmounts[walletCurrency] || 3000

  useEffect(() => {
    const loadWallet = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) {
        setWalletError('Не удалось загрузить валюту кошелька')
        return
      }
      const profile = await response.json()
      const currency = String(profile.currency || '').toUpperCase()
      if (!['CZK', 'EUR', 'USD'].includes(currency)) {
        setWalletError('Валюта кошелька не поддерживается')
        return
      }
      setWalletCurrency(currency)
    }
    loadWallet().catch(() => setWalletError('Не удалось загрузить валюту кошелька'))
  }, [])

  const handleBuyPackage = async (pkgId: string, customVal?: number) => {
    if (!userId || !walletCurrency || walletError) return

    try {
      setIsLoadingPackage(pkgId)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const bodyPayload: any = { package_id: pkgId }
      if (pkgId === 'custom' && customVal) {
        bodyPayload.custom_amount = customVal
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/payments/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(bodyPayload)
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || 'Failed to create checkout session')
      }

      const data = await response.json()

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error: any) {
      console.error('Payment error:', error)
      alert(error.message || 'Произошла ошибка при создании платежа. Попробуйте позже.')
    } finally {
      setIsLoadingPackage(null)
    }
  }

  const packages: Package[] = [
    {
      id: 'starter',
      name: 'Starter Pack',
      amounts: { CZK: 300, EUR: 12, USD: 13 },
      creditAmounts: { CZK: 300, EUR: 12, USD: 13 },
      perks: [
        'Базовое пополнение 1:1',
        'Мгновенное зачисление',
      ],
      color: 'from-blue-500/10 to-blue-500/5 dark:from-blue-900/20 dark:to-blue-900/5',
      borderColor: 'border-blue-500/30 dark:border-blue-800'
    },
    {
      id: 'standard',
      name: 'Standard Pack',
      badge: 'Хит продаж',
      bonusText: '+10% БОНУС',
      popular: true,
      amounts: { CZK: 500, EUR: 20, USD: 22 },
      creditAmounts: { CZK: 550, EUR: 22, USD: 24.2 },
      perks: [
        '+10% средств в подарок на баланс',
        'Приоритет откликов в маркете',
        'Мгновенное зачисление',
      ],
      color: 'from-primary-500/20 to-primary-500/5 dark:from-primary-900/30 dark:to-primary-900/10',
      borderColor: 'border-primary-500/60 shadow-lg shadow-primary-500/20'
    },
    {
      id: 'pro',
      name: 'Pro Pack',
      badge: 'Выгода +15%',
      bonusText: '+15% БОНУС',
      amounts: { CZK: 1000, EUR: 40, USD: 44 },
      creditAmounts: { CZK: 1150, EUR: 46, USD: 50.6 },
      perks: [
        '+15% средств бесплатно на баланс',
        '⭐ PRO Значок доверия',
        'Приоритет в списке каталога',
      ],
      color: 'from-amber-500/20 to-amber-500/5 dark:from-amber-900/30 dark:to-amber-900/10',
      borderColor: 'border-amber-500/50 shadow-lg shadow-amber-500/10'
    },
    {
      id: 'vip',
      name: 'VIP Pack',
      badge: 'Выгода +20%',
      bonusText: '+20% БОНУС',
      vip: true,
      amounts: { CZK: 2000, EUR: 80, USD: 88 },
      creditAmounts: { CZK: 2400, EUR: 96, USD: 105.6 },
      perks: [
        '+20% бонусных средств на баланс',
        '👑 VIP Золотой Значок доверия',
        'Приоритетный доступ к горячим лидам',
      ],
      color: 'from-rose-500/20 to-rose-500/5 dark:from-rose-900/30 dark:to-rose-900/10',
      borderColor: 'border-rose-500/60 shadow-xl shadow-rose-500/25'
    }
  ]

  const customNum = parseFloat(customAmount) || 0
  const isCustomValid = customNum >= currentMinCustom
  const customBonusAmount = Math.round(customNum * 0.30)
  const customTotalCredit = Math.round(customNum * 1.30)

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-neutral-900 dark:text-white transition-colors duration-300 relative overflow-x-hidden pb-16">
      {/* Premium ambient glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-accent-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary-500/10 blur-[120px]" />
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
          <div className="w-20 h-20 bg-gradient-to-br from-accent-400 to-primary-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-primary-500/25 mb-6">
            <Gem className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 dark:text-white tracking-tight mb-4 flex items-center justify-center gap-3">
            Пополнение баланса
            <Sparkles className="w-7 h-7 text-amber-400 animate-pulse" />
          </h1>
          <p className="text-base sm:text-lg text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto font-medium">
            Пополняйте баланс с выгодой до <strong className="text-emerald-400 font-black">+30% бонусных средств</strong> в подарок для оплаты комиссии только за реальные записи!
          </p>
        </div>

        {walletError && (
          <div className="max-w-xl mx-auto mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-center font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {walletError}
          </div>
        )}

        {/* Tariff Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-12">
          {packages.map((pkg) => {
            const payAmount = pkg.amounts[walletCurrency]
            const creditAmount = pkg.creditAmounts[walletCurrency]
            const bonusAmount = creditAmount - payAmount

            return (
              <div 
                key={pkg.id} 
                className={`relative bg-gradient-to-br ${pkg.color} border ${pkg.borderColor} rounded-3xl p-6 flex flex-col items-center text-center hover:scale-[1.02] transition-all duration-300 transform-gpu backdrop-blur-xl`}
              >
                {pkg.badge && (
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 text-white text-[11px] font-black uppercase px-4 py-1.5 rounded-full shadow-lg ${
                    pkg.vip ? 'bg-gradient-to-r from-rose-500 to-amber-500' : pkg.popular ? 'bg-gradient-to-r from-primary-600 to-accent-500' : 'bg-amber-500'
                  }`}>
                    {pkg.badge}
                  </div>
                )}

                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-1 mt-2">{pkg.name}</h3>

                {pkg.bonusText && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-2.5 py-0.5 rounded-full mb-3 border border-emerald-500/30">
                    {pkg.bonusText}
                  </span>
                )}
                
                {/* Price Display */}
                <div className="my-4 flex flex-col items-center">
                  <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Цена пакета</span>
                  <span className="text-3xl font-black text-white">
                    {payAmount} {walletCurrency}
                  </span>
                  
                  {bonusAmount > 0 ? (
                    <span className="text-xs font-black text-emerald-400 mt-1 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      +{bonusAmount} {walletCurrency} в подарок!
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500 mt-1">без бонуса</span>
                  )}
                </div>

                <div className="w-full bg-white/5 rounded-2xl p-3 mb-6 border border-white/10 text-center">
                  <span className="text-[11px] text-neutral-400 font-bold block">На баланс зачислится:</span>
                  <span className="text-lg font-black text-amber-400">
                    {creditAmount} {walletCurrency}
                  </span>
                </div>

                <ul className="text-left space-y-2.5 w-full mb-6 flex-grow">
                  {pkg.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-neutral-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleBuyPackage(pkg.id)}
                  disabled={isLoadingPackage === pkg.id || !walletCurrency || Boolean(walletError)}
                  className={`w-full py-3.5 px-4 font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md ${
                    pkg.vip
                      ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90 text-white shadow-rose-500/25'
                      : pkg.popular 
                        ? 'bg-gradient-to-r from-primary-600 to-accent-500 hover:opacity-90 text-white shadow-primary-500/25' 
                        : 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90'
                  } ${isLoadingPackage === pkg.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isLoadingPackage === pkg.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Выбрать пакет'
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* Custom Amount Section (> VIP Price) */}
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-neutral-900/90 to-neutral-900/60 border border-amber-500/40 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-bold text-white">Произвольное пополнение (Крупный объем)</h3>
                <span className="bg-amber-500/20 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  +30% БОНУС
                </span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-400">
                Введите любую сумму от <strong>{currentMinCustom} {walletCurrency}</strong> и получите максимальный <strong className="text-amber-400">+30% бонус</strong> на баланс и статус VIP!
              </p>

              <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <input
                    type="number"
                    min={currentMinCustom}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/15 rounded-2xl px-4 py-3 text-lg font-black text-white outline-none focus:border-amber-500 transition-all"
                    placeholder={`Мин. ${currentMinCustom}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                    {walletCurrency}
                  </span>
                </div>

                <div className="flex flex-col justify-center px-4 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase">Итого на балансе:</span>
                  <span className="text-lg font-black text-amber-400">
                    {isCustomValid ? `${customTotalCredit} ${walletCurrency}` : '—'}
                  </span>
                  {isCustomValid && (
                    <span className="text-[10px] text-emerald-400 font-bold">
                      (+{customBonusAmount} {walletCurrency} в подарок)
                    </span>
                  )}
                </div>
              </div>

              {!isCustomValid && (
                <p className="text-xs text-red-400 font-semibold mt-2">
                  Минимальная сумма для произвольного пополнения — {currentMinCustom} {walletCurrency}
                </p>
              )}
            </div>

            <button
              onClick={() => handleBuyPackage('custom', customNum)}
              disabled={!isCustomValid || isLoadingPackage === 'custom' || !walletCurrency || Boolean(walletError)}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 via-rose-500 to-primary-600 hover:opacity-90 text-white text-sm font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPackage === 'custom' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Пополнить на {isCustomValid ? customNum : '0'} {walletCurrency}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Security & Guarantee Footer */}
        <div className="max-w-3xl mx-auto bg-white/40 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-white/5 backdrop-blur-xl rounded-3xl p-6 text-center shadow-lg">
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-neutral-400 font-bold mb-3">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400"/> Безопасные платежи Stripe</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400"/> Мгновенное зачисление</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-400"/> Без скрытых комиссий</span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Платежи безопасно обрабатываются международным партнером <strong>Stripe</strong>. Мы не храним данные ваших карт. Нажимая кнопку оплаты, вы соглашаетесь с нашими правилами сервиса.
          </p>
        </div>
      </main>
    </div>
  )
}
