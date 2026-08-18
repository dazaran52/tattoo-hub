'use client'
import { useTranslations } from "next-intl";


import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, User, Bot, Loader2, CheckCircle2, PauseCircle, PlayCircle, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { SkeletonList } from '@/components/SkeletonCard'
import { EmptyState } from '@/components/EmptyState'

interface AiConversation {
  id: string
  client_email: string
  client_name: string | null
  original_subject: string
  state: string
  is_paused: boolean
  collected_data: {
    history: { role: string; text: string; timestamp: string }[]
    style?: string
    location?: string
    size?: string
    budget_amount?: number
    budget_currency?: string
    has_references?: boolean
    idea?: string
    client_country_code?: string
    images?: string[]
  }
  created_at: string
}

export function AdminAiChats() {
    const t = useTranslations();
  const [session, setSession] = useState<any>(null)
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [selectedConv, setSelectedConv] = useState<AiConversation | null>(null)
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [isPausing, setIsPausing] = useState(false)
  const [countryFilter, setCountryFilter] = useState<string>('ALL')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
  }, [])

  useEffect(() => {
    if (!session) return

    const fetchConversations = async () => {
      setIsLoadingChats(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/conversations`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setConversations(data)
        }
      } catch (err) {
        console.error('Failed to fetch AI conversations', err)
      } finally {
        setIsLoadingChats(false)
      }
    }

    fetchConversations()
  }, [session])

  useEffect(() => {
    if (selectedConv) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [selectedConv])

  const togglePause = async () => {
    if (!selectedConv || !session) return
    setIsPausing(true)
    const newPauseState = !selectedConv.is_paused
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/conversations/${selectedConv.id}/pause`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_paused: newPauseState })
      })
      if (!res.ok) throw new Error('Failed to update pause state')
      
      const updatedConv = { ...selectedConv, is_paused: newPauseState }
      setSelectedConv(updatedConv)
      setConversations(prev => prev.map(c => c.id === selectedConv.id ? updatedConv : c))
      toast.success(newPauseState ? t('dialogueInterceptedAiPaused') : t('aiEnabledAgain'))
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsPausing(false)
    }
  }

  const uniqueCountries = useMemo(() => {
    const codes = new Set(conversations.map(c => c.collected_data?.client_country_code).filter(Boolean))
    return Array.from(codes) as string[]
  }, [conversations])

  const filteredConversations = useMemo(() => {
    if (countryFilter === 'ALL') return conversations
    return conversations.filter(c => c.collected_data?.client_country_code === countryFilter)
  }, [conversations, countryFilter])

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm flex h-[600px] animate-fade-in-up">
      {/* Sidebar */}
      <div className="w-1/3 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50 dark:bg-neutral-900/50">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col gap-3">
          <div className="flex items-center justify-between font-bold text-neutral-900 dark:text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary-500" />
              {t('aiParser')}
                                      </div>
            <span className="text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 px-2 py-1 rounded-full">{filteredConversations.length}</span>
          </div>
          {uniqueCountries.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-400" />
              <select 
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="flex-1 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs py-1.5 px-2 outline-none focus:border-primary-500"
              >
                <option value="ALL">{t('allCountries')}</option>
                {uniqueCountries.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingChats ? (
            <SkeletonList count={4} />
          ) : filteredConversations.length === 0 ? (
            <EmptyState
              variant="compact"
              icon={<Bot className="w-8 h-8" />}
              title={t('noDialogue')}
              description={t('oiChatsWillAppear')}
            />
          ) : (
            filteredConversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedConv(c)}
                className={`w-full text-left p-4 border-b border-neutral-100 dark:border-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 transition-colors ${selectedConv?.id === c.id ? 'bg-white dark:bg-neutral-800 border-l-4 border-l-primary-500' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="font-medium truncate text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                    {c.client_name || c.client_email}
                    {c.collected_data?.client_country_code && (
                      <span className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-[9px] rounded font-bold uppercase">
                        {c.collected_data.client_country_code}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-neutral-500 truncate mb-1">{c.original_subject}</div>
                <div className="flex gap-2 text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full ${c.state === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}`}>
                    {c.state}
                  </span>
                  {c.is_paused && (
                    <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-1">
                      <PauseCircle className="w-3 h-3" /> {t('intercepted')}
                                                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="w-2/3 flex flex-col bg-neutral-50 dark:bg-neutral-950">
        {!selectedConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <Bot className="w-16 h-16 mb-4 opacity-20" />
            <p>{t('selectDialogOnThe')}</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shadow-sm z-10 bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-neutral-500" />
                </div>
                <div>
                  <div className="font-bold text-neutral-900 dark:text-white leading-tight flex items-center gap-2">
                    {selectedConv.client_email}
                    {selectedConv.collected_data?.client_country_code && (
                      <span className="px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-[10px] rounded font-bold uppercase">
                        {selectedConv.collected_data.client_country_code}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 flex items-center gap-2 mt-0.5">
                    {t('status')} <span className={selectedConv.state === 'completed' ? 'text-green-500' : 'text-amber-500'}>{selectedConv.state}</span>
                  </div>
                </div>
              </div>
              <div>
                <button
                  onClick={togglePause}
                  disabled={isPausing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                    selectedConv.is_paused 
                      ? 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md'
                  }`}
                >
                  {isPausing ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedConv.is_paused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                  {selectedConv.is_paused ? t('enableAi') : t('interceptDialogue')}
                </button>
              </div>
            </div>
            
            {/* Context Header */}
            <div className="bg-primary-50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/20 p-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <div className="font-semibold text-primary-700 dark:text-primary-400 w-full mb-1">{t('collectedData')}</div>
              <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('styleLabel')}</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.style || '-'}</span></div>
              <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('locationLabel')}</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.location || '-'}</span></div>
              <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('sizeLabel')}</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.size || '-'}</span></div>
              <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('budget')}</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.budget_amount ? `${selectedConv.collected_data.budget_amount} ${selectedConv.collected_data.budget_currency || ''}` : '-'}</span></div>
              <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('idea')}</span> <span className="font-medium dark:text-white line-clamp-2 max-w-xs" title={selectedConv.collected_data.idea}>{selectedConv.collected_data.idea || '-'}</span></div>
              <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('references')}</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.has_references ? t('yes') : t('no')}</span></div>
              {selectedConv.collected_data.images && selectedConv.collected_data.images.length > 0 && (
                <div className="flex flex-col"><span className="text-neutral-500 mb-0.5">{t('photoUploaded')}</span> <span className="font-medium dark:text-white">{selectedConv.collected_data.images.length} {t('pcs')}</span></div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConv.collected_data.history && selectedConv.collected_data.history.length > 0 ? (
                selectedConv.collected_data.history.map((msg, i) => {
                  const isBot = msg.role === 'model'
                  return (
                    <div key={i} className={`flex ${isBot ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex flex-col ${isBot ? 'items-end' : 'items-start'} max-w-[80%]`}>
                        <div 
                          className={`relative min-w-[70px] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                            isBot 
                              ? 'bg-primary-500 text-white rounded-br-sm' 
                              : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-bl-sm'
                          }`}
                        >
                          <div className="break-words mb-1 whitespace-pre-wrap">
                            {msg.text}
                          </div>
                          <div className={`text-[10px] leading-none flex items-center justify-end gap-0.5 whitespace-nowrap ${isBot ? 'text-primary-100' : 'text-neutral-400'}`}>
                            <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                            {isBot && (
                              <span className="opacity-80 tracking-tighter text-[11px] ml-1">
                                <Bot className="w-3 h-3 inline" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center text-neutral-400 text-sm mt-4">{t('noMessagesInHistory')}</div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
