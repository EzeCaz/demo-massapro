'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Still loading, don't do anything yet
    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.role
      if (userRole === 'admin' || userRole === 'super_admin') {
        router.replace('/admin')
      } else {
        router.replace('/dashboard')
      }
    } else if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, session, router])

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
