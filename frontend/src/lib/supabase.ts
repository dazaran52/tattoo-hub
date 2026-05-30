import { createBrowserClient, createServerClient, type CookieOptions } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'


// Client-side Supabase instance
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

export type Profile = {
  id: string
  email: string
  credits: number
  is_admin: boolean
  status: string
  created_at: string | null
  display_name?: string | null
  phone?: string | null
  bio?: string | null
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
