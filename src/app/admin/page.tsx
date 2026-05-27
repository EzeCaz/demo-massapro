'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MassaProHeader from '@/components/MassaProHeader'
import AdminPanel from '@/components/AdminPanel'
import { Loader2 } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const hasCheckedAuth = useRef(false)

  useEffect(() => {
    // Only redirect after session check has completed
    if (status === 'unauthenticated' && hasCheckedAuth.current) {
      router.replace('/login')
    }
    if (status === 'authenticated' && hasCheckedAuth.current) {
      const userRole = (session?.user as any)?.role
      if (userRole !== 'admin' && userRole !== 'super_admin') {
        router.replace('/dashboard')
      }
    }
    if (status !== 'loading') {
      hasCheckedAuth.current = true
    }
  }, [status, session, router])

  // Show loading while session is being determined
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img
            src="/massapro-logo.png"
            alt="MassaPro"
            className="h-16 w-auto mx-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-vivid-blue mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Loading MassaPro...</p>
        </div>
      </div>
    )
  }

  // Not authenticated or not admin — show loading while redirect happens
  if (status !== 'authenticated' || ((session?.user as any)?.role !== 'admin' && (session?.user as any)?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img
            src="/massapro-logo.png"
            alt="MassaPro"
            className="h-16 w-auto mx-auto mb-4"
          />
          <Loader2 className="h-8 w-8 animate-spin text-vivid-blue mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MassaProHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AdminPanel />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} MassaPro. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
