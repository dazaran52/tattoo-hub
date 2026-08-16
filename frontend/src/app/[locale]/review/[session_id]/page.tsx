'use client'
import { useTranslations } from "next-intl";


import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Star, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ReviewPage() {
    const t = useTranslations();
  const params = useParams<{ session_id: string }>()
  const router = useRouter()
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError(t('Auto.text_7d3841'))
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t('Auto.text_b169f6'))
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/reviews/${params.session_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ rating, text })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || t('Auto.text_543246'))
      }

      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Auto.text_3e1161'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{t('Auto.text_333d99')}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-8">
            {t('Auto.text_2217e5')}
                              </p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-3 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            {t('Auto.text_3ddda6')}
                              </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 text-center">{t('Auto.text_c45fb0')}</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6 text-center text-sm">
          {t('Auto.text_1922bc')}
                          </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
              >
                <Star 
                  className={`w-10 h-10 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-neutral-300 dark:text-neutral-700 fill-current opacity-30'
                  }`} 
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold opacity-90 mb-2 dark:text-white">
              {t('Auto.text_99fa06')}
                                      </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('Auto.text_0c198b')}
              rows={4}
              className="w-full rounded-xl px-4 py-3 bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 resize-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-900/50">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 font-bold py-4 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 dark:border-black/30 border-t-white dark:border-t-black rounded-full animate-spin" />
            ) : (
              t('Auto.text_eaf992')
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
