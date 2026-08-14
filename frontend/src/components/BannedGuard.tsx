'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldAlert, LogOut, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export function BannedGuard({ children }: { children: React.ReactNode }) {
  const [isBanned, setIsBanned] = useState(false)
  const [banReason, setBanReason] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [appealText, setAppealText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [appealStatus, setAppealStatus] = useState<'none' | 'pending' | 'reviewed'>('none')
  const [appealAdminResponse, setAppealAdminResponse] = useState<string | null>(null)

  useEffect(() => {
    const checkBanStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setIsLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('users')
          .select('status, ban_reason')
          .eq('id', session.user.id)
          .single()

        if (error || !profile) {
          setIsLoading(false)
          return
        }

        if (profile.status === 'rejected') {
          setIsBanned(true)
          setBanReason(profile.ban_reason)
          
          // Check for existing appeals
          const { data: appeals } = await supabase
            .from('ban_appeals')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (appeals && appeals.length > 0) {
            setAppealStatus(appeals[0].status)
            setAppealAdminResponse(appeals[0].admin_response)
          }
        } else {
            setIsBanned(false)
        }
      } catch (err) {
        console.error('Error checking ban status:', err)
      } finally {
        setIsLoading(false)
      }
    }

    checkBanStatus()

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkBanStatus()
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const submitAppeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appealText.trim()) return

    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('ban_appeals')
        .insert({
          user_id: session.user.id,
          appeal_text: appealText.trim(),
          status: 'pending'
        })

      if (error) throw error

      toast.success('Апелляция отправлена')
      setAppealStatus('pending')
    } catch (err) {
      console.error(err)
      toast.error('Ошибка при отправке')
    } finally {
      setIsSubmitting(false)
    }
  }

  // We don't want to block loading of public pages unnecessarily, 
  // but if we don't know the state yet, we just render children.
  // Actually, wait, it's safer to just render children if not banned,
  // and if banned, overlay the ban screen. So we don't even need `isLoading` to block `children`.
  // Wait, if it's loading, we might flash the app before showing the ban screen. 
  // But if we block, the whole app flashes black for a split second. Let's not block on load, just overlay when banned.

  if (isBanned) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-red-500/20 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-500/10 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              Аккаунт заблокирован
            </h1>
            
            <p className="text-neutral-400 mb-6 leading-relaxed">
              Ваш доступ к платформе ограничен за нарушение правил использования сервиса.
              {banReason && (
                <span className="block mt-4 p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-red-200 text-left">
                  <strong className="text-red-400 block mb-1 uppercase tracking-wider text-xs font-bold">Причина:</strong>
                  {banReason}
                </span>
              )}
            </p>

            {appealStatus === 'none' ? (
              <form onSubmit={submitAppeal} className="w-full text-left bg-black/40 p-4 rounded-2xl border border-white/5 mb-6">
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Подать апелляцию
                </label>
                <textarea
                  value={appealText}
                  onChange={e => setAppealText(e.target.value)}
                  placeholder="Объясните ситуацию, если вы считаете блокировку ошибочной..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 resize-none h-24 mb-3 transition-all"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !appealText.trim()}
                  className="w-full py-3 bg-white text-black hover:bg-neutral-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Отправить на рассмотрение
                    </>
                  )}
                </button>
              </form>
            ) : appealStatus === 'pending' ? (
              <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-6">
                <h3 className="text-blue-400 font-bold mb-2">Апелляция рассматривается</h3>
                <p className="text-sm text-blue-200/70">Мы получили ваш запрос и ответим на него в ближайшее время. Ожидайте решения администрации.</p>
              </div>
            ) : (
              <div className="w-full bg-neutral-800/50 border border-neutral-700 rounded-2xl p-5 mb-6">
                <h3 className="text-neutral-300 font-bold mb-2">Апелляция рассмотрена</h3>
                <p className="text-sm text-neutral-400 mb-3">Статус: <span className="text-white capitalize">{appealStatus}</span></p>
                {appealAdminResponse && (
                  <div className="bg-black/40 p-3 rounded-lg border border-white/5 text-left">
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-1">Ответ:</p>
                    <p className="text-sm text-neutral-300">{appealAdminResponse}</p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
