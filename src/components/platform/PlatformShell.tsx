'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText, ListChecks, Download, Plug, BarChart3, LifeBuoy, Shield,
} from 'lucide-react'
import DemoSubTab from './DemoSubTab'
import ScenariosSubTab from './ScenariosSubTab'
import ExportSubTab from './ExportSubTab'
import IntegrationTab from './IntegrationTab'
import ReportsTab from './ReportsTab'
import SupportTab from './SupportTab'
import GlobalAdminTab from './GlobalAdminTab'

// PlatformShell — top-level tabbed container for the MassaPro Demo
// Platform (Task 23 restructure).
//
// Per the user's brief (point 2 + 3): flatten the tab structure so all
// sections are top-level main tabs. "Demo Platform" wrapper is removed —
// Demo, Scenarios, Export are now their own top-level tabs, alongside
// Integration, Reports, Support, and Global Admin (admin+super_admin only).
//
// 7 top-level tabs (the 7th visible only to admin + super_admin):
//   1. Demo          · [+ Create new Demo] — top of the hierarchy
//   2. Scenarios     · [+ Create new Scenario] with Demo selector
//   3. Export        · only exports data the user can see
//   4. Integration   · Integration Setup + SOW sub-tabs
//   5. Reports       · Summary / Demos & Scenarios / Integrations & SOW / Support
//   6. Support       · Submit form + My tickets
//   7. Global Admin · User Mgmt / SOW Form Edit / Integration Form Edit / Reports
//
// Profile moved into the user dropdown menu (avatar → Profile + Logout).
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
          style={{ gridTemplateColumns: isAdmin ? 'repeat(7, 1fr)' : 'repeat(6, 1fr)' }}
        >
          <TabsTrigger value="demo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden lg:inline">{t('platform.tab.demo')}</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ListChecks className="h-4 w-4" />
            <span className="hidden lg:inline">{t('platform.tab.scenarios')}</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Download className="h-4 w-4" />
            <span className="hidden lg:inline">{t('platform.tab.export')}</span>
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            <span className="hidden lg:inline">{t('platform.tab.integration')}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">{t('platform.tab.reports')}</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LifeBuoy className="h-4 w-4" />
            <span className="hidden lg:inline">{t('platform.tab.support')}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden lg:inline">{t('platform.tab.admin')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="demo" className="focus-visible:outline-none">
          <DemoSubTab />
        </TabsContent>
        <TabsContent value="scenarios" className="focus-visible:outline-none">
          <ScenariosSubTab />
        </TabsContent>
        <TabsContent value="export" className="focus-visible:outline-none">
          <ExportSubTab />
        </TabsContent>
        <TabsContent value="integration" className="focus-visible:outline-none">
          <IntegrationTab />
        </TabsContent>
        <TabsContent value="reports" className="focus-visible:outline-none">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="support" className="focus-visible:outline-none">
          <SupportTab />
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
