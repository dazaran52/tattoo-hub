import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'


// Client-side Supabase instance
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

export type Profile = {
  id: string
  email: string
  balance: number
  is_admin: boolean
  status: string
  created_at: string | null
  display_name?: string | null
  phone?: string | null
  bio?: string | null
  portfolio_url?: string | null
  own_referral_code?: string | null
  referred_by?: string | null
  country_ids?: string[]
  city_ids?: string[]
  discount_tokens: number
  unlocked_leads_count?: number
  gamification_level?: string
  withdrawable_balance?: number
  role?: string
  is_verified_master?: boolean
  certificate_url?: string | null
}

export type SupportMessage = {
  id: string
  user_id: string
  sender_id: string
  message: string
  is_read: boolean
  created_at: string
}

// Server-side helper (for server components)
export function createSupabaseServerClient(cookieStore: any) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: '', ...options })
      },
    },
  })
}
