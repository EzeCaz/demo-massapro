'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LayoutDashboard, Settings, LifeBuoy, BarChart3, User as UserIcon, Shield,
} from 'lucide-react'
import DemoTab from './DemoTab'
import SetupTab from './SetupTab'
import SupportTab from './SupportTab'
import ReportingTab from './ReportingTab'
import ProfileTab from './ProfileTab'
import GlobalAdminTab from './GlobalAdminTab'

// PlatformShell — the top-level tabbed container for the MassaPro Demo
// Platform. Renders the right tab content based on the active tab.
//
// Tab visibility:
//   - Demo / Set Up / Support / Reporting / Profile: visible to all users
//   - Global Admin: visible only to admin + super_admin (not regular users
//     or 'demo' role, not 'share' role — share sessions are bounced at the
//     server page level before reaching here).
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
        <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: isAdmin ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' }}>
          <TabsTrigger value="demo" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.demo')}</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.setup')}</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LifeBuoy className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.support')}</span>
          </TabsTrigger>
          <TabsTrigger value="reporting" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.reporting')}</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.profile')}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('platform.tab.admin')}</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="demo" className="focus-visible:outline-none">
          <DemoTab />
        </TabsContent>
        <TabsContent value="setup" className="focus-visible:outline-none">
          <SetupTab />
        </TabsContent>
        <TabsContent value="support" className="focus-visible:outline-none">
          <SupportTab />
        </TabsContent>
        <TabsContent value="reporting" className="focus-visible:outline-none">
          <ReportingTab />
        </TabsContent>
        <TabsContent value="profile" className="focus-visible:outline-none">
          <ProfileTab />
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
