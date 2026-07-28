import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Phone, Mail, FileText, Plus, MessageCircle, PlayCircle, Trash2, Edit3, CheckCircle, Share2 } from 'lucide-react'
import { CRMClient } from './ClientsDatabase'
import { CRMSession } from './CRMBoard'
import { ChatModal } from './ChatModal'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { SessionModal } from './SessionModal'
import { CompleteSessionModal } from './CompleteSessionModal'
import { LiabilityWaiverModal } from './LiabilityWaiverModal'
import { PhoneInput } from './PhoneInput'

interface ClientDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  client: CRMClient
  onUpdate: () => void
  chatId: string | null
  onSessionClick?: (session: any) => void
}

export function ClientDetailsModal({ isOpen, onClose, client, onUpdate, chatId: initialChatId, onSessionClick }: ClientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'info'|'sessions'|'chat'>('info')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [phone, setPhone] = useState(client.phone || '')
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(initialChatId)
  const [sharing, setSharing] = useState(false)

  const handleShareToMarketplace = async () => {
    if (!confirm('Выставить клиента на общий маркетплейс? Другие мастера смогут предложить ему свои услуги. Когда один из мастеров подтвердит сеанс с этим клиентом, вы получите 50% от комиссии платформы на свой баланс!')) return
    setSharing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/clients/${client.id}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Не удалось выставить клиента на маркетплейс')
      }
      toast.success('Клиент успешно выставлен на маркетплейс!')
      onUpdate()
    } catch (err: any) {
      toast.error(err.message || 'Ошибка размещения на маркетплейсе')
    } finally {
      setSharing(false)
    }
  }

  useEffect(() => {
    setResolvedChatId(initialChatId)
    
    // If we don't have a chat ID but we have a lead ID, try to fetch it
    if (!initialChatId && client.lead_id) {
      const fetchChatId = async () => {
        const { data } = await supabase
          .from('lead_chats')
          .select('id')
          .eq('lead_id', client.lead_id)
          .single()
        
        if (data?.id) {
          setResolvedChatId(data.id)
        }
      }
      fetchChatId()
    }
  }, [initialChatId, client.lead_id])
  
  useEffect(() => {
    if (isOpen) {
      setPhone(client.phone || '')
    }
  }, [isOpen, client.phone])

  useEffect(() => {
    if (phone !== (client.phone || '') && !client.id.startsWith('temp-')) {
      const timer = setTimeout(async () => {
         await supabase.from('master_clients').update({phone}).eq('id', client.id)
         onUpdate()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [phone, client.phone, client.id, onUpdate])
  
  const [sessionToComplete, setSessionToComplete] = useState<string | null>(null)
  const [sessionToStart, setSessionToStart] = useState<string | null>(null)
  const [sessionToEdit, setSessionToEdit] = useState<any | null>(null)

  if (!isOpen) return null

  const handleDeleteClient = async () => {
    if (!confirm('Вы уверены, что хотите удалить этого клиента?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/clients/${client.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      toast.success('Клиент удален')
      onUpdate()
      onClose()
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот сеанс?')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/crm/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error()
      toast.success('Сеанс удален')
      onUpdate()
    } catch {
      toast.error('Ошибка удаления сеанса')
    }
  }

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Карточка клиента</h2>
            <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-xl transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="flex border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <button 
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              Информация
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              Сеансы
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chat' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              Чат
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Имя клиента</label>
                      {(!client.lead_id && client.source === 'manual') ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          Добавлен вручную
                        </span>
                      ) : (client.source === 'direct' || client.leads?.is_personal) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          По личной ссылке
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          С маркетплейса
                        </span>
                      )}
                    </div>
                    <input 
                      defaultValue={client.name}
                      readOnly={client.id.startsWith('temp-')}
                      onBlur={async (e) => {
                         if (client.id.startsWith('temp-')) return;
                         if (e.target.value.trim() && e.target.value !== client.name) {
                           await supabase.from('master_clients').update({name: e.target.value.trim()}).eq('id', client.id)
                           onUpdate()
                           toast.success('Имя сохранено')
                         }
                      }}
                      className="mt-1 block text-lg font-bold text-neutral-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:border-primary-500 outline-none w-full transition-colors pb-1 disabled:opacity-70 read-only:opacity-70"
                    />
                  </div>
                  {!client.id.startsWith('temp-') && (
                  <button 
                    onClick={handleDeleteClient}
                    className="flex items-center gap-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Удалить
                  </button>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1"><Phone className="w-3 h-3"/> Контакты</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Телефон</span>
                      <div className="mt-1">
                        <PhoneInput 
                          value={phone}
                          onChange={(val) => setPhone(val)}
                          placeholder="+420..."
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Telegram</span>
                      <input 
                        defaultValue={client.telegram || ''}
                        readOnly={client.id.startsWith('temp-')}
                        placeholder="@username"
                        onBlur={async (e) => {
                           if (client.id.startsWith('temp-')) return;
                           if (e.target.value !== (client.telegram || '')) {
                             await supabase.from('master_clients').update({telegram: e.target.value}).eq('id', client.id)
                             onUpdate()
                           }
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none mt-1 disabled:opacity-70 read-only:opacity-70"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Instagram</span>
                      <input 
                        defaultValue={client.instagram || ''}
                        readOnly={client.id.startsWith('temp-')}
                        placeholder="@username"
                        onBlur={async (e) => {
                           if (client.id.startsWith('temp-')) return;
                           if (e.target.value !== (client.instagram || '')) {
                             await supabase.from('master_clients').update({instagram: e.target.value}).eq('id', client.id)
                             onUpdate()
                           }
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none mt-1 disabled:opacity-70 read-only:opacity-70"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider ml-1">Email</span>
                      <input 
                        defaultValue={client.email || ''}
                        type="email"
                        readOnly={client.id.startsWith('temp-')}
                        placeholder="example@mail.com"
                        onBlur={async (e) => {
                           if (client.id.startsWith('temp-')) return;
                           if (e.target.value !== (client.email || '')) {
                             await supabase.from('master_clients').update({email: e.target.value}).eq('id', client.id)
                             onUpdate()
                           }
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none mt-1 disabled:opacity-70 read-only:opacity-70"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3 h-3"/> Заметки мастера</label>
                  <textarea 
                    defaultValue={client.notes || ''}
                    readOnly={client.id.startsWith('temp-')}
                    placeholder="Добавьте заметку об этом клиенте..."
                    className="mt-2 w-full p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-neutral-900 dark:text-white disabled:opacity-70 read-only:opacity-70"
                    rows={4}
                    onBlur={async (e) => {
                       if (client.id.startsWith('temp-')) return;
                       await supabase.from('master_clients').update({notes: e.target.value}).eq('id', client.id)
                       onUpdate()
                    }}
                  />
                </div>

                {!client.id.startsWith('temp-') && (
                  <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-accent-500/10 to-primary-500/10 border border-accent-500/20 dark:border-accent-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded-xl shrink-0 mt-0.5">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-neutral-900 dark:text-white text-sm">
                          {client.source === 'marketplace' ? 'Клиент на маркетплейсе' : 'Поделиться клиентом на маркетплейсе'}
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                          {client.source === 'marketplace'
                            ? 'Этот клиент доступен в общей ленте. Если другой мастер подтвердит с ним сеанс, вы получите 50% от комиссии платформы на свой внутренний счет.'
                            : 'Выставьте клиента в общую ленту лидов. Если другой мастер подтвердит с ним сеанс, вы получите 50% от комиссии платформы на свой баланс!'}
                        </p>
                      </div>
                    </div>
                    {client.source !== 'marketplace' && (
                      <button
                        type="button"
                        onClick={handleShareToMarketplace}
                        disabled={sharing}
                        className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-accent-600 hover:bg-accent-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Share2 className="w-4 h-4" />
                        {sharing ? 'Размещение...' : 'Выставить на маркетплейс'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-neutral-900 dark:text-white">Сеансы клиента</h3>
                  {!client.id.startsWith('temp-') && (
                  <button 
                    onClick={() => setIsSessionModalOpen(true)}
                    className="flex items-center gap-1 text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <Plus className="w-4 h-4"/> Добавить
                  </button>
                  )}
                </div>
                
                {client.master_sessions && client.master_sessions.length > 0 ? (
                  client.master_sessions.map(s => (
                    <div key={s.id} className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-2xl flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{new Date(s.session_date).toLocaleDateString()}</div>
                            <div className="text-sm text-neutral-500">{s.start_time || 'Время не указано'} - {s.end_time || ''}</div>
                            <div className="text-xs font-bold text-neutral-400 uppercase mt-1">{s.status === 'in_progress' ? 'В процессе' : s.status === 'completed' ? 'Завершен' : s.status === 'booked' ? 'Записан' : s.status}</div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2">
                          <div className="font-bold text-neutral-900 dark:text-white text-lg">{s.price ? `${s.price} Kč` : '—'}</div>
                          <div className="flex items-center gap-2">
                            {s.status === 'booked' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSessionToStart(s.id); }}
                                className="px-3 py-1.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold text-xs rounded-lg flex items-center gap-1"
                              >
                                <PlayCircle className="w-3 h-3" /> Начать
                              </button>
                            )}
                            {s.status === 'in_progress' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); setSessionToComplete(s.id); }}
                                className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold text-xs rounded-lg flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" /> Завершить
                              </button>
                            )}
                            <button onClick={(e) => {
                              e.stopPropagation();
                              if (onSessionClick) {
                                onSessionClick({ ...s, master_clients: { id: client.id, name: client.name } });
                              } else {
                                setSessionToEdit({ ...s, master_clients: { id: client.id, name: client.name } });
                              }
                            }} className="p-1.5 text-neutral-400 hover:text-primary-500 rounded-md">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {s.reference_images && s.reference_images.length > 0 && (
                        <div className="w-full flex gap-2 overflow-x-auto custom-scrollbar pb-1 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                          {s.reference_images.map((url: string, idx: number) => (
                            <Image key={`ref-${idx}`} src={url || ''} alt="ref" className="w-14 h-14 rounded-lg object-cover shrink-0 border border-neutral-200 dark:border-neutral-700"  width={56} height={56} />
                          ))}
                        </div>
                      )}
                      
                      {s.status === 'completed' && s.result_image_urls && s.result_image_urls.length > 0 && (
                        <div className="mt-2 bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />
                            <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Результат сеанса</span>
                          </div>
                          <div className="w-full flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                            {s.result_image_urls.map((url: string, idx: number) => (
                              <Image key={`res-${idx}`} src={url || ''} alt="result" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-green-200 dark:border-green-800"  width={64} height={64} />
                            ))}
                          </div>
                        </div>
                      )}
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
                <div className="w-16 h-16 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center">
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
                    className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-700 transition-colors"
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
        chatId={resolvedChatId}
        leadTitle={client.name}
      />
    )}

    {(isSessionModalOpen || sessionToEdit) && (
      <SessionModal
        isOpen={isSessionModalOpen || !!sessionToEdit}
        onClose={() => { setIsSessionModalOpen(false); setSessionToEdit(null); }}
        onSuccess={() => {
          setIsSessionModalOpen(false)
          setSessionToEdit(null)
          onUpdate()
        }}
        initialClientId={client.id}
        existingClients={[client]} // just pass this client
        editSession={sessionToEdit}
      />
    )}



    {sessionToStart && (
      <LiabilityWaiverModal
        isOpen={!!sessionToStart}
        onClose={() => setSessionToStart(null)}
        sessionId={sessionToStart}
        clientName={client.name}
        onSuccess={() => {
          setSessionToStart(null)
          onUpdate()
        }}
      />
    )}

    {sessionToComplete && (
      <CompleteSessionModal
        isOpen={!!sessionToComplete}
        onClose={() => setSessionToComplete(null)}
        sessionId={sessionToComplete}
        onSuccess={() => {
          setSessionToComplete(null)
          onUpdate()
        }}
      />
    )}
    </>
  )
}
