import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LeadAcceptWizardModal } from './LeadAcceptWizardModal'

interface ChatSessionsModalProps {
  chatId: string
  clientInfo?: any
  userRole: 'master' | 'client'
  onClose: () => void
  onUpdate: () => void
}

export function ChatSessionsModal({ chatId, clientInfo, userRole, onClose, onUpdate }: ChatSessionsModalProps) {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'new'>('new')
  const [selectedSessionForAccept, setSelectedSessionForAccept] = useState<any | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [chatId])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const { data: chatData } = await supabase.from('lead_chats').select('client_id, client_session_id, master_id').eq('id', chatId).single()
      if (!chatData) return

      let query = supabase.from('master_sessions').select('*, master_clients(id, name, lead_id, leads(*))').eq('master_id', chatData.master_id).eq('is_deleted', false).order('created_at', { ascending: false })
      
      const { data: s } = await query
      // Filter sessions for this specific client
      const chatSessions = (s || []).filter(session => {
         const client = session.master_clients
         if (!client) return false
         const lead = client.leads
         if (!lead) return false
         return lead.client_id === chatData.client_id || lead.client_session_id === chatData.client_session_id
      })
      
      setSessions(chatSessions)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredSessions = sessions.filter(s => {
    if (activeTab === 'new') return s.status === 'new'
    return true
  })

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-white/10">
          <div>
            <h2 className="text-xl font-bold dark:text-white">Сеансы</h2>
            <p className="text-sm text-neutral-500">{clientInfo?.name || 'Клиент'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 dark:text-neutral-400" />
          </button>
        </div>

        <div className="flex gap-4 p-4 border-b border-neutral-100 dark:border-white/10 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('new')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'new' ? 'bg-violet-600 text-white' : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'}`}>
            Новые заявки
          </button>
          <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'all' ? 'bg-violet-600 text-white' : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10'}`}>
            Все сеансы
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center text-neutral-500">Загрузка...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-neutral-500 py-10">Нет сеансов</div>
          ) : (
            filteredSessions.map(session => (
              <div key={session.id} className="bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/10 p-4 rounded-2xl flex flex-col sm:flex-row gap-4">
                {session.reference_images && session.reference_images.length > 0 && (
                  <img src={session.reference_images[0]} className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded-xl shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold dark:text-white truncate pr-2">{session.master_clients?.leads?.title || 'Сеанс тату'}</h3>
                    <span className="text-xs px-2 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 rounded-lg shrink-0">
                      {session.status || 'new'}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap mb-4 line-clamp-2">{session.master_clients?.leads?.description}</p>
                  
                  {userRole === 'master' && (session.status === 'new') && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedSessionForAccept(session)}
                        className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Принять заявку
                      </button>
                    </div>
                  )}
                  {userRole === 'client' && (
                    <div className="flex gap-2">
                       <button className="flex-1 py-2 bg-neutral-200 dark:bg-white/10 dark:text-white hover:bg-neutral-300 dark:hover:bg-white/20 text-neutral-800 text-sm font-medium rounded-xl transition-colors">
                        Подробнее
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedSessionForAccept && (
        <LeadAcceptWizardModal
          session={selectedSessionForAccept}
          allSessions={sessions}
          isOpen={true}
          onClose={() => setSelectedSessionForAccept(null)}
          onSuccess={() => {
            setSelectedSessionForAccept(null)
            fetchSessions()
            onUpdate()
          }}
        />
      )}
    </div>
  )
}
