// API Types for OUT Tattoo Leads

export interface Profile {
  id: string
  email: string
  credits: number
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
  price_credits: number
  is_unlocked: boolean
  created_at: string
}

export interface LeadUnlock {
  id: string
  user_id: string
  lead_id: string
  unlocked_at: string
}

export interface ApiError {
  detail: string
  status?: number
}

export interface UnlockLeadResponse {
  success: boolean
  remaining_credits: number
  lead: Lead
}
