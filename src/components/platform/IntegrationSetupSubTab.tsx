'use client'

import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'

const ORCHID = '#9333EA'
const LAVENDER = '#F3E8FF'

// IntegrationSetupSubTab — embeds the existing IntegrationSetupList
// (the list of integration setups the user can create/edit/share).
// The "+ Add new Set Up" button is rendered by the IntegrationSetupList
// component itself (the existing UI already has this button).
const IntegrationSetupList = dynamic(
  () => import('@/components/IntegrationSetupList'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading integrations…</div>
      </div>
    ),
  }
)

export default function IntegrationSetupSubTab() {
  const { t } = useLanguage()
  return (
    <Card style={{ borderColor: LAVENDER }}>
      <CardHeader style={{ borderBottom: `2px solid ${LAVENDER}` }}>
        <CardTitle className="flex items-center gap-2" style={{ color: ORCHID }}>
          <Plus className="h-5 w-5" />
          {t('platform.tab.integration.setup')}
        </CardTitle>
        <CardDescription>{t('admin.integration.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <IntegrationSetupList />
      </CardContent>
    </Card>
  )
}
