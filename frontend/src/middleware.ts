import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/profile', '/settings']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for Supabase auth cookie - try all possible names and chunked cookies
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(cookie => 
    cookie.name.includes('-auth-token') || 
    cookie.name === 'sb-access-token' || 
    cookie.name === 'sb-refresh-token'
  )

  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !hasAuthCookie) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect logged-in users away from login page to dashboard
  if (pathname === '/login' && hasAuthCookie) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/login',
  ],
}
