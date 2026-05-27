import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect admin API routes server-side
  // Page-level auth is handled by client-side useSession() checks
  // This avoids Edge runtime JWT decryption issues that cause redirect loops

  if (pathname.startsWith('/api/admin')) {
    // Check for session cookie existence (basic check, not full JWT decode)
    const sessionCookie =
      request.cookies.get('next-auth.session-token') ||
      request.cookies.get('__Secure-next-auth.session-token')

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/admin/:path*'],
}
