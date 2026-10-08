'use client'

import dynamic from 'next/dynamic'

// SOWFormSubTab — the full SOW Builder UI embedded inline. Reuses the
// existing SOWBuilder component (which manages its own localStorage state).
const SOWBuilder = dynamic(() => import('@/components/SOWBuilder'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground">Loading SOW Builder…</div>
    </div>
  ),
})

export default function SOWFormSubTab() {
  return <SOWBuilder />
}
