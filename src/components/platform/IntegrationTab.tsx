'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FileText, Plug, ListChecks } from 'lucide-react'
import IntegrationSetupSubTab from './IntegrationSetupSubTab'
import SOWSubTab from './SOWSubTab'

// IntegrationTab — new "Integration" main tab with 2 sub-tabs:
//   - Integration Setup  · [+ Add new Set Up] button (existing
//                         28-field form + share magic-link)
//   - SOW                · [+ Create new SOW] button (creates a
//                         SOWSnapshot on the platform, opens the
//                         SOW Builder for it). Each user can have
//                         multiple SOWs in parallel, each with its
//                         own name. [Download as Word] + [Download as PDF]
export default function IntegrationTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('integration-setup')

  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="integration-setup" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.integration.setup')}</span>
          </TabsTrigger>
          <TabsTrigger value="sow" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.integration.sow')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integration-setup" className="focus-visible:outline-none">
          <IntegrationSetupSubTab />
        </TabsContent>
        <TabsContent value="sow" className="focus-visible:outline-none">
          <SOWSubTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
