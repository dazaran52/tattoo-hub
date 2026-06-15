import { useState } from 'react'
import { X, Wallet } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

interface WithdrawalModalProps {
  isOpen: boolean
  onClose: () => void
  withdrawableCredits: number
  onSuccess: () => void
}

export function WithdrawalModal({ isOpen, onClose, withdrawableCredits, onSuccess }: WithdrawalModalProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(withdrawableCredits)
  const [paymentDetails, setPaymentDetails] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0 || amount > withdrawableCredits) {
      toast.error('Некорректная сумма')
      return
    }
    
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/payments/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount,
          payment_details: paymentDetails
        })
      })
      
      if (!res.ok) {
        throw new Error('Ошибка создания заявки')
      }
      
      toast.success('Заявка на вывод успешно создана!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold">
            <Wallet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Вывод средств
          </div>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-cyan-50 dark:bg-cyan-900/20 p-3 rounded-lg border border-cyan-100 dark:border-cyan-900/50">
            <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mb-1">Доступно для вывода</p>
            <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-300">{withdrawableCredits} кредитов</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Сумма (кредиты)</label>
            <input
              type="number"
              min="1"
              max={withdrawableCredits}
              required
              className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Реквизиты</label>
            <textarea
              required
              className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
              placeholder="Номер карты, IBAN или крипто-кошелек USDT TRC20"
              rows={3}
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value)}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Создание заявки...' : 'Создать заявку на вывод'}
          </button>
        </form>
      </div>
    </div>
  )
}
