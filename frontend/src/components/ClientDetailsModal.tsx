import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Phone, Mail, FileText, Plus, MessageCircle } from 'lucide-react'
import { CRMClient } from './CRMBoard'
import { ChatModal } from './ChatModal'
import { supabase } from '@/lib/supabase'

interface ClientDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  client: CRMClient
  onUpdate: () => void
  chatId: string | null
}

export function ClientDetailsModal({ isOpen, onClose, client, onUpdate, chatId }: ClientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info'|'sessions'|'chat'>('info')
  const [isChatOpen, setIsChatOpen] = useState(false)
  
  if (!isOpen) return null

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Карточка клиента</h2>
            <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="flex border-b border-neutral-100 dark:border-neutral-800">
            <button 
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              Информация
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              Сеансы
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              Чат
            </button>
          </div>

          <div className="p-6 h-[50vh] overflow-y-auto">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Имя клиента</label>
                  <div className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{client.name}</div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1"><Phone className="w-3 h-3"/> Контакты</label>
                  <div className="mt-1 text-neutral-700 dark:text-neutral-300">
                    {client.contact_info || 'Не указаны'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Запрос (с маркетплейса)</label>
                  <div className="mt-1 text-neutral-700 dark:text-neutral-300">
                    {client.leads?.title || 'Запрос не привязан к маркетплейсу'}
                  </div>
                  {client.leads?.description && (
                    <p className="text-sm mt-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                      {client.leads.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3"/> Заметки мастера</label>
                  <textarea 
                    defaultValue={client.notes || ''}
                    placeholder="Добавьте заметку об этом клиенте..."
                    className="mt-2 w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-neutral-900 dark:text-white"
                    rows={4}
                    onBlur={async (e) => {
                       // Silently save
                       await supabase.table('master_clients').update({notes: e.target.value}).eq('id', client.id)
                       onUpdate()
                    }}
                  />
                </div>
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-neutral-900 dark:text-white">Сеансы клиента</h3>
                  <button className="flex items-center gap-1 text-sm font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors">
                    <Plus className="w-4 h-4"/> Добавить
                  </button>
                </div>
                
                {client.master_sessions && client.master_sessions.length > 0 ? (
                  client.master_sessions.map(s => (
                    <div key={s.id} className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white">{new Date(s.session_date).toLocaleDateString()}</div>
                          <div className="text-sm text-neutral-500">{s.start_time || 'Время не указано'} - {s.end_time || ''}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-neutral-900 dark:text-white">{s.price ? `€${s.price}` : '—'}</div>
                        <div className="text-xs text-neutral-500 uppercase">{s.status}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    У этого клиента еще нет сеансов
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl flex items-center justify-center">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 dark:text-white text-lg">Чат с клиентом</h3>
                  <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-2">
                    {client.lead_id ? 'Откройте чат, чтобы обсудить детали татуировки.' : 'Для клиентов, добавленных вручную, внутренний чат недоступен.'}
                  </p>
                </div>
                {client.lead_id && (
                  <button 
                    onClick={() => setIsChatOpen(true)}
                    className="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-500/30 hover:bg-violet-700 transition-colors"
                  >
                    Открыть чат
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
    
    {isChatOpen && client.lead_id && (
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatId={chatId}
        leadTitle={client.name}
      />
    )}
    </>
  )
}
