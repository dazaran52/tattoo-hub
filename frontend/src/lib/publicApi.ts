const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface PublicMaster {
  id: string
  username?: string
  display_name?: string
  bio?: string
  portfolio_url?: string
  city_ids?: string[]
  is_verified_master?: boolean
  certificate_status?: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  badge_tier?: string
  badge_expires_at?: string
  portfolio_posts?: unknown[]
  theme?: string
  avatar_url?: string
  rating?: number
  review_count?: number
  last_seen?: string
}

export interface PublicCity {
  id: string
  name_ru?: string
  name_en?: string
}

export interface PublicReview {
  id: string
  client_name: string
  created_at: string
  rating: number
  text?: string
}

async function getJson<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`)
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail || fallbackMessage)
  }
  return response.json()
}

export const publicApi = {
  getMaster(username: string): Promise<PublicMaster> {
    return getJson(`/api/public/master/${encodeURIComponent(username)}`, 'Мастер не найден')
  },

  getMasterReviews(username: string): Promise<PublicReview[]> {
    return getJson(`/api/public/master/${encodeURIComponent(username)}/reviews`, 'Не удалось загрузить отзывы')
  },

  getCities(): Promise<PublicCity[]> {
    return getJson('/api/locations/cities', 'Не удалось загрузить города')
  },
}
