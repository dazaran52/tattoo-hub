import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BodyMapSelectorProps {
  value: string
  onChange: (val: string) => void
}

export function BodyMapSelector({ value, onChange }: BodyMapSelectorProps) {
  const [view, setView] = useState<'front' | 'back'>('front')

  // Helper to check if a body part is currently selected (fuzzy match for left/right)
  const isSelected = (partId: string) => value === partId

  const handlePartClick = (partId: string) => {
    onChange(partId)
  }

  // Front View Parts
  const frontParts = [
    { id: 'Голова/Лицо', d: "M 40 10 Q 50 0 60 10 L 58 25 Q 50 30 42 25 Z" },
    { id: 'Шея', d: "M 45 26 L 55 26 L 56 35 L 44 35 Z" },
    { id: 'Грудь', d: "M 30 38 Q 50 35 70 38 L 65 65 Q 50 68 35 65 Z" },
    { id: 'Живот', d: "M 35 68 Q 50 71 65 68 L 60 100 Q 50 105 40 100 Z" },
    { id: 'Плечо', d: "M 28 40 Q 20 40 18 55 L 22 75 L 32 75 Z", side: 'left' },
    { id: 'Плечо', d: "M 72 40 Q 80 40 82 55 L 78 75 L 68 75 Z", side: 'right' },
    { id: 'Предплечье', d: "M 22 78 L 31 78 L 29 105 L 18 105 Z", side: 'left' },
    { id: 'Предплечье', d: "M 78 78 L 69 78 L 71 105 L 82 105 Z", side: 'right' },
    { id: 'Кисть', d: "M 18 108 L 28 108 Q 28 120 23 120 Q 18 120 18 108 Z", side: 'left' },
    { id: 'Кисть', d: "M 82 108 L 72 108 Q 72 120 77 120 Q 82 120 82 108 Z", side: 'right' },
    { id: 'Бедро', d: "M 38 105 Q 45 105 49 105 L 47 150 L 35 150 Z", side: 'left' },
    { id: 'Бедро', d: "M 62 105 Q 55 105 51 105 L 53 150 L 65 150 Z", side: 'right' },
    { id: 'Голень', d: "M 36 153 L 46 153 L 44 195 L 38 195 Z", side: 'left' },
    { id: 'Голень', d: "M 64 153 L 54 153 L 56 195 L 62 195 Z", side: 'right' },
  ]

  // Back View Parts
  const backParts = [
    { id: 'Голова/Затылок', d: "M 40 10 Q 50 0 60 10 L 58 25 Q 50 30 42 25 Z" },
    { id: 'Шея', d: "M 45 26 L 55 26 L 56 35 L 44 35 Z" },
    { id: 'Спина', d: "M 30 38 Q 50 35 70 38 L 60 100 Q 50 105 40 100 Z" }, // Full back
    { id: 'Плечо', d: "M 28 40 Q 20 40 18 55 L 22 75 L 32 75 Z", side: 'left' },
    { id: 'Плечо', d: "M 72 40 Q 80 40 82 55 L 78 75 L 68 75 Z", side: 'right' },
    { id: 'Предплечье', d: "M 22 78 L 31 78 L 29 105 L 18 105 Z", side: 'left' },
    { id: 'Предплечье', d: "M 78 78 L 69 78 L 71 105 L 82 105 Z", side: 'right' },
    { id: 'Кисть', d: "M 18 108 L 28 108 Q 28 120 23 120 Q 18 120 18 108 Z", side: 'left' },
    { id: 'Кисть', d: "M 82 108 L 72 108 Q 72 120 77 120 Q 82 120 82 108 Z", side: 'right' },
    { id: 'Бедро (задняя часть)', d: "M 38 105 Q 45 105 49 105 L 47 150 L 35 150 Z", side: 'left' },
    { id: 'Бедро (задняя часть)', d: "M 62 105 Q 55 105 51 105 L 53 150 L 65 150 Z", side: 'right' },
    { id: 'Голень (икра)', d: "M 36 153 L 46 153 L 44 195 L 38 195 Z", side: 'left' },
    { id: 'Голень (икра)', d: "M 64 153 L 54 153 L 56 195 L 62 195 Z", side: 'right' },
  ]

  const activeParts = view === 'front' ? frontParts : backParts

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/40 dark:bg-neutral-900/40 border border-neutral-200 dark:border-white/10 rounded-2xl w-full">
      {/* View Toggle */}
      <div className="flex bg-neutral-200/50 dark:bg-neutral-800/50 p-1 rounded-xl mb-4 w-full max-w-[200px]">
        <button
          type="button"
          onClick={() => setView('front')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'front' ? 'bg-white dark:bg-neutral-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Спереди
        </button>
        <button
          type="button"
          onClick={() => setView('back')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${view === 'back' ? 'bg-white dark:bg-neutral-700 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
        >
          Сзади
        </button>
      </div>

      <div className="relative w-full max-w-[160px] aspect-[1/2.2] select-none">
        <AnimatePresence mode="wait">
          <motion.svg
            key={view}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
            viewBox="0 0 100 220"
            className="w-full h-full drop-shadow-md"
          >
            {/* Background base silhouette for padding */}
            <g opacity="0.05" className="fill-neutral-900 dark:fill-white pointer-events-none">
              {activeParts.map((part, i) => (
                <path key={`bg-${i}`} d={part.d} />
              ))}
            </g>

            {/* Clickable body parts */}
            <g>
              {activeParts.map((part, i) => {
                const active = isSelected(part.id)
                return (
                  <motion.path
                    key={`part-${i}`}
                    d={part.d}
                    onClick={() => handlePartClick(part.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                    className={`cursor-pointer transition-colors duration-300 ${
                      active 
                        ? 'fill-cyan-500 stroke-cyan-600 stroke-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' 
                        : 'fill-neutral-300/80 dark:fill-neutral-700/80 stroke-neutral-400 dark:stroke-neutral-600 stroke-1 hover:fill-cyan-400/50 dark:hover:fill-cyan-500/50'
                    }`}
                  />
                )
              })}
            </g>
          </motion.svg>
        </AnimatePresence>
      </div>

      {value && (
        <div className="mt-4 px-3 py-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-lg text-sm font-bold text-center">
          {value}
        </div>
      )}
    </div>
  )
}
