'use client'

import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import DemoMainTab from './DemoMainTab'
import IntegrationsTab from './IntegrationsTab'
import SupportTab from './SupportTab'
import ReportsTab from './ReportsTab'
import GlobalAdminTab from './GlobalAdminTab'

// PlatformShell — renders the content for the active main tab.
//
// Per Task 25: the 5 main tabs (Demo / Integrations / Support / Reports /
// Global Admin) live in the HEADER as the top-level navigation. Each
// header tab links to /platform?tab=<name>. This component reads the
// active tab from the URL and renders only that tab's content (which
// includes its own sub-tabs). No top-level TabsList here — that would
// duplicate the header's navigation and make the body tabs look like
// sub-menu items under "Platform".
//
// Hierarchy:
//   )Demo              — 3 sub-tabs (Demo / Scenarios / Export)
//   )Integrations      — 2 sub-tabs (Integration Setup / SOW → SOW Builder)
//   )Support           — 2 sub-tabs (Submit ticket / Panel)
//   )Reports           — 4 sub-tabs (Summary / Demos / Integrations and SOW / Support)
//   )Global admin      — 4 sub-tabs (User Management → User Mgmt/Companies/Teams /
//                        SOW Form Edit / Integration Form Edit / Reports)
export default function PlatformShell() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') || 'demo'

  // Guard: if the user is not admin but the tab is 'admin', fall back to 'demo'
  const activeTab = tab === 'admin' && !isAdmin ? 'demo' : tab

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {t('platform.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('platform.subtitle')}</p>
      </div>

      {activeTab === 'demo' && <DemoMainTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'support' && <SupportTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'admin' && isAdmin && <GlobalAdminTab />}
      {!['demo', 'integrations', 'support', 'reports', 'admin'].includes(activeTab) && <DemoMainTab />}
    </div>
  )
}
