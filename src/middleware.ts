import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Get the JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET || 'massapro-secret-key-change-in-production',
  })

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Static assets and API routes (except admin-only APIs) are always allowed
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/massapro-logo') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  // Not authenticated — redirect to login
  if (!token) {
    if (!isPublicRoute) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Authenticated user on login page — redirect away
  if (pathname === '/login') {
    const role = token.role as string
    const redirectUrl = role === 'admin' ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // Non-admin trying to access admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const role = token.role as string
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon\\.ico|massapro-logo\\.png|logo\\.svg|robots\\.txt).*)',
  ],
}
