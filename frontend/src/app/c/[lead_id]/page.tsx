'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, MessageCircle, Send, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

interface Message {
  id: string
  sender_type: 'client' | 'master'
  content: string
  created_at: string
}

interface Proposal {
  master_id: string
  master_name: string
  master_avatar?: string
  price_offer: number
  proposed_dates: string
  status: string
  chat_id: string
}

interface LeadData {
  id: string
  title: string
  description: string
  client_priority: string
  proposals: Proposal[]
}

export default function ClientPortalPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const leadId = params.lead_id as string
  const token = searchParams.get('token')

  const [leadData, setLeadData] = useState<LeadData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) {
      setError('Token is missing')
      setLoading(false)
      return
    }

    fetchLeadData()
  }, [leadId, token])

  const fetchLeadData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/client-portal/leads/${leadId}?token=${token}`)
      if (!res.ok) throw new Error('Invalid link or lead not found')
      const data = await res.json()
      setLeadData(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadChat = async (chatId: string) => {
    setChatLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/chat/${chatId}/messages`, {
        headers: { 'client-token': token || '' }
      })
      if (!res.ok) throw new Error('Failed to load chat')
      const data = await res.json()
      setMessages(data)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChatLoading(false)
      scrollToBottom()
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedProposal) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/chat/${selectedProposal.chat_id}/messages`, {
        method: 'POST',
        headers: { 
          'client-token': token || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      })
      if (!res.ok) throw new Error('Failed to send')
      const msg = await res.json()
      setMessages(prev => [...prev, msg])
      setNewMessage('')
      scrollToBottom()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const acceptProposal = async (masterId: string) => {
    if (!confirm('Вы уверены, что хотите выбрать этого мастера? Другие предложения будут отклонены.')) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/api/client-portal/leads/${leadId}/proposals/${masterId}/accept?token=${token}`, {
        method: 'POST'
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || 'Failed to accept proposal')
      }

      toast.success('Мастер выбран успешно! Теперь вы можете обменяться контактами.')
      fetchLeadData() // refresh
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  if (loading) return <div className="p-8 text-center">Загрузка...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>
  if (!leadData) return null

  const isAnyAccepted = leadData.proposals.some(p => p.status === 'accepted')

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 pb-20">
      <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-8">
        
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-sm border border-neutral-200 dark:border-white/5">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">{leadData.title}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">{leadData.description}</p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-bold">
            {leadData.client_priority === 'cheap' ? '💵 Важна низкая цена' :
             leadData.client_priority === 'fast' ? '⚡️ Сделать как можно скорее' : '✨ Качество важнее всего'}
          </div>
        </div>

        {isAnyAccepted && (
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-3xl text-green-700 dark:text-green-400 font-bold flex items-center gap-3">
            <Check className="w-6 h-6" />
            Вы уже выбрали мастера. Спасибо!
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Отклики мастеров ({leadData.proposals.length})</h2>
            
            {leadData.proposals.map(p => (
              <div 
                key={p.master_id} 
                onClick={() => {
                  setSelectedProposal(p)
                  loadChat(p.chat_id)
                }}
                className={`p-5 rounded-3xl border cursor-pointer transition-all ${
                  selectedProposal?.master_id === p.master_id 
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/10 ring-2 ring-violet-500/20' 
                    : 'border-neutral-200 dark:border-white/5 bg-white dark:bg-neutral-800 hover:border-violet-300'
                } ${p.status === 'rejected' ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {p.master_avatar ? (
                      <img src={p.master_avatar} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-lg">
                        {p.master_name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-neutral-900 dark:text-white">{p.master_name}</div>
                      <div className="text-xs text-neutral-500">
                        {p.status === 'accepted' && <span className="text-green-500">Выбран</span>}
                        {p.status === 'pending' && <span className="text-amber-500">Ожидает</span>}
                        {p.status === 'rejected' && <span className="text-red-500">Отклонен</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg text-neutral-900 dark:text-white">{p.price_offer} CZK</div>
                  </div>
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl mb-3">
                  <span className="font-bold block mb-1">Свободные даты:</span>
                  {p.proposed_dates}
                </div>

                {!isAnyAccepted && p.status === 'pending' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); acceptProposal(p.master_id) }}
                    className="w-full bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Выбрать мастера
                  </button>
                )}
              </div>
            ))}

            {leadData.proposals.length === 0 && (
              <div className="text-center p-8 bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-white/5 text-neutral-500">
                Пока нет откликов. Они появятся здесь.
              </div>
            )}
          </div>

          <div>
            {selectedProposal ? (
              <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-white/5 flex flex-col h-[600px] overflow-hidden sticky top-8">
                <div className="p-4 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-between items-center">
                  <h3 className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-violet-500" /> 
                    Чат с {selectedProposal.master_name}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {!isAnyAccepted && selectedProposal.status !== 'accepted' && (
                    <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-2xl text-xs flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Контактные данные и ссылки скрываются в целях безопасности, пока вы не выберете мастера.
                    </div>
                  )}

                  {chatLoading ? (
                    <div className="text-center text-neutral-400 py-4">Загрузка сообщений...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-neutral-400 py-4 text-sm">
                      Напишите сообщение чтобы начать обсуждение деталей...
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          msg.sender_type === 'client' 
                            ? 'bg-violet-500 text-white rounded-br-sm' 
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-bl-sm'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                          <span className="text-[10px] opacity-60 mt-1 block">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50 border-t border-neutral-100 dark:border-white/5">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Написать сообщение..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      className="flex-1 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border border-transparent focus:border-violet-500 rounded-xl px-4 py-2 outline-none text-sm transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-violet-500 hover:bg-violet-600 disabled:bg-neutral-300 disabled:dark:bg-neutral-700 text-white p-2.5 rounded-xl transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="h-full border-2 border-dashed border-neutral-200 dark:border-white/10 rounded-3xl flex items-center justify-center text-neutral-400 p-8 text-center min-h-[300px]">
                Выберите отклик слева, чтобы начать переписку с мастером
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
