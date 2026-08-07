// API Types for Tattoo Hub

export interface Profile {
  id: string
  email: string
  balance: number
  is_admin: boolean
  status: string
  display_name?: string
  phone?: string
  bio?: string
  created_at: string
}

export interface Lead {
  id: string
  title: string
  description: string
  contacts: string
  unlock_price_local?: number
  master_currency?: string
  is_unlocked: boolean
  trust_score: number
  unlock_status?: string
  created_at: string
}

export interface LeadUnlock {
  id: string
  user_id: string
  lead_id: string
  unlocked_at: string
  status: string
}

export interface ApiError {
  detail: string
  status?: number
}

export interface UnlockLeadResponse {
  success: boolean
  remaining_balance: number
  lead: Lead
}
