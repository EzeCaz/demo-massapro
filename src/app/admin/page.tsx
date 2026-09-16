'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import MassaProHeader from '@/components/MassaProHeader'
import AdminPanel from '@/components/AdminPanel'
import { Loader2 } from 'lucide-react'

// /admin — Reports dashboard.
//
// Access policy (per Task 18, 2026-09-16):
//   - All authenticated users can view this page (the "Reports" view).
//     They see all clients and scenarios as read-only data, plus the
//     Export tab so they can download data.
//   - super_admin: link and page title show "Admin Panel".
//   - admin + user: link and page title show "Reports".
//   - Mutating actions (edit clients, create invites, delete) remain
//     admin/super_admin-only and are hidden in the AdminPanel component
//     via the `isAdmin` / `isSuperAdmin` checks.
//
// The page no longer redirects non-admin users away — they're allowed
// in to read the data.
export default function AdminPage() {
  const { data: session, status } = useSession()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (status === 'loading' || hasRedirected.current) return

    if (status === 'unauthenticated') {
      hasRedirected.current = true
      window.location.href = '/login'
    }
  }, [status])

  if (status !== 'authenticated') {
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

  // Share sessions (role === 'share') are scoped to ONE integration setup
  // and have no business being on the admin/reports page — they only get
  // there if they manually type the URL. Bounce them to /integration-setup.
  const userRole = (session?.user as any)?.role
  if (userRole === 'share') {
    if (typeof window !== 'undefined') {
      window.location.href = '/integration-setup'
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-vivid-blue" />
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
