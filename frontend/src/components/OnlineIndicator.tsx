'use client'
import { useTranslations } from "next-intl";


import React from 'react'
import { usePresence } from '@/components/PresenceContext'

interface OnlineIndicatorProps {
  userId?: string | null
  lastSeen?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function OnlineIndicator({ userId, lastSeen, className = '', size = 'md' }: OnlineIndicatorProps) {
    const t = useTranslations();
  const { isOnline } = usePresence()
  const online = isOnline(userId, lastSeen)

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <span
      className={`absolute block rounded-full border-2 border-white dark:border-gray-900 ${sizeClasses[size]} ${
        online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-400 opacity-60'
      } ${className || 'bottom-0 right-0'} transition-colors duration-300`}
      title={online ? t('key_49baa6') : t('key_93cbea')}
    />
  )
}
