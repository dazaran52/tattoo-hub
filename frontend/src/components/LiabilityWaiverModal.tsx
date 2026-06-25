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
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')

  const handleSign = async () => {
    if (!agreed || !signature) {
      toast.error('Пожалуйста, поставьте галочку и введите имя для подписи')
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

      toast.success('Согласие подписано! Сеанс начат.')
      onSuccess()
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Ошибка при подписании согласия')
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
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-violet-100 dark:bg-violet-900/30 p-2 rounded-xl text-violet-600 dark:text-violet-400">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Информационное согласие</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto bg-neutral-50 dark:bg-neutral-900/50">
            <div className="prose dark:prose-invert prose-sm max-w-none text-neutral-600 dark:text-neutral-400">
              <p>Я, <strong>{clientName}</strong>, настоящим подтверждаю следующее:</p>
              <ul className="list-disc pl-5 space-y-2 mt-4">
                <li>Мне исполнилось 18 лет, и я имею право самостоятельно принимать решения о проведении процедуры нанесения татуировки.</li>
                <li>Я не нахожусь под воздействием алкоголя, наркотических или иных средств, снижающих концентрацию внимания.</li>
                <li>Я не страдаю заболеваниями (гепатит, ВИЧ, диабет, эпилепсия, гемофилия и др.), которые могут вызвать осложнения в процессе или после процедуры.</li>
                <li>Я подтверждаю, что ознакомлен(а) с правилами ухода за татуировкой и обязуюсь их соблюдать.</li>
                <li>Я понимаю, что результат заживления во многом зависит от правильного ухода и индивидуальных особенностей организма, и освобождаю мастера от ответственности за возможные аллергические реакции или процесс заживления.</li>
              </ul>
              <p className="mt-4 text-xs">
                * Подписывая данное соглашение электронно, клиент берет на себя полную ответственность за предоставленную информацию.
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
                  className="w-5 h-5 mt-0.5 rounded border-neutral-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Я внимательно прочитал(а) текст согласия и подтверждаю все вышеперечисленное.
                </span>
              </label>

              <div>
                <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                  Введите ваше полное имя (цифровая подпись)
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder="Иванов Иван Иванович"
                  className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
                />
              </div>

              <button
                onClick={handleSign}
                disabled={loading || !agreed || !signature}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                Подписать и Начать Сеанс
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
