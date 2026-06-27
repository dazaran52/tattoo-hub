import { Coins, X } from 'lucide-react'
import Link from 'next/link'

interface LowBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  requiredAmount: number
  currency: string
}

export function LowBalanceModal({ isOpen, onClose, requiredAmount, currency }: LowBalanceModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 animate-slide-up relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coins className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
            Недостаточно средств
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            Для открытия этих контактов нужно <b>{requiredAmount} {currency}</b>.<br/>
            Пополните баланс, чтобы продолжить работу.
          </p>
          
          <div className="flex flex-col gap-3">
            <Link 
              href="/top-up"
              className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-cyan-500/25"
            >
              Пополнить баланс
            </Link>
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold rounded-xl transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
