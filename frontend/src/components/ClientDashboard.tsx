'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/supabase'
import { PlusCircle, Heart, Clock, X } from 'lucide-react'
import { LeadForm } from '@/components/LeadForm'

export function ClientDashboard({ profile }: { profile: Profile }) {
  const [activeTab, setActiveTab] = useState<'leads' | 'favorites'>('leads')
  const [isFormOpen, setIsFormOpen] = useState(false)

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Кабинет клиента, {profile.email.split('@')[0]}
          </h2>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            Управляйте вашими заявками на татуировку
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'leads'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Мои заявки
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'favorites'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Heart className="w-4 h-4 inline-block mr-2" />
            Избранные мастера
          </button>
        </div>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="col-span-1 md:col-span-2 bg-neutral-100 dark:bg-neutral-900 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <PlusCircle className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">Создать новую заявку</h3>
            <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
              Опишите вашу идею, и мастера сами предложат вам эскизы и цены.
            </p>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors"
            >
              Заполнить бриф
            </button>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">В поиске мастера</span>
              <span className="text-xs text-neutral-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Вчера</span>
            </div>
            <h4 className="font-bold text-lg mb-2">Рукав в стиле Япония (Дракон)</h4>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4 line-clamp-2">
              Хочу забить всю правую руку, от плеча до запястья. Главный элемент - японский дракон...
            </p>
            <div className="flex justify-between items-center text-sm border-t border-neutral-100 dark:border-neutral-800 pt-4">
              <span className="text-neutral-500">Бюджет: <strong>до 20,000 CZK</strong></span>
              <span className="text-indigo-500 font-medium">3 отклика</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-neutral-500 mb-2">Пока нет избранных мастеров</h3>
          <p className="text-neutral-400">Сохраняйте профили лучших мастеров, чтобы не потерять.</p>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-neutral-50 dark:bg-neutral-950 rounded-3xl p-6 md:p-10 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
            <button 
              onClick={() => setIsFormOpen(false)}
              className="absolute top-6 right-6 z-50 p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full bg-neutral-200/50 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mt-4">
              <LeadForm />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
