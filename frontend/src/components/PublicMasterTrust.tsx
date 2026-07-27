'use client'

import { useEffect, useState } from 'react'
import { BadgeCheck, CalendarCheck, MapPin, MessageCircle, Send } from 'lucide-react'
import { publicApi } from '@/lib/publicApi'

export function VerifiedMasterBadge({ verified }: { verified?: boolean }) {
  if (!verified) return null

  return (
    <span
      aria-label="Сертификат об обучении проверен Tattoo HUB"
      title="Сертификат об обучении проверен Tattoo HUB"
      className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-500"
    >
      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
      <span>Сертификат проверен</span>
    </span>
  )
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
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
