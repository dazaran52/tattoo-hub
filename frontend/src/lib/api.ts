// Centralized API client for Tattoo Hub
import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Profile {
  id: string
  username?: string
  email: string
  balance: number
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
  avatar_url?: string
  portfolio_image_urls?: string[]
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
  },

  async updateLeadStatus(leadId: string, status: string): Promise<{success: boolean, trust_score: number}> {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/api/leads/${leadId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to update lead status')
    }
    return res.json()
  },

  async createCryptoInvoice(amountUsdt: number): Promise<{pay_url: string}> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not logged in')
    
    const res = await fetch(`${API_URL}/api/payments/crypto/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: session.user.id,
        amount_usdt: amountUsdt
      })
    })
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Failed to create invoice')
    }
    
    return res.json()
  }
}
