import { useTranslations } from "next-intl";
import React, { useState } from 'react'
import { Plus, Trash2, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { KanbanColumn } from './CRMBoard'
import * as Icons from 'lucide-react'

interface Props {
  columns: KanbanColumn[]
  onSave: (cols: KanbanColumn[]) => void
  onCancel: () => void
}

export function KanbanColumnEditor({ columns, onSave, onCancel }: Props) {
    const t = useTranslations();
    
const AVAILABLE_COLORS = [
  { value: 'emerald', hex: '#10b981', label: t('emerald') },
  { value: 'violet', hex: '#8b5cf6', label: t('violet') },
  { value: 'blue', hex: '#3b82f6', label: t('blue') },
  { value: 'yellow', hex: '#eab308', label: t('yellow') },
  { value: 'green', hex: '#22c55e', label: t('green') },
  { value: 'red', hex: '#ef4444', label: t('red') },
  { value: 'pink', hex: '#ec4899', label: t('pink') },
  { value: 'orange', hex: '#f97316', label: t('orange') },
  { value: 'cyan', hex: '#06b6d4', label: t('turquoise') },
  { value: 'slate', hex: '#64748b', label: t('grey') }
]

const AVAILABLE_ICONS = [
  { value: 'UserPlus', label: t('addition') },
  { value: 'MessageCircle', label: t('dialogue') },
  { value: 'Calendar', label: t('crmBoard.viewCalendar') },
  { value: 'PlayCircle', label: t('crmBoard.columns.in_progress') },
  { value: 'CheckCircle', label: t('ready') },
  { value: 'Flag', label: t('flag') },
  { value: 'Clock', label: t('expectation') },
  { value: 'Star', label: t('star') },
  { value: 'Heart', label: t('heart') },
  { value: 'Zap', label: t('lightning') }
]

  const [cols, setCols] = useState<KanbanColumn[]>(columns)

  const handleAdd = () => {
    setCols([...cols, {
      id: `custom_${Date.now()}`,
      title: t('newColumn'),
      iconName: 'Star',
      color: 'slate'
    }])
  }

  const handleRemove = (id: string) => {
    if (id === 'new' || id === 'cancelled') {
      alert(t('theseSystemSpeakersCannot'))
      return
    }
    setCols(cols.filter(c => c.id !== id))
  }

  const updateCol = (id: string, updates: Partial<KanbanColumn>) => {
    setCols(cols.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newCols = [...cols]
    const temp = newCols[index]
    newCols[index] = newCols[index - 1]
    newCols[index - 1] = temp
    setCols(newCols)
  }

  const moveDown = (index: number) => {
    if (index === cols.length - 1) return
    const newCols = [...cols]
    const temp = newCols[index]
    newCols[index] = newCols[index + 1]
    newCols[index + 1] = temp
    setCols(newCols)
  }

  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-neutral-200 dark:border-white/10 rounded-3xl p-4 sm:p-8 shadow-xl max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-neutral-100 dark:border-white/5">
        <h3 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{t('speakerSetup')}</h3>
        <div className="flex gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-700 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-xl transition-colors">
            {t('cancel')}
                                </button>
          <button onClick={() => onSave(cols)} className="px-5 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {t('save')}
                                </button>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {cols.map((c, index) => {
          const SelectedIcon = (Icons as any)[c.iconName] || Icons.Star
          const isSystem = c.id === 'new' || c.id === 'cancelled'
          
          return (
            <div key={c.id} className="relative group bg-neutral-50/50 dark:bg-white/[0.02] border border-neutral-200/50 dark:border-white/5 rounded-2xl p-6 transition-all hover:border-primary-500/30 hover:shadow-md">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
                <button onClick={() => moveUp(index)} disabled={index === 0} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-white dark:hover:bg-neutral-800 dark:hover:text-white shadow-sm opacity-50 hover:opacity-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all">
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button onClick={() => moveDown(index)} disabled={index === cols.length - 1} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-white dark:hover:bg-neutral-800 dark:hover:text-white shadow-sm opacity-50 hover:opacity-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="pr-14 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-${c.color}-100 dark:bg-${c.color}-500/20 text-${c.color}-600 dark:text-${c.color}-400 shadow-inner`}>
                    <SelectedIcon className="w-6 h-6" />
                  </div>
                  <input
                    type="text"
                    value={c.title}
                    onChange={(e) => updateCol(c.id, { title: e.target.value })}
                    className="flex-1 bg-white dark:bg-[#111] border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-3 text-base font-bold outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:font-normal"
                    placeholder={t('columnTitle')}
                  />
                  {!isSystem && (
                    <button
                      onClick={() => handleRemove(c.id)}
                      title={t('deleteColumn')}
                      className="p-3 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors ml-2"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 block">{t('icon')}</span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ICONS.map(i => {
                        const IconComponent = (Icons as any)[i.value]
                        const isSelected = c.iconName === i.value
                        return (
                          <button
                            key={i.value}
                            onClick={() => updateCol(c.id, { iconName: i.value })}
                            title={i.label}
                            className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md scale-110' : 'bg-white dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500'}`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3 block">{t('color')}</span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_COLORS.map(color => {
                        const isSelected = c.color === color.value
                        return (
                          <button
                            key={color.value}
                            onClick={() => updateCol(c.id, { color: color.value })}
                            title={color.label}
                            style={{ backgroundColor: color.hex }}
                            className={`w-9 h-9 rounded-full transition-all relative ${isSelected ? 'ring-2 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-neutral-900 ring-primary-500 scale-110' : 'opacity-80 hover:opacity-100 hover:scale-110'}`}
                          >
                            {isSelected && (
                              <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-md" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleAdd}
        className="w-full py-4 border-2 border-dashed border-neutral-300 dark:border-white/10 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/10 text-neutral-500 dark:text-neutral-400 dark:hover:text-primary-300 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-sm"
      >
        <Plus className="w-5 h-5" />
        {t('addAColumn')}
                    </button>
    </div>
  )
}
