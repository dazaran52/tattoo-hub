import { useTranslations } from "next-intl";
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2, DollarSign, ShieldCheck, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

interface B2bSellModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string
  sessionTitle?: string
  clientName?: string
  onSuccess: () => void
}

export function B2bSellModal({ isOpen, onClose, leadId, sessionTitle, clientName, onSuccess }: B2bSellModalProps) {
    const t = useTranslations();
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirmSell = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        toast.error(t('authorizationError'))
        return
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/master/${leadId}/sell_b2b`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ price_credits: 0 })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || t('failedToSubmitApplication'))
      }

      toast.success(t('theApplicationHasBeen'))
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || t('errorTransferringToMarketplace'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-white/10 p-6 relative flex flex-col gap-5"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{t('submitALeadTo')}</h3>
              <p className="text-xs text-neutral-500">{clientName ? `Клиент: ${clientName}` : sessionTitle || t('b2b')}</p>
            </div>
          </div>

          <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-white/5 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-neutral-700 dark:text-neutral-300">
                {t('theApplicationWillAppear')}
                                            </p>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-neutral-700 dark:text-neutral-300">
                {t('whenAnotherMasterTakes')} <strong className="text-primary-600 dark:text-primary-400">{t('80')}</strong> {t('toYourBalance')}
                                            </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl transition-colors"
            >
              {t('cancel')}
                                      </button>
            <button
              onClick={handleConfirmSell}
              disabled={loading}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('expose')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
