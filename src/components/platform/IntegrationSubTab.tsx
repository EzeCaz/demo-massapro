'use client'

import dynamic from 'next/dynamic'

// IntegrationSubTab — embeds the existing IntegrationSetupList (the list
// of integration setups the user can create/edit/share). Loads dynamically
// to keep the platform bundle small.
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

export default function IntegrationSubTab() {
  return <IntegrationSetupList />
}
