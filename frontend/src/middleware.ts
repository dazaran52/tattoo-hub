import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'

import { createServerClient, type CookieOptions } from '@supabase/ssr'

const protectedRoutes = ['/dashboard', '/profile', '/settings']
const locales = ['en', 'cs', 'ru', 'uk']

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en'
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. Generate base response using next-intl
  let response = intlMiddleware(request)

  // 2. Initialize Supabase client to automatically refresh session if needed
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // This will automatically refresh the token if it's expired
  const { data: { user } } = await supabase.auth.getUser()

  // 3. Authorization checks
  const isProtectedRoute = protectedRoutes.some(route => 
    locales.some(locale => pathname.startsWith(`/${locale}${route}`) || pathname === `/${locale}${route}`) ||
    pathname.startsWith(route)
  )

  const isLoginRoute = locales.some(locale => pathname === `/${locale}/login`) || pathname === '/login'

  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoginRoute && user) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
}
