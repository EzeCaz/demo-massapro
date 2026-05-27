'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import MassaProHeader from '@/components/MassaProHeader'
import SetupWizard from '@/components/SetupWizard'
import DemoDashboard from '@/components/DemoDashboard'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showSetup, setShowSetup] = useState(false)

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Redirect admin users to admin panel (they can switch back via header toggle)
  useEffect(() => {
    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.role
      // Admins can still access dashboard via the header toggle, so don't redirect
    }
  }, [status, session])

  // Fetch scenarios
  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed to fetch scenarios')
      return res.json()
    },
    enabled: status === 'authenticated',
  })

  // Show loading while session is being determined
  if (status === 'loading' || (status === 'authenticated' && scenariosLoading)) {
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

  // Determine if we should show setup wizard or dashboard
  const showWizard = scenarios.length === 0 && !showSetup

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MassaProHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showWizard ? (
          <SetupWizard
            onComplete={() => setShowSetup(true)}
          />
        ) : (
          <DemoDashboard />
        )}
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
