import { useState, useEffect } from 'react'
import { Search, Loader2, Edit3, Trash2, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { ClientDetailsModal } from './ClientDetailsModal'
import { AddClientModal } from './AddClientModal'

export interface CRMClient {
  id: string
  name: string
  contact_info: string
  phone?: string
  telegram?: string
  instagram?: string
  source: string
  notes: string
  lead_id?: string
  created_at: string
  leads?: {
    title: string
    description: string
    image_urls: string[]
    client_priority: string
  }
  master_sessions?: {
    id: string
    session_date: string
    start_time?: string
    end_time?: string
    status: string
    price?: number
    style?: string
  }[]
}

export function ClientsDatabase() {
  const [clients, setClients] = useState<CRMClient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState<CRMClient | null>(null)
  const [chatsMap, setChatsMap] = useState<Record<string, string>>({})
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const res = await fetch(`${apiUrl}/api/crm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      const chatsRes = await fetch(`${apiUrl}/api/chat/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        setClients(await res.json())
      }
      
      if (chatsRes.ok) {
        const chats = await chatsRes.json()
        const cmap: Record<string, string> = {}
        chats.forEach((c: any) => {
          cmap[c.lead_id] = c.id
        })
        setChatsMap(cmap)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, clientId: string) => {
    e.stopPropagation()
    if (!confirm('Вы уверены, что хотите удалить этого клиента? Его будущие сеансы также будут отменены.')) return

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const res = await fetch(`${apiUrl}/api/crm/clients/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!res.ok) throw new Error('Failed to delete client')
      
      toast.success('Клиент удален')
      fetchClients()
    } catch (err) {
      toast.error('Ошибка удаления клиента')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  const filteredClients = clients.filter(c => {
    const search = searchQuery.toLowerCase().replace(/\s/g, '')
    const name = c.name.toLowerCase().replace(/\s/g, '')
    const contact = (c.contact_info || '').toLowerCase().replace(/\s/g, '')
    const phone = (c.phone || '').toLowerCase().replace(/\s/g, '')
    const telegram = (c.telegram || '').toLowerCase().replace(/\s/g, '')
    const instagram = (c.instagram || '').toLowerCase().replace(/\s/g, '')
    return name.includes(search) || contact.includes(search) || phone.includes(search) || telegram.includes(search) || instagram.includes(search)
  })

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Поиск по имени или номеру..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-violet-500/20 outline-none"
          />
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 whitespace-nowrap"
        >
          <UserPlus className="w-5 h-5" />
          Добавить клиента
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="p-4 font-bold">Клиент</th>
                <th className="p-4 font-bold">Сеансы</th>
                <th className="p-4 font-bold">Последний сеанс</th>
                <th className="p-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(client => {
                const isMarketplace = client.source !== 'manual'
                const sessions = client.master_sessions || []
                
                // Sort sessions by date descending
                const sortedSessions = [...sessions].sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
                const latestSession = sortedSessions.length > 0 ? sortedSessions[0] : null
                
                return (
                  <tr 
                    key={client.id} 
                    onClick={() => setSelectedClient(client)}
                    className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-700 rounded-full flex items-center justify-center">
                          <span className="font-bold text-neutral-500 dark:text-neutral-400">{client.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            {client.name}
                            {isMarketplace && <span className="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Заявка</span>}
                          </div>
                          <div className="text-sm text-neutral-500">
                            {client.phone || client.telegram || client.instagram || client.contact_info || 'Нет контактов'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-full text-xs font-bold">
                        {sessions.length}
                      </div>
                    </td>
                    <td className="p-4">
                      {latestSession ? (
                        <div className="text-sm">
                          <div className="font-semibold">{new Date(latestSession.session_date).toLocaleDateString('ru-RU')}</div>
                          <div className="text-xs text-neutral-500">
                            {latestSession.status === 'completed' ? 'Завершен' : 
                             latestSession.status === 'booked' ? 'Запланирован' :
                             latestSession.status === 'in_progress' ? 'В процессе' : 'Отменен'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">Нет сеансов</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedClient(client)
                          }}
                          className="p-2 text-neutral-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, client.id)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-neutral-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-medium text-lg">Клиенты не найдены</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <ClientDetailsModal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          client={selectedClient}
          onUpdate={fetchClients}
          chatId={selectedClient.lead_id ? chatsMap[selectedClient.lead_id] : null}
        />
      )}

      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchClients}
      />
    </div>
  )
}
