// Centralized API client for Tattoo Hub
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Profile {
  id: string
  username?: string
  email: string
  balance: number
  credits: number
  is_admin: boolean
  status: string
  created_at: string
  display_name?: string
  phone?: string
  bio?: string
  unlocked_leads_count?: number
  total_spent?: number
  portfolio_url?: string
  own_referral_code?: string
  referred_by?: string
  country_ids?: string[]
  city_ids?: string[]
  discount_tokens: number
  gamification_level?: string
  role?: string
  is_verified_master?: boolean
  certificate_url?: string
  certificate_status?: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  certificate_submitted_at?: string
  certificate_reviewed_at?: string
  certificate_rejection_reason?: string
  avatar_url?: string
  portfolio_image_urls?: string[]
  theme?: string
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('No active session')
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
}

export const api = {
  // Profile
  async getProfile(): Promise<Profile> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile`, { headers })
    if (!res.ok) throw new Error('Failed to fetch profile')
    return res.json()
  },

  async createProfile(email: string): Promise<Profile> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email })
    })
    if (!res.ok) throw new Error('Failed to create profile')
    return res.json()
  },

  async updateProfile(data: Partial<Profile>): Promise<Profile> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Failed to update profile')
    return res.json()
  },

  async submitCertificate(objectPath: string): Promise<{
    certificate_status: 'pending'
    certificate_submitted_at: string
  }> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile/certificate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ object_path: objectPath })
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.detail || 'Failed to submit certificate')
    }
    return res.json()
  },

  async deleteProfile(): Promise<void> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/profile`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) throw new Error('Failed to delete profile')
  },

  async getAnalytics(): Promise<any> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/analytics`, { headers })
    if (!res.ok) throw new Error('Failed to fetch analytics')
    return res.json()
  },

  // Leads
  async getLeads() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/leads`, { headers })
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  },
  }
}
