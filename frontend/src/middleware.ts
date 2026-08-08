import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'

const protectedRoutes = ['/dashboard', '/profile', '/settings']
const locales = ['en', 'cs', 'ru', 'uk']

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en'
})

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for Supabase auth cookie
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.includes('-auth-token') || 
    cookie.name === 'sb-access-token' || 
    cookie.name === 'sb-refresh-token'
  )

  // Because next-intl prefixes the locale (e.g. /en/dashboard), we check if the path starts with any locale + protected route
  // Or we can just check if any protected route is included
  const isProtectedRoute = protectedRoutes.some(route => 
    locales.some(locale => pathname.startsWith(`/${locale}${route}`) || pathname === `/${locale}${route}`) ||
    pathname.startsWith(route)
  )

  const isLoginRoute = locales.some(locale => pathname === `/${locale}/login`) || pathname === '/login'

  if (isProtectedRoute && !hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  if (isLoginRoute && hasAuthCookie) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
}
