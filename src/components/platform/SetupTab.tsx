'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, ListChecks, FileEdit, Plug } from 'lucide-react'
import SOWSpecsSubTab from './SOWSpecsSubTab'
import SOWTasksSubTab from './SOWTasksSubTab'
import SOWFormSubTab from './SOWFormSubTab'
import IntegrationSubTab from './IntegrationSubTab'

// SetupTab — the "Set Up" tab of the platform.
//
// Sub-tabs:
//   - SOW > Specs   (SOWBuilder's tech specs panel, read/edit values)
//   - SOW > Tasks   (SOWBuilder's task tracker with status / owner / due / notes)
//   - SOW > Form    (the full SOWBuilder UI embedded inline)
//   - Integrations (the existing IntegrationSetupList / Form)
//
// All sub-tabs share the same localStorage state as the standalone /sow
// page, so switching between the platform and /sow shows the same data.
export default function SetupTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('sow-form')

  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sow-form" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileEdit className="h-4 w-4" />
            SOW · {t('sow.section.overview')}
          </TabsTrigger>
          <TabsTrigger value="sow-specs" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <FileText className="h-4 w-4" />
            SOW · {t('sow.specs.title')}
          </TabsTrigger>
          <TabsTrigger value="sow-tasks" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ListChecks className="h-4 w-4" />
            SOW · {t('sow.tasks.title')}
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Plug className="h-4 w-4" />
            {t('integration.title')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sow-form" className="focus-visible:outline-none">
          <SOWFormSubTab />
        </TabsContent>
        <TabsContent value="sow-specs" className="focus-visible:outline-none">
          <SOWSpecsSubTab />
        </TabsContent>
        <TabsContent value="sow-tasks" className="focus-visible:outline-none">
          <SOWTasksSubTab />
        </TabsContent>
        <TabsContent value="integration" className="focus-visible:outline-none">
          <IntegrationSubTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
