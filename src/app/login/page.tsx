'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import LoginPage from '@/components/LoginPage'
import { Loader2 } from 'lucide-react'

export default function LoginPageWrapper() {
  const { data: session, status } = useSession()
  const hasRedirected = useRef(false)

  // If user is already authenticated, redirect them away from the login page
  useEffect(() => {
    if (status === 'authenticated' && !hasRedirected.current) {
      hasRedirected.current = true
      const userRole = (session?.user as any)?.role
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

  return <LoginPage />
}
