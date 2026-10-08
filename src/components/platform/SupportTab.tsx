'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LifeBuoy, LayoutPanelLeft } from 'lucide-react'
import SupportSubmitTicketSubTab from './SupportSubmitTicketSubTab'
import SupportPanelSubTab from './SupportPanelSubTab'

// SupportTab — the "Support" main tab.
//
// Per the user's confirmed sitemap:
//   )Support
//     -Submit ticket
//     -Panel
//
// Two sub-tabs:
//   - Submit ticket: the support request form (title / CC / subject /
//     description / priority / attachments)
//   - Panel: the user's submitted tickets (or all tickets for admins),
//     with a detail dialog showing attachments and CC emails
export default function SupportTab() {
  const { t } = useLanguage()
  const [sub, setSub] = useState<string>('submit')

  return (
    <div className="space-y-4">
      <Tabs value={sub} onValueChange={setSub} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="submit" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LifeBuoy className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.support.submit')}</span>
          </TabsTrigger>
          <TabsTrigger value="panel" className="flex items-center gap-1.5 text-xs sm:text-sm">
            <LayoutPanelLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('platform.tab.support.panel')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="focus-visible:outline-none">
          <SupportSubmitTicketSubTab />
        </TabsContent>
        <TabsContent value="panel" className="focus-visible:outline-none">
          <SupportPanelSubTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
