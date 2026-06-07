'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import MassaProHeader from '@/components/MassaProHeader'
import SetupWizard from '@/components/SetupWizard'
import DemoDashboard from '@/components/DemoDashboard'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [showSetup, setShowSetup] = useState(false)
  const hasRedirected = useRef(false)

  // Handle auth redirects using hard navigation (window.location.href)
  // to avoid redirect loops where useSession() returns stale data
  useEffect(() => {
    if (status === 'loading' || hasRedirected.current) return

    // All authenticated users (including admins) can access the dashboard
    if (status === 'unauthenticated') {
      hasRedirected.current = true
      window.location.href = '/login'
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

  // Show loading while session is being determined or redirecting
  if (status === 'loading' || status !== 'authenticated' || (status === 'authenticated' && scenariosLoading && !showSetup)) {
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

  // Determine if we should show setup wizard or dashboard
  const showWizard = scenarios.length === 0 && !showSetup

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MassaProHeader />

      <main className="flex-1 max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MassaPro. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
