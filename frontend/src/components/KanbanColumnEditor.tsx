import React, { useState } from 'react'
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react'
import { KanbanColumn } from './CRMBoard'
import * as Icons from 'lucide-react'

interface Props {
  columns: KanbanColumn[]
  onSave: (cols: KanbanColumn[]) => void
  onCancel: () => void
}

const AVAILABLE_COLORS = [
  { value: 'emerald', label: 'Изумрудный' },
  { value: 'violet', label: 'Фиолетовый' },
  { value: 'blue', label: 'Синий' },
  { value: 'yellow', label: 'Желтый' },
  { value: 'green', label: 'Зеленый' },
  { value: 'red', label: 'Красный' },
  { value: 'pink', label: 'Розовый' },
  { value: 'orange', label: 'Оранжевый' },
  { value: 'cyan', label: 'Бирюзовый' },
  { value: 'slate', label: 'Серый' }
]

const AVAILABLE_ICONS = [
  { value: 'UserPlus', label: 'Добавление' },
  { value: 'MessageCircle', label: 'Диалог' },
  { value: 'Calendar', label: 'Календарь' },
  { value: 'PlayCircle', label: 'В процессе' },
  { value: 'CheckCircle', label: 'Готово' },
  { value: 'Flag', label: 'Флаг' },
  { value: 'Clock', label: 'Ожидание' },
  { value: 'Star', label: 'Звезда' },
  { value: 'Heart', label: 'Сердце' },
  { value: 'Zap', label: 'Молния' }
]

export function KanbanColumnEditor({ columns, onSave, onCancel }: Props) {
  const [cols, setCols] = useState<KanbanColumn[]>(columns)

  const handleAdd = () => {
    setCols([...cols, {
      id: `custom_${Date.now()}`,
      title: 'Новая колонка',
      iconName: 'Star',
      color: 'slate'
    }])
  }

  const handleRemove = (id: string) => {
    if (id === 'new' || id === 'cancelled') {
      alert("Эти системные колонки нельзя удалить.")
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
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Настройка колонок</h3>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors">
            Отмена
          </button>
          <button onClick={() => onSave(cols)} className="px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors flex items-center gap-2 shadow-md hover:shadow-lg">
            <Check className="w-4 h-4" />
            Сохранить
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {cols.map((c, index) => {
          const Icon = (Icons as any)[c.iconName] || Icons.Star
          const isSystem = c.id === 'new' || c.id === 'cancelled'
          return (
            <div key={c.id} className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/50">
              <div className="flex flex-col gap-1">
                <button onClick={() => moveUp(index)} disabled={index === 0} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30">
                  <GripVertical className="w-4 h-4" />
                </button>
                <button onClick={() => moveDown(index)} disabled={index === cols.length - 1} className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30">
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>
              
              <div className={`p-2 rounded-lg bg-${c.color}-100 dark:bg-${c.color}-900/30 text-${c.color}-700 dark:text-${c.color}-400`}>
                <Icon className="w-5 h-5" />
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={c.title}
                  onChange={(e) => updateCol(c.id, { title: e.target.value })}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="Название колонки"
                />
                
                <div className="relative">
                  <select
                    value={c.iconName}
                    onChange={(e) => updateCol(c.id, { iconName: e.target.value })}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none appearance-none cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                  >
                    {AVAILABLE_ICONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <Icons.ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                <div className="relative">
                  <select
                    value={c.color}
                    onChange={(e) => updateCol(c.id, { color: e.target.value })}
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none appearance-none cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
                  >
                    {AVAILABLE_COLORS.map(color => <option key={color.value} value={color.value}>{color.label}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                    <Icons.ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {!isSystem && (
                <button
                  onClick={() => handleRemove(c.id)}
                  className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={handleAdd}
        className="w-full py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-violet-500 hover:text-violet-500 dark:hover:border-violet-500 dark:hover:text-violet-400 text-neutral-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
      >
        <Plus className="w-5 h-5" />
        Добавить колонку
      </button>
    </div>
  )
}
