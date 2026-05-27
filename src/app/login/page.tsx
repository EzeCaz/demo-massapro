'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/components/LoginPage'
import { Loader2 } from 'lucide-react'

export default function LoginPageWrapper() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const hasChecked = useRef(false)

  useEffect(() => {
    // Only redirect away from login if we're sure the user is authenticated
    if (status === 'authenticated' && hasChecked.current) {
      const userRole = (session?.user as any)?.role
      if (userRole === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    }
    if (status !== 'loading') {
      hasChecked.current = true
    }
  }, [status, session, router])

  if (status === 'loading' && !hasChecked.current) {
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

  // If authenticated, show loading while redirecting
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
