'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef, Suspense } from 'react'
import LoginPage from '@/components/LoginPage'
import { Loader2 } from 'lucide-react'

export default function LoginPageWrapper() {
  const { data: session, status } = useSession()
  const hasRedirected = useRef(false)

  // If user is already authenticated, hard-redirect them away from the login page.
  // Using window.location.href (not router.replace) to force a full page reload
  // which ensures the session cookie is properly read by the server.
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !hasRedirected.current) {
      hasRedirected.current = true
      const userRole = (session.user as Record<string, unknown>)?.role as string | undefined
      if (userRole === 'admin' || userRole === 'super_admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/dashboard'
      }
    }
  }, [status, session])

  // Show loading spinner while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-[#1E293B] to-[#0F172A]">
        <div className="text-center">
          <img
            src="/massapro-logo.png"
            alt="MassaPro"
            className="h-16 w-auto mx-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
        </div>
      </div>
    )
  }

  // If authenticated, show spinner while redirect happens
  if (status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-[#1E293B] to-[#0F172A]">
        <div className="text-center">
          <img
            src="/massapro-logo.png"
            alt="MassaPro"
            className="h-16 w-auto mx-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto" />
          <p className="text-sm text-blue-200 mt-3">Redirecting...</p>
        </div>
      </div>
    )
  }

  // Wrap LoginPage in Suspense because it uses useSearchParams (required by Next.js 14+)
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-[#1E293B] to-[#0F172A]">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  )
}
