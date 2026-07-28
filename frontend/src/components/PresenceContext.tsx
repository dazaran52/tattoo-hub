'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface PresenceContextType {
  onlineUserIds: Set<string>
  isOnline: (userId?: string | null, lastSeen?: string | null) => boolean
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  isOnline: () => false,
})

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

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

              const pingBackend = async () => {
                try {
                  const { data: { session: s } } = await supabase.auth.getSession()
                  if (!s) return
                  await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/profile/ping`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${s.access_token}` },
                  })
                } catch {
                  // Ignore ping errors
                }
              }

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
  }, [])

  const isOnline = useCallback(
    (userId?: string | null, lastSeen?: string | null): boolean => {
      if (userId) {
        if (onlineUserIds.has(userId)) {
          return true
        }
        if (onlineUserIds.size > 0) {
          return false
        }
      }

      if (!lastSeen) return false
      const diffMs = new Date().getTime() - new Date(lastSeen).getTime()
      return diffMs >= 0 && diffMs < 90 * 1000
    },
    [onlineUserIds]
  )

  return (
    <PresenceContext.Provider value={{ onlineUserIds, isOnline }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence() {
  return useContext(PresenceContext)
}
