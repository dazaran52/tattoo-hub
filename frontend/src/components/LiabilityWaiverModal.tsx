import { useTranslations } from "next-intl";
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Loader2, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface LiabilityWaiverModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  clientName: string
  onSuccess: () => void
}

export function LiabilityWaiverModal({ isOpen, onClose, sessionId, clientName, onSuccess }: LiabilityWaiverModalProps) {
    const t = useTranslations();
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')

  const handleSign = async () => {
    if (!agreed || !signature) {
      toast.error(t('Auto.text_0f2729'))
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}/waiver`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Failed to sign waiver')

      toast.success(t('Auto.text_99e653'))
      onSuccess()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error(t('Auto.text_a71d89'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">{t('Auto.text_6fbb51')}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto bg-neutral-50 dark:bg-neutral-900/50">
            <div className="prose dark:prose-invert prose-sm max-w-none text-neutral-600 dark:text-neutral-400">
              <p>{t('Auto.text_541658')} <strong>{clientName}</strong>{t('Auto.text_56789f')}</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>{t('Auto.text_5e5bde')}</li>
                <li>{t('Auto.text_94ba1d')}</li>
                <li>{t('Auto.text_307fe7')}</li>
                <li>{t('Auto.text_717bb1')}</li>
                <li>{t('Auto.text_964c19')}</li>
              </ul>
              <p className="mt-4 text-xs">
                {t('Auto.text_3ad74e')}
                                            </p>
            </div>
          </div>

          <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {t('Auto.text_98eaef')}
                                                  </span>
              </label>

              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                  {t('Auto.text_e3a73f')}
                                                  </label>
                <input
                  type="text"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder={t('Auto.text_6d7a4f')}
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                />
              </div>

              <button
                onClick={handleSign}
                disabled={loading || !agreed || !signature}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {t('Auto.text_4307aa')}
                                            </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
