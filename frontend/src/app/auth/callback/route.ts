import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createSupabaseServerClient(cookieStore)
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      const role = searchParams.get('role')
      if (role && data?.user) {
        // Only set role if user doesn't already have one (first login)
        if (!data.user.user_metadata?.role) {
          await supabase.auth.updateUser({
            data: { role: role }
          })
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      // If error, redirect to login with error parameter
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // No code provided
  return NextResponse.redirect(`${origin}/login?error=No+code+provided`)
}
