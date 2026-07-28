export function formatLastSeenText(lastSeen?: string | null, isOnline?: boolean): string {
  if (isOnline) return 'В сети'
  if (!lastSeen) return 'Был(а) недавно'

  try {
    const date = new Date(lastSeen)
    if (isNaN(date.getTime())) return 'Не в сети'

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / (60 * 1000))

    if (diffMin < 1) return 'Был(а) только что'
    if (diffMin < 60) return `Был(а) ${diffMin} мин. назад`

    const isToday = date.toDateString() === now.toDateString()
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (isToday) return `Был(а) сегодня в ${timeStr}`

    const yesterday = new Date()
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Был(а) вчера в ${timeStr}`
    }

    return `Был(а) ${date.toLocaleDateString('ru-RU')} в ${timeStr}`
  } catch {
    return 'Не в сети'
  }
}
