'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают / Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      
      setSuccess('Пароль успешно обновлен! Перенаправляем... / Redirecting...')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-50 dark:bg-[#050505] transition-colors duration-300">
      <div className="w-full max-w-md bg-white/40 dark:bg-neutral-900/40 backdrop-blur-2xl border border-neutral-200/50 dark:border-white/5 shadow-2xl rounded-3xl overflow-hidden p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Новый пароль / New Password</h1>
          <p className="text-neutral-500 text-sm mt-2">Введите ваш новый пароль ниже.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-sm text-red-400 flex items-center gap-3 overflow-hidden mb-4"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 text-sm text-green-500 flex items-center gap-3 overflow-hidden mb-4"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-5">
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Новый пароль / New Password"
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-white/40 dark:bg-neutral-950/40 border border-neutral-200 dark:border-white/10 rounded-2xl text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                placeholder="Подтвердите пароль / Confirm Password"
              />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || !!success}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 text-white text-lg font-bold rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:shadow-[0_10px_40px_rgba(99,102,241,0.5)] border border-indigo-500/50 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Сохранить / Save'}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </form>
      </div>
    </div>
  )
}
