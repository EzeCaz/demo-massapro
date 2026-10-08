'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useSession } from 'next-auth/react'
import DemoMainTab from './DemoMainTab'
import IntegrationsTab from './IntegrationsTab'
import SupportTab from './SupportTab'
import ReportsTab from './ReportsTab'
import GlobalAdminTab from './GlobalAdminTab'

// PlatformShell — top-level container for the MassaPro Demo Platform
// (Task 25 restructure).
//
// The 5 main tabs (Demo / Integrations / Support / Reports / Global Admin)
// are now DIRECTLY in the MassaProHeader as nav buttons (each linking to
// /platform?tab=<name>). PlatformShell reads the ?tab= query param to
// decide which main tab's content to render. Sub-tab strips live inside
// each main tab component.
//
// Hierarchy (per the user's confirmed sitemap):
//   )Demo              — Demo / Scenarios / Export sub-tabs
//   )Integrations      — Integration Setup / SOW sub-tabs (SOW has its own
//                        sub-sub-tab: SOW Builder)
//   )Support           — Submit ticket / Panel sub-tabs
//   )Reports           — Summary / Demos / Integrations and SOW / Support sub-tabs
//   )Global admin      — User Management (with sub-sub-tabs: User Management /
//                        Companies / Teams) / SOW Form Edit / Integration Form
//                        Edit / Reports
export default function PlatformShell() {
  return (
    <Suspense fallback={<PlatformShellFallback />}>
      <PlatformShellInner />
    </Suspense>
  )
}

function PlatformShellInner() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  // Read ?tab= from the URL. Default to 'demo'. If a non-admin tries to
  // view 'admin', fall back to 'demo'.
  let tab = searchParams?.get('tab') || 'demo'
  const validTabs = ['demo', 'integrations', 'support', 'reports', 'admin']
  if (!validTabs.includes(tab)) tab = 'demo'
  if (tab === 'admin' && !isAdmin) tab = 'demo'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {tab === 'demo' && <DemoMainTab />}
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'support' && <SupportTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'admin' && isAdmin && <GlobalAdminTab />}
    </div>
  )
}

function PlatformShellFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  )
}
