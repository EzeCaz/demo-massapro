'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText } from 'lucide-react'
import DemoTab from './DemoTab'
import ScenariosTab from './ScenariosTab'
import ExportTab from './ExportTab'

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
export default function DemoMainTab() {
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
