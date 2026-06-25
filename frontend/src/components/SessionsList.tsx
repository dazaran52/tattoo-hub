import { Search } from 'lucide-react'
import { CRMSession } from './CRMBoard'

export function SessionsList({ sessions, searchQuery, setSearchQuery, onStatusChange }: {
  sessions: CRMSession[],
  searchQuery: string,
  setSearchQuery: (s: string) => void,
  onStatusChange: (id: string, status: string) => void
}) {
  const filtered = sessions.filter(s => {
    const q = searchQuery.toLowerCase()
    const name = (s.master_clients?.name || '').toLowerCase()
    const contact = (s.master_clients?.contact_info || '').toLowerCase()
    return name.includes(q) || contact.includes(q)
  })

  return (
    <div className="w-full">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-800/50 text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="p-4 font-bold">Клиент</th>
                <th className="p-4 font-bold">Дата и время</th>
                <th className="p-4 font-bold">Стиль / Цена</th>
                <th className="p-4 font-bold text-right">Статус</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(session => (
                <tr key={session.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-neutral-900 dark:text-white">{session.master_clients?.name}</div>
                    <div className="text-sm text-neutral-500">{session.master_clients?.contact_info || 'Нет контактов'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {new Date(session.session_date).toLocaleDateString('ru-RU')}
                    </div>
                    {(session.start_time || session.end_time) && (
                      <div className="text-sm text-neutral-500">
                        {session.start_time?.slice(0, 5)} {session.end_time ? `- ${session.end_time.slice(0, 5)}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium">{session.style || '-'}</div>
                    <div className="text-sm text-neutral-500">{session.price ? `${session.price} CZK` : '-'}</div>
                  </td>
                  <td className="p-4 text-right">
                    <select 
                      value={session.status}
                      onChange={(e) => onStatusChange(session.id, e.target.value)}
                      className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 text-sm outline-none"
                    >
                      <option value="new">Новые</option>
                      <option value="discussing">В диалоге</option>
                      <option value="booked">Записан</option>
                      <option value="in_progress">В процессе</option>
                      <option value="completed">Завершено</option>
                      <option value="cancelled">Отмена</option>
                    </select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-neutral-500">
                    Сеансы не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
