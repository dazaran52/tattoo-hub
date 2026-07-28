'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface PresenceContextType {
  onlineUserIds: Set<string>
  isOnline: (userId?: string | null, lastSeen?: string | null) => boolean
  ping: () => void
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  isOnline: () => false,
  ping: () => {},
})

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  const pingBackend = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile/ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
    } catch {
      // Ignore ping errors
    }
  }, [])

  useEffect(() => {
    let pingInterval: NodeJS.Timeout
    let channel: any = null

    const initPresence = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id || null

      channel = supabase.channel('global-online-presence', {
        config: {
          presence: {
            key: userId || `guest_${Math.random().toString(36).substring(2, 9)}`,
          },
        },
      })

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          const activeIds = new Set<string>()

          Object.keys(state).forEach((key) => {
            if (key && !key.startsWith('guest_')) {
              activeIds.add(key)
            }
            const presences = state[key] as any[]
            if (Array.isArray(presences)) {
              presences.forEach((p) => {
                if (p.user_id && !p.user_id.startsWith('guest_')) {
                  activeIds.add(p.user_id)
                }
              })
            }
          })

          setOnlineUserIds(activeIds)
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            if (userId) {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
              })

              void pingBackend()
              pingInterval = setInterval(pingBackend, 30 * 1000)
            }
          }
        })

      const handleUnload = () => {
        if (channel && userId) {
          void channel.untrack()
        }
      }
      window.addEventListener('beforeunload', handleUnload)

      return () => {
        window.removeEventListener('beforeunload', handleUnload)
      }
    }

    void initPresence()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id || null
      if (channel && userId) {
        void channel.track({ user_id: userId, online_at: new Date().toISOString() })
        void pingBackend()
      }
    })

    return () => {
      if (pingInterval) clearInterval(pingInterval)
      if (channel) {
        void channel.untrack()
        void supabase.removeChannel(channel)
      }
      subscription.unsubscribe()
    }
  }, [pingBackend])

  const isOnline = useCallback(
    (userId?: string | null, lastSeen?: string | null): boolean => {
      // 1. Check real-time WebSocket presence
      if (userId && onlineUserIds.has(userId)) {
        return true
      }

      // 2. Check lastSeen timestamp (online if active in last 45 seconds)
      if (lastSeen) {
        const lastSeenTime = new Date(lastSeen).getTime()
        if (!isNaN(lastSeenTime)) {
          const diffMs = new Date().getTime() - lastSeenTime
          if (diffMs >= 0 && diffMs < 45 * 1000) {
            return true
          }
        }
      }

      return false
    },
    [onlineUserIds]
  )

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isOnline, ping: pingBackend }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  return useContext(PresenceContext)
}
