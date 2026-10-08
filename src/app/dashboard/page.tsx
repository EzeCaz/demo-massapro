'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

// /dashboard — redirects to /platform.
//
// Per Task 21: the new MassaPro Demo Platform at /platform is the
// single landing page for all authenticated users. The Demo tab inside
// it embeds the existing DemoDashboard. We keep /dashboard as a thin
// redirect for backward compatibility (bookmarked URLs, etc.).
export default function DashboardPage() {
  const { status } = useSession()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (status === 'loading' || hasRedirected.current) return
    hasRedirected.current = true
    if (status === 'unauthenticated') {
      window.location.href = '/login'
    } else {
      window.location.href = '/platform?tab=demo'
    }
  }, [status])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <img src="/massapro-logo.png" alt="MassaPro" className="h-16 w-auto mx-auto mb-4" />
        <Loader2 className="h-8 w-8 animate-spin text-vivid-blue mx-auto" />
        <p className="text-sm text-muted-foreground mt-3">Loading MassaPro Platform…</p>
      </div>
    </div>
  )
}
