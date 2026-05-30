// Centralized API client for OUT Tattoo Leads
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Profile {
  id: string
  email: string
  credits: number
  is_admin: boolean
  status: string
  created_at: string
  display_name?: string
  phone?: string
  bio?: string
  unlocked_leads_count?: number
  total_spent?: number
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

  // Leads
  async getLeads() {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/leads`, { headers })
    if (!res.ok) throw new Error('Failed to fetch leads')
    return res.json()
  },

  async unlockLead(leadId: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/leads/${leadId}/unlock`, {
      method: 'POST',
      headers
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to unlock lead')
    }
    return res.json()
  }
}
