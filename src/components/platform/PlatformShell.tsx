'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, Plug, LifeBuoy, BarChart3, Shield,
} from 'lucide-react'
import DemoTab from './DemoTab'
import ScenariosTab from './ScenariosTab'
import ExportTab from './ExportTab'
import IntegrationsTab from './IntegrationsTab'
import SupportTab from './SupportTab'
import ReportsTab from './ReportsTab'
import GlobalAdminTab from './GlobalAdminTab'

// PlatformShell — top-level tabbed container for the MassaPro Demo Platform
// (Task 24 — restructured to the user's confirmed sitemap).
//
// 5 main tabs (the 5th visible only to admin + super_admin):
//   )Demo              — Demo / Scenarios / Export sub-tabs
//   )Integrations      — Integration Setup / SOW sub-tabs (SOW has its own
//                        sub-sub-tab: SOW Builder)
//   )Support           — Submit ticket / Panel sub-tabs
//   )Reports           — Summary / Demos / Integrations and SOW / Support sub-tabs
//   )Global admin      — User Management (with sub-sub-tabs: User Management /
//                        Companies / Teams) / SOW Form Edit / Integration Form
//                        Edit / Reports
//
// Hierarchy notation:
//   ) = main menu
//   - = sub-tab
//   * = sub-sub-tab
export default function PlatformShell() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  const [tab, setTab] = useState<string>('demo')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {t('platform.title')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t('platform.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList
          className="grid w-full mb-6"
          style={{ gridTemplateColumns: isAdmin ? 'repeat(5, 1fr)' : 'repeat(4, 1fr)' }}
        >
          <TabsTrigger value="demo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.demo')}</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.integrations')}</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LifeBuoy className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.support')}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.reports')}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('platform.tab.admin')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="demo" className="focus-visible:outline-none">
          <DemoMainTab />
        </TabsContent>
        <TabsContent value="integrations" className="focus-visible:outline-none">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="support" className="focus-visible:outline-none">
          <SupportTab />
        </TabsContent>
        <TabsContent value="reports" className="focus-visible:outline-none">
          <ReportsTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="admin" className="focus-visible:outline-none">
            <GlobalAdminTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// =========================================================================
// DemoMainTab — the "Demo" main tab.
//
// Per the user's confirmed sitemap:
//   )Demo
//     -Demo
//     -Scenarios
//     -Export
//
// 3 sub-tabs: Demo (list + create), Scenarios (list grouped by Demo +
// create with Demo selector), Export (only data the user can see).
// =========================================================================
function DemoMainTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('demo')

  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="demo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.demo')}</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.scenarios')}</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.export')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="focus-visible:outline-none">
          <DemoTab />
        </TabsContent>
        <TabsContent value="scenarios" className="focus-visible:outline-none">
          <ScenariosTab />
        </TabsContent>
        <TabsContent value="export" className="focus-visible:outline-none">
          <ExportTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
