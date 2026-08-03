import React from 'react'
import { X, Calendar, Palette, Maximize2, MapPin, DollarSign, Clock } from 'lucide-react'

interface ClientLeadDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  lead: any
  onNavigateToCRM?: () => void
}

export function ClientLeadDetailsModal({ isOpen, onClose, lead, onNavigateToCRM }: ClientLeadDetailsModalProps) {
  if (!isOpen || !lead) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[2rem] p-6 shadow-2xl border border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black mb-6 text-neutral-900 dark:text-white">Детали заявки</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">Размер</p>
              <p className="font-semibold text-neutral-900 dark:text-white">{lead.size || 'Не указан'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">Стиль</p>
              <p className="font-semibold text-neutral-900 dark:text-white">{lead.style || 'Не указан'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">Место</p>
              <p className="font-semibold text-neutral-900 dark:text-white">{lead.body_place || 'Не указано'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">Бюджет</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {lead.is_negotiable_budget ? 'По договоренности' : `${lead.client_budget} ${lead.client_currency || 'CZK'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-bold uppercase">Статус</p>
              <p className="font-semibold text-neutral-900 dark:text-white">
                {['new', 'open', 'active'].includes(lead.status) ? 'В поиске мастера' : lead.status === 'accepted' ? 'В работе' : lead.status}
              </p>
            </div>
          </div>
        </div>

        {lead.description && (
          <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{lead.description}</p>
          </div>
        )}

        <div className="mt-8 flex gap-3">
          {onNavigateToCRM && (
            <button
              onClick={onNavigateToCRM}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors"
            >
              Перейти к управлению заявкой
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
