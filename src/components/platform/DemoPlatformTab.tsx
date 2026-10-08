'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FileText, Download } from 'lucide-react'
import DemoSubTab from './DemoSubTab'
import ScenariosSubTab from './ScenariosSubTab'
import ExportSubTab from './ExportSubTab'

// DemoPlatformTab — the new "Demo Platform" main tab with 3 sub-tabs:
//   - Demo       · [+ Create new Demo] button (opens naming dialog)
//   - Scenarios  · [+ Create new Scenario] button (opens naming dialog
//                 with Demo selector)
//   - Export     · only exports data the user can see (Rule 4A)
//
// Each sub-tab enforces the per-user visibility rule (see /api/demos and
// /api/scenarios): super_admin sees all; regular users see only Demos /
// Scenarios where they have access.
export default function DemoPlatformTab() {
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
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.scenarios')}</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.export')}</span>
          </TabsTrigger>
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
      </Tabs>
    </div>
  )
}
