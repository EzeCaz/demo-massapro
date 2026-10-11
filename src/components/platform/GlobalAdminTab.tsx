'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, FileText, Plug, BarChart3, Shield, FileSignature } from 'lucide-react'
import UserManagementSubTab from './UserManagementSubTab'
import SOWFormEditSubTab from './SOWFormEditSubTab'
import NDAFormEditSubTab from './NDAFormEditSubTab'
import IntegrationEditSubTab from './IntegrationEditSubTab'
import AdminReportsSubTab from './AdminReportsSubTab'

// GlobalAdminTab — admin + super_admin only.
//
// 5 sub-tabs (per the user's brief):
//   A) User management: team, company, emails, personal & professional
//      details, LinkedIn account, etc. (super_admin only on mutations)
//   B) SOW form edit using AI (add new file or edit existing SOW details + tasks)
//   C) NDA form edit — list all NDAs grouped by recipient, e-signature status
//   D) Integration form edit
//   E) Reports
export default function GlobalAdminTab() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role
  const isSuperAdmin = userRole === 'super_admin'

  const [sub, setSub] = useState<string>('users')

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#9333EA' }}>
          <Shield className="h-5 w-5" />
          {t('admin.title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.subtitle')}</p>
      </div>

      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.admin.users')}</span>
          </TabsTrigger>
          <TabsTrigger value="sow" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.admin.sowEdit')}</span>
          </TabsTrigger>
          <TabsTrigger value="nda" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileSignature className="h-4 w-4" />
            <span className="hidden sm:inline">NDA Form Edit</span>
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.admin.integrationEdit')}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.admin.reports')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="focus-visible:outline-none">
          <UserManagementSubTab isSuperAdmin={isSuperAdmin} />
        </TabsContent>
        <TabsContent value="sow" className="focus-visible:outline-none">
          <SOWFormEditSubTab />
        </TabsContent>
        <TabsContent value="nda" className="focus-visible:outline-none">
          <NDAFormEditSubTab />
        </TabsContent>
        <TabsContent value="integration" className="focus-visible:outline-none">
          <IntegrationEditSubTab />
        </TabsContent>
        <TabsContent value="reports" className="focus-visible:outline-none">
          <AdminReportsSubTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
