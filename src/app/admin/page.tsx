'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import MassaProHeader from '@/components/MassaProHeader'
import AdminPanel from '@/components/AdminPanel'
import { Loader2 } from 'lucide-react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.role
      if (userRole !== 'admin') {
        router.replace('/dashboard')
      }
    }
  }, [status, session, router])

  // Show loading while session is being determined
  if (status === 'loading' || (status === 'authenticated' && (session?.user as any)?.role !== 'admin')) {
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

  // Not authenticated — will redirect
  if (status !== 'authenticated') {
    return null
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
