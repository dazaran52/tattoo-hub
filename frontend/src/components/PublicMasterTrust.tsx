'use client'

import { useEffect, useState } from 'react'
import { Award, CalendarCheck, MapPin, MessageCircle, Send, Crown, Star } from 'lucide-react'
import { publicApi } from '@/lib/publicApi'

export function VerifiedMasterBadge({ verified, className = 'h-4 w-4 text-primary-500' }: { verified?: boolean; className?: string }) {
  if (!verified) return null

  return (
    <span
      aria-label="Проверенный мастер Tattoo HUB"
      title="Проверенный мастер Tattoo HUB"
      className="inline-flex items-center justify-center rounded-full bg-primary-500/10 border border-primary-500/30 p-1 text-primary-500 shrink-0"
    >
      <Award className={className} aria-hidden="true" />
    </span>
  )
}

export function MasterTierBadge({ badgeTier }: { badgeTier?: string }) {
  if (!badgeTier || badgeTier === 'none') return null

  if (badgeTier === 'vip') {
    return (
      <span
        title="VIP Мастер Tattoo HUB"
        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black text-amber-300 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
      >
        <Crown className="w-3 h-3 text-amber-400" />
        <span>VIP</span>
      </span>
    )
  }

  if (badgeTier === 'pro') {
    return (
      <span
        title="PRO Мастер Tattoo HUB"
        className="inline-flex items-center gap-1 rounded-full bg-primary-500/20 border border-primary-500/40 px-2 py-0.5 text-[10px] font-black text-primary-300 shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
      >
        <Star className="w-3 h-3 text-primary-400" />
        <span>PRO</span>
      </span>
    )
  }

  return null
}

interface MasterTrustSummaryProps {
  cityIds?: string[]
}

export function MasterTrustSummary({ cityIds = [] }: MasterTrustSummaryProps) {
  const [cityName, setCityName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (cityIds.length === 0) {
      setCityName(null)
      return () => {
        cancelled = true
      }
    }

    publicApi.getCities()
      .then(cities => {
        if (cancelled) return
        const city = cities.find(item => cityIds.includes(item.id))
        setCityName(city?.name_ru || city?.name_en || null)
      })
      .catch(() => {
        if (!cancelled) setCityName(null)
      })

    return () => {
      cancelled = true
    }
  }, [cityIds.join('|')])

  if (!cityName) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200/70 bg-neutral-100/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {cityName}
      </span>
    </div>
  )
}

export function WhatHappensNext({ className = '' }: { className?: string }) {
  const steps = [
    { icon: Send, text: 'Мастер получит вашу заявку с описанием и референсами.' },
    { icon: MessageCircle, text: 'Свяжется с вами, чтобы уточнить детали, стоимость и свободные даты.' },
    { icon: CalendarCheck, text: 'Запись будет подтверждена после того, как вы всё согласуете.' },
  ]

  return (
    <section className={`mb-6 rounded-3xl p-6 sm:p-7 ${className}`} aria-labelledby="what-happens-next-title">
      <h2 id="what-happens-next-title" className="mb-5 text-xl font-extrabold">
        Что произойдет после заявки
      </h2>
      <ol className="space-y-4">
        {steps.map(({ icon: Icon, text }, index) => (
          <li key={text} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Шаг {index + 1}</span>
              <p className="mt-0.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
        Отправка заявки не подтверждает сеанс автоматически — финальные детали вы согласуете с мастером лично.
      </p>
    </section>
  )
}
