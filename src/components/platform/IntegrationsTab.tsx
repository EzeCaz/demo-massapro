'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plug, FileText, Edit3 } from 'lucide-react'
import IntegrationSetupSubTab from './IntegrationSetupSubTab'
import SOWSubTab from './SOWSubTab'
import SOWBuilderSubTab from './SOWBuilderSubTab'

// IntegrationsTab — the "Integrations" main tab.
//
// Per the user's confirmed sitemap:
//   )Integrations
//     -Integration Setup
//     -SOW
//       *SOW Builder   ← sub-sub-tab
//
// So SOW has its own sub-tab list with a single child: SOW Builder.
// The SOW sub-tab is itself a tab container that hosts the SOW Builder
// (the interactive builder UI) plus the list of saved SOWs.
export default function IntegrationsTab() {
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
            <span className="hidden sm:inline">{t('platform.tab.sow')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integration-setup" className="focus-visible:outline-none">
          <IntegrationSetupSubTab />
        </TabsContent>
        <TabsContent value="sow" className="focus-visible:outline-none">
          {/* SOW sub-tab hosts the SOW Builder sub-sub-tab */}
          <SOWSubTabWithBuilder />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// SOWSubTabWithBuilder — the SOW sub-tab contains a sub-sub-tab strip
// with a single child: SOW Builder. The SOW Builder sub-sub-tab embeds
// the SOWSubTab component (list of saved SOWs + Create new SOW dialog +
// per-SOW actions) which IS the SOW Builder interface for the platform.
function SOWSubTabWithBuilder() {
  const { t } = useLanguage()
  const [subSub, setSubSub] = useState<string>('builder')

  return (
    <div className="space-y-3">
      <Tabs value={subSub} onValueChange={setSubSub}>
        <TabsList className="mb-3">
          <TabsTrigger value="builder" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Edit3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.sow.builder')}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="builder" className="focus-visible:outline-none">
          <SOWBuilderSubTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
