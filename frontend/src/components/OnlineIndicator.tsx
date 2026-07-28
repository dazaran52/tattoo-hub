'use client'

import React from 'react'
import { usePresence } from '@/components/PresenceContext'

interface OnlineIndicatorProps {
  userId?: string | null
  lastSeen?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function OnlineIndicator({ userId, lastSeen, className = '', size = 'md' }: OnlineIndicatorProps) {
  const { isOnline } = usePresence()
  const online = isOnline(userId, lastSeen)

  const sizeClasses = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3.5 h-3.5',
    lg: 'w-4.5 h-4.5',
  }

  return (
    <span
      className={`absolute block rounded-full border-2 border-white dark:border-gray-900 ${sizeClasses[size]} ${
        online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-400 opacity-60'
      } ${className || 'bottom-0 right-0'} transition-colors duration-300`}
      title={online ? 'В сети' : 'Не в сети'}
    />
  )
}
