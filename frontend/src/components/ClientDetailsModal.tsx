import Image from 'next/image'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Calendar, Phone, Mail, FileText, Plus, MessageCircle, PlayCircle, 
  Trash2, Edit3, CheckCircle, Share2, Lock, Palette, MapPin, DollarSign, 
  PersonStanding, Maximize2, Send, ExternalLink, ShieldAlert, Sparkles 
} from 'lucide-react'
import { CRMClient } from './ClientsDatabase'
import { ChatModal } from './ChatModal'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { SessionModal } from './SessionModal'
import { CompleteSessionModal } from './CompleteSessionModal'
import { LiabilityWaiverModal } from './LiabilityWaiverModal'
import { PhoneInput } from './PhoneInput'
import { B2bSellModal } from './B2bSellModal'

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
  
  // B2B Sell Modal State
  const [b2bSellData, setB2bSellData] = useState<{ leadId: string; sessionTitle?: string; clientName?: string } | null>(null)

  const lead: any = client.leads || {}
  const isPersonal = client.source === 'manual' || client.source === 'direct' || Boolean(lead.is_personal) || !client.lead_id
  const isUnlocked = isPersonal || Boolean((client as any).is_unlocked) || ['accepted', 'in_progress', 'completed', 'discussing', 'booked'].includes(client.kanban_status || '')
  const isMarketplaceSold = client.kanban_status === 'marketplace'

  useEffect(() => {
    setResolvedChatId(initialChatId)
    
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
    if (isUnlocked && phone !== (client.phone || '') && !client.id.startsWith('temp-')) {
      const timer = setTimeout(async () => {
         await supabase.from('master_clients').update({phone}).eq('id', client.id)
         onUpdate()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [phone, client.phone, client.id, isUnlocked, onUpdate])
  
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

  // Parse description for budget / city fallbacks
  const rawDescription = client.notes || lead.description || ''
  const parsedBudgetMatch = rawDescription.match(/Бюджет:\s*([\s\S]*?)(?=(?:Желаемое время|Бюджет|Город):|$)/i)
  const parsedCityMatch = rawDescription.match(/Город:\s*([\s\S]*?)(?=(?:Желаемое время|Бюджет|Город):|$)/i)

  const budgetText = lead.display_budget || (lead.client_budget ? `${lead.client_budget} ${lead.client_currency || ''}` : (lead.is_negotiable_budget ? 'Договорная цена' : (parsedBudgetMatch ? parsedBudgetMatch[1] : null)))
  const cityText = lead.city_name || lead.cities?.name_ru || (parsedCityMatch ? parsedCityMatch[1] : null)
  const styleText = lead.style || (lead.title && lead.title !== 'Новая заявка на татуировку' ? lead.title : null)

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-neutral-200 dark:border-white/10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-lg">
                {client.name ? client.name.charAt(0).toUpperCase() : 'K'}
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <span>{client.name}</span>
                </h2>
                <div className="flex items-center gap-2">
                  {isPersonal ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      Личная заявка (/book)
                    </span>
                  ) : isUnlocked ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      С маркетплейса (Контакты открыты)
                    </span>
                  ) : isMarketplaceSold ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Выставлен на маркетплейс
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> С маркетплейса (Закрыт)
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50/30 dark:bg-neutral-900/30">
            <button 
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'info' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <FileText className="w-4 h-4" />
              <span>Информация</span>
            </button>
            <button 
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'sessions' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <Calendar className="w-4 h-4" />
              <span>Сеансы ({client.master_sessions?.length || 0})</span>
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Чат</span>
              {!isUnlocked && <Lock className="w-3 h-3 text-purple-500" />}
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {activeTab === 'info' && (
              <div className="space-y-6">
                {/* Client Name Header */}
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-4">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Имя клиента</label>
                    <input 
                      defaultValue={client.name}
                      readOnly={client.id.startsWith('temp-') || !isUnlocked}
                      onBlur={async (e) => {
                         if (client.id.startsWith('temp-') || !isUnlocked) return;
                         if (e.target.value.trim() && e.target.value !== client.name) {
                           await supabase.from('master_clients').update({name: e.target.value.trim()}).eq('id', client.id)
                           onUpdate()
                           toast.success('Имя сохранено')
                         }
                      }}
                      className="mt-1 block text-xl font-extrabold text-neutral-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 focus:border-primary-500 outline-none w-full transition-colors pb-1 read-only:opacity-80"
                    />
                  </div>
                  {!client.id.startsWith('temp-') && (
                    <button 
                      onClick={handleDeleteClient}
                      className="flex items-center gap-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Удалить
                    </button>
                  )}
                </div>

                {/* Contacts Section (Locked vs Unlocked) */}
                <div className="bg-neutral-50 dark:bg-neutral-800/40 p-5 rounded-2xl border border-neutral-100 dark:border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-primary-500"/> 
                      <span>Контактные данные</span>
                    </label>
                    {isUnlocked && (client.telegram || client.phone) && (
                      <div className="flex gap-2">
                        {client.telegram && (
                          <a 
                            href={`https://t.me/${client.telegram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-sky-500/20 transition-colors"
                          >
                            <Send className="w-3 h-3" /> Telegram
                          </a>
                        )}
                        {client.phone && (
                          <a 
                            href={`tel:${client.phone}`}
                            className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                          >
                            <Phone className="w-3 h-3" /> Позвонить
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {!isUnlocked ? (
                    <div className="relative overflow-hidden rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center space-y-3">
                      <div className="w-10 h-10 mx-auto rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Контакты скрыты</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mt-1">
                          Контактный телефон и email доступны только после того, как вы примете эту заявку с маркетплейса.
                        </p>
                      </div>
                      <div className="filter blur-sm select-none opacity-40 grid grid-cols-2 gap-3 text-left">
                        <div className="bg-white dark:bg-neutral-800 p-2.5 rounded-lg text-xs font-mono">+420 77* *** ***</div>
                        <div className="bg-white dark:bg-neutral-800 p-2.5 rounded-lg text-xs font-mono">c*****@gmail.com</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none mt-1"
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
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none mt-1"
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
                          className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 outline-none mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lead Parameters Badges */}
                {(styleText || budgetText || cityText || lead.body_place || lead.size) && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Параметры татуировки</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {styleText && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 border border-purple-100 dark:border-purple-500/20">
                          <Palette className="w-4 h-4 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold block uppercase text-[9px] opacity-70">Стиль</span>
                            <span className="font-semibold">{styleText}</span>
                          </div>
                        </div>
                      )}

                      {budgetText && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 border border-emerald-100 dark:border-emerald-500/20">
                          <DollarSign className="w-4 h-4 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold block uppercase text-[9px] opacity-70">Бюджет</span>
                            <span className="font-semibold">{budgetText}</span>
                          </div>
                        </div>
                      )}

                      {cityText && (
                        <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 border border-orange-100 dark:border-orange-500/20">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold block uppercase text-[9px] opacity-70">Город</span>
                            <span className="font-semibold">{cityText}</span>
                          </div>
                        </div>
                      )}

                      {lead.body_place && (
                        <div className="bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 border border-sky-100 dark:border-sky-500/20">
                          <PersonStanding className="w-4 h-4 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold block uppercase text-[9px] opacity-70">Место</span>
                            <span className="font-semibold">{lead.body_place}</span>
                          </div>
                        </div>
                      )}

                      {lead.size && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-3.5 py-2.5 rounded-2xl flex items-center gap-2.5 border border-amber-100 dark:border-amber-500/20">
                          <Maximize2 className="w-4 h-4 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold block uppercase text-[9px] opacity-70">Размер</span>
                            <span className="font-semibold">{lead.size}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Master Notes */}
                <div>
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> Заметки мастера</label>
                  <textarea 
                    defaultValue={client.notes || ''}
                    readOnly={client.id.startsWith('temp-')}
                    placeholder="Добавьте заметку об этом клиенте..."
                    className="mt-2 w-full p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-white/5 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-neutral-900 dark:text-white text-sm"
                    rows={4}
                    onBlur={async (e) => {
                       if (client.id.startsWith('temp-')) return;
                       await supabase.from('master_clients').update({notes: e.target.value}).eq('id', client.id)
                       onUpdate()
                    }}
                  />
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-neutral-900 dark:text-white text-sm">История сеансов</h3>
                  {!client.id.startsWith('temp-') && (
                    <button 
                      onClick={() => setIsSessionModalOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-xl hover:bg-primary-500/20 transition-colors"
                    >
                      <Plus className="w-4 h-4"/> Добавить сеанс
                    </button>
                  )}
                </div>
                
                {client.master_sessions && client.master_sessions.length > 0 ? (
                  client.master_sessions.map(s => {
                    const isSoldB2b = s.status === 'marketplace' || client.kanban_status === 'marketplace'
                    return (
                      <div key={s.id} className="p-4 border border-neutral-200 dark:border-white/10 rounded-2xl flex flex-col gap-3 bg-neutral-50/50 dark:bg-neutral-800/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center shrink-0">
                              <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-bold text-neutral-900 dark:text-white text-sm">
                                {new Date(s.session_date).toLocaleDateString('ru-RU')}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {s.start_time || 'Время не указано'} {s.end_time ? `- ${s.end_time}` : ''}
                              </div>
                              <div className="mt-1">
                                {isSoldB2b ? (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    На маркетплейсе (80% кэшбэк при продаже)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                    {s.status === 'in_progress' ? 'В процессе' : s.status === 'completed' ? 'Завершен' : s.status === 'booked' ? 'Записан' : s.status}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:items-end gap-2">
                            <div className="font-extrabold text-neutral-900 dark:text-white text-base">
                              {s.price ? `${s.price} Kč` : '—'}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {s.status === 'booked' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSessionToStart(s.id); }}
                                  className="px-2.5 py-1 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-primary-500/20 transition-colors"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" /> Начать
                                </button>
                              )}
                              {s.status === 'in_progress' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSessionToComplete(s.id); }}
                                  className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-emerald-500/20 transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Завершить
                                </button>
                              )}

                              {/* B2B Share Button */}
                              {s.status !== 'completed' && s.status !== 'cancelled' && !isSoldB2b && client.lead_id && (
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setB2bSellData({
                                      leadId: client.lead_id!,
                                      sessionTitle: `${new Date(s.session_date).toLocaleDateString('ru-RU')}`,
                                      clientName: client.name
                                    });
                                  }} 
                                  className="p-2 text-neutral-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors" 
                                  title="Слить на маркетплейс (B2B)"
                                >
                                  <Share2 className="w-4 h-4" />
                                </button>
                              )}

                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSessionClick) {
                                    onSessionClick({ ...s, master_clients: { id: client.id, name: client.name } });
                                  } else {
                                    setSessionToEdit({ ...s, master_clients: { id: client.id, name: client.name } });
                                  }
                                }} 
                                className="p-2 text-neutral-400 hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors" 
                                title="Редактировать"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} 
                                className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" 
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {s.reference_images && s.reference_images.length > 0 && (
                          <div className="w-full flex gap-2 overflow-x-auto custom-scrollbar pb-1 border-t border-neutral-200 dark:border-white/5 pt-3">
                            {s.reference_images.map((url: string, idx: number) => (
                              <Image key={`ref-${idx}`} src={url || ''} alt="ref" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-neutral-200 dark:border-white/10" width={56} height={56} />
                            ))}
                          </div>
                        )}
                        
                        {s.status === 'completed' && s.result_image_urls && s.result_image_urls.length > 0 && (
                          <div className="mt-1 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Результат сеанса</span>
                            </div>
                            <div className="w-full flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                              {s.result_image_urls.map((url: string, idx: number) => (
                                <Image key={`res-${idx}`} src={url || ''} alt="result" className="w-16 h-16 rounded-xl object-cover shrink-0 border border-emerald-500/20" width={64} height={64} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12 text-neutral-400 border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-3xl">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold">У этого клиента еще нет сеансов</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                {isUnlocked ? (
                  <>
                    <div className="w-16 h-16 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-3xl flex items-center justify-center">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-neutral-900 dark:text-white text-lg">Чат с клиентом</h3>
                      <p className="text-sm text-neutral-500 max-w-sm mx-auto mt-1">
                        {client.lead_id ? 'Откройте чат, чтобы обсудить детали и согласовать время сеанса.' : 'Для клиентов, добавленных вручную, чат недоступен.'}
                      </p>
                    </div>
                    {client.lead_id && (
                      <button 
                        onClick={() => setIsChatOpen(true)}
                        className="px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl shadow-lg shadow-primary-500/25 hover:bg-primary-700 transition-all hover:scale-[1.02]"
                      >
                        Открыть диалог
                      </button>
                    )}
                  </>
                ) : (
                  <div className="max-w-md mx-auto space-y-4 bg-purple-500/5 p-6 rounded-3xl border border-purple-500/20">
                    <div className="w-14 h-14 mx-auto bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center">
                      <Lock className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-neutral-900 dark:text-white text-lg">Чат заблокирован</h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                        Общение с клиентом откроется сразу после того, как вы примете эту заявку с маркетплейса и оплатите комиссию платформы.
                      </p>
                    </div>
                  </div>
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
        existingClients={[client]}
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

    {/* B2B Sell Modal */}
    {b2bSellData && (
      <B2bSellModal
        isOpen={!!b2bSellData}
        onClose={() => setB2bSellData(null)}
        leadId={b2bSellData.leadId}
        sessionTitle={b2bSellData.sessionTitle}
        clientName={b2bSellData.clientName}
        onSuccess={onUpdate}
      />
    )}
    </>
  )
}
