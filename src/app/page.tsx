'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const hasRedirected = useRef(false)

  useEffect(() => {
    // Don't redirect while session is still loading or if we've already kicked off a redirect
    if (status === 'loading' || hasRedirected.current) return

    hasRedirected.current = true

    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any)?.role
      if (userRole === 'admin' || userRole === 'super_admin') {
        window.location.href = '/admin'
      } else {
        window.location.href = '/dashboard'
      }
    } else {
      window.location.href = '/login'
    }
  }, [status, session])

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
