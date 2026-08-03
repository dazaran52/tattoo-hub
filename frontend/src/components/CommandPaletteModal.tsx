import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, LayoutDashboard, ShoppingBag, ImageIcon, MessageCircle, User, Calendar, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommandPaletteModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTab: (tab: 'crm' | 'feed' | 'portfolio' | 'messages') => void
}

export function CommandPaletteModal({ isOpen, onClose, onSelectTab }: CommandPaletteModalProps) {
  const [query, setQuery] = useState('')
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else setQuery('')
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const actions = [
    { id: 'crm', label: 'Открыть CRM Доску', icon: LayoutDashboard, category: 'Навигация', action: () => { onSelectTab('crm'); onClose(); } },
    { id: 'feed', label: 'Открыть Маркетплейс Заявок', icon: ShoppingBag, category: 'Навигация', action: () => { onSelectTab('feed'); onClose(); } },
    { id: 'portfolio', label: 'Открыть Портфолио', icon: ImageIcon, category: 'Навигация', action: () => { onSelectTab('portfolio'); onClose(); } },
    { id: 'messages', label: 'Открыть Сообщения & Чат', icon: MessageCircle, category: 'Навигация', action: () => { onSelectTab('messages'); onClose(); } },
    { id: 'profile', label: 'Перейти в Мой Профиль', icon: User, category: 'Настройки', action: () => { router.push('/profile'); onClose(); } },
    { id: 'topup', label: 'Пополнить Баланс', icon: Calendar, category: 'Финансы', action: () => { router.push('/top-up'); onClose(); } },
  ]

  const filteredActions = query
    ? actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()) || a.category.toLowerCase().includes(query.toLowerCase()))
    : actions

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[160] flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-md"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="glass-card w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-white/20"
        >
          {/* Input Header */}
          <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
            <Search className="w-5 h-5 text-primary-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Поиск по разделам, командам и действиям... (Esc для закрытия)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-white placeholder-neutral-400 text-sm outline-none font-medium"
            />
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action List */}
          <div className="p-2 max-h-80 overflow-y-auto space-y-1">
            {filteredActions.length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-sm">Ничего не найдено</div>
            ) : (
              filteredActions.map((act) => {
                const Icon = act.icon
                return (
                  <button
                    key={act.id}
                    onClick={act.action}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary-400 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-semibold text-sm text-neutral-200 group-hover:text-white transition-colors">
                        {act.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      {act.category}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
