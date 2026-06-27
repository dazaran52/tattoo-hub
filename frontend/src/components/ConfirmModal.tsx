import { AlertTriangle, Info, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  type?: 'danger' | 'info' | 'warning'
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Да',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
  type = 'info'
}: ConfirmModalProps) {
  if (!isOpen) return null

  const getThemeClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-500',
          btnBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500/50 text-white shadow-lg shadow-red-500/25',
          icon: <AlertTriangle className="w-10 h-10" />
        }
      case 'warning':
        return {
          iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-500',
          btnBg: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/50 text-white shadow-lg shadow-amber-500/25',
          icon: <AlertTriangle className="w-10 h-10" />
        }
      case 'info':
      default:
        return {
          iconBg: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-500',
          btnBg: 'bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-500/50 text-white shadow-lg shadow-cyan-500/25',
          icon: <Info className="w-10 h-10" />
        }
    }
  }

  const theme = getThemeClasses()

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 animate-slide-up relative">
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${theme.iconBg}`}>
            {theme.icon}
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3">
            {title}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8 whitespace-pre-wrap">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onCancel}
              className="w-full sm:flex-1 py-3.5 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-semibold rounded-xl transition-colors order-2 sm:order-1"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`w-full sm:flex-1 py-3.5 px-4 font-semibold rounded-xl transition-colors outline-none focus:ring-2 order-1 sm:order-2 ${theme.btnBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
