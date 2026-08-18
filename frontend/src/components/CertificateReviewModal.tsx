'use client'
import { useTranslations } from "next-intl";


import { useEffect, useState } from 'react'
import { CheckCircle2, ExternalLink, FileCheck2, Loader2, X, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export interface CertificateReviewUser {
  id: string
  email: string
  display_name?: string
  certificate_url?: string
  certificate_status?: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  certificate_submitted_at?: string
  certificate_rejection_reason?: string
}

interface CertificateReviewModalProps {
  user: CertificateReviewUser | null
  onClose: () => void
  onReviewed: (userId: string, status: 'approved' | 'rejected', reason?: string) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function CertificateReviewModal({ user, onClose, onReviewed }: CertificateReviewModalProps) {
    const t = useTranslations();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)

  useEffect(() => {
    setPreviewUrl(null)
    setReason(user?.certificate_rejection_reason || '')
    if (!user?.certificate_url) return

    let cancelled = false
    const loadPreview = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error(t('key_01ed67'))
        const response = await fetch(`${API_URL}/api/admin/users/${user.id}/certificate-url`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.detail || t('key_257aa4'))
        if (!cancelled) setPreviewUrl(data.url)
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : t('key_e0e3af'))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void loadPreview()
    return () => { cancelled = true }
  }, [user])

  if (!user) return null

  const submitReview = async (status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !reason.trim()) {
      toast.error(t('key_7e131f'))
      return
    }
    setIsReviewing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error(t('key_01ed67'))
      const response = await fetch(`${API_URL}/api/admin/users/${user.id}/certificate-review`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reason: status === 'rejected' ? reason.trim() : null }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || t('key_6abaf4'))
      onReviewed(user.id, status, data.certificate_rejection_reason)
      toast.success(status === 'approved' ? t('key_bdc167') : t('key_362df2'))
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('key_2ab0af'))
    } finally {
      setIsReviewing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="certificate-review-title" className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="certificate-review-title" className="flex items-center gap-2 text-xl font-black">
              <FileCheck2 className="h-5 w-5 text-primary-500" />
              {t('key_f851e8')}
                                      </h2>
            <p className="mt-1 text-sm text-neutral-500">{user.display_name || user.email}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('key_dd9463')} className="rounded-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex min-h-48 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-black/30">
          {isLoading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
          ) : previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-bold text-white hover:bg-primary-700">
              {t('key_718e05')}
                                            <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <p className="text-sm text-neutral-500">{t('key_a62100')}</p>
          )}
        </div>

        <label className="mt-5 block text-sm font-bold text-neutral-700 dark:text-neutral-300">
          {t('key_5dd299')}
                            <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder={t('key_b72ebf')}
            className="mt-2 w-full resize-none rounded-2xl border border-neutral-200 bg-white px-4 py-3 font-normal outline-none focus:border-primary-500 dark:border-neutral-700 dark:bg-neutral-950"
          />
        </label>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" disabled={isReviewing || !previewUrl} onClick={() => submitReview('rejected')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 font-bold text-red-600 hover:bg-red-500/10 disabled:opacity-40">
            <XCircle className="h-5 w-5" />
            {t('key_8b0d89')}
                                </button>
          <button type="button" disabled={isReviewing || !previewUrl} onClick={() => submitReview('approved')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
            {isReviewing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {t('confirmBtn')}
                                </button>
        </div>
      </div>
    </div>
  )
}
