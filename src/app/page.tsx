'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import MassaProHeader from '@/components/MassaProHeader'
import LoginPage from '@/components/LoginPage'
import SetupWizard from '@/components/SetupWizard'
import DemoDashboard from '@/components/DemoDashboard'
import AdminPanel from '@/components/AdminPanel'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()
  const { currentView, setCurrentView, setSharedToken } = useAppStore()
  const sharedChecked = useRef(false)

  // Check for shared token in URL (once)
  useEffect(() => {
    if (sharedChecked.current) return
    sharedChecked.current = true
    const params = new URLSearchParams(window.location.search)
    const shareToken = params.get('share')
    if (shareToken) {
      setSharedToken(shareToken)
      setCurrentView('shared')
    }
  }, [setSharedToken, setCurrentView])

  // Fetch scenarios to determine view
  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ['scenarios'],
    queryFn: async () => {
      const res = await fetch('/api/scenarios')
      if (!res.ok) throw new Error('Failed to fetch scenarios')
      return res.json()
    },
    enabled: status === 'authenticated',
  })

  // Compute the correct view
  const targetView = useMemo(() => {
    if (status === 'loading') return currentView
    if (status === 'unauthenticated') return 'login' as const

    // Authenticated user — never go back to login
    if (currentView === 'shared') return 'shared' as const
    if (scenariosLoading && currentView !== 'login') return currentView

    const userRole = (session?.user as any)?.role
    if (userRole === 'admin') {
      if (currentView === 'dashboard') return 'dashboard' as const
      return 'admin' as const
    }
    if (scenarios.length === 0) return 'setup' as const
    return 'dashboard' as const
  }, [status, currentView, scenariosLoading, scenarios, session])

  // Sync computed view to store
  useEffect(() => {
    if (targetView !== currentView) {
      setCurrentView(targetView)
    }
  }, [targetView, currentView, setCurrentView])

  // Loading state - show spinner while session or scenarios are loading
  // Also show spinner if authenticated but view hasn't been computed yet (still 'login')
  if (status === 'loading' || (status === 'authenticated' && (scenariosLoading || currentView === 'login') && currentView !== 'shared' && currentView !== 'admin' && currentView !== 'dashboard')) {
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

  // Not authenticated - show login
  if (status === 'unauthenticated') {
    return <LoginPage />
  }

  // Authenticated views
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MassaProHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === 'setup' && (
          <SetupWizard
            onComplete={() => setCurrentView('dashboard')}
          />
        )}

        {currentView === 'dashboard' && (
          <DemoDashboard />
        )}

        {currentView === 'admin' && (
          <AdminPanel />
        )}

        {currentView === 'shared' && (
          <SharedView />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MassaPro. All rights reserved.
        </div>
      </footer>
    </div>
  )
}

// Shared View Component
function SharedView() {
  const { sharedToken } = useAppStore()
  const { data: scenario, isLoading, error } = useQuery({
    queryKey: ['shared-scenario', sharedToken],
    queryFn: async () => {
      const res = await fetch(`/api/scenarios`)
      const scenarios = await res.json()
      for (const s of scenarios) {
        const collabRes = await fetch(`/api/scenarios/${s.id}/collaborations`)
        const collabs = await collabRes.json()
        if (collabs.some((c: any) => c.publicToken === sharedToken)) {
          const detailRes = await fetch(`/api/scenarios/${s.id}`)
          return detailRes.json()
        }
      }
      throw new Error('Shared scenario not found')
    },
    enabled: !!sharedToken,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-vivid-blue" />
      </div>
    )
  }

  if (error || !scenario) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Shared scenario not found or link has expired.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-montserrat)' }}>
        {scenario.name}
      </h2>
      <DemoDashboard />
    </div>
  )
}
