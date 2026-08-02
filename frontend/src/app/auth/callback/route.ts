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
      if (data?.user) {
        // Sync role if missing
        if (role && !data.user.user_metadata?.role) {
          await supabase.auth.updateUser({
            data: { role: role }
          })
        }
        
        // Sync avatar to public.users if missing
        const avatar = data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture
        if (avatar) {
          try {
            const { data: dbUser } = await supabase.from('users').select('avatar_url').eq('id', data.user.id).single()
            if (dbUser && !dbUser.avatar_url) {
              await supabase.from('users').update({ avatar_url: avatar }).eq('id', data.user.id)
            }
          } catch (err) {
            console.error('Failed to sync avatar during auth callback', err)
          }
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
