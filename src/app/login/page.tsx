'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import LoginPage from '@/components/LoginPage'
import { Loader2 } from 'lucide-react'

export default function LoginPageWrapper() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If already authenticated, redirect to the right page
    if (status === 'authenticated') {
      router.replace('/dashboard')
    }
  }, [status, router])

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

  if (status === 'authenticated') {
    return null // Will redirect
  }

  return <LoginPage />
}
