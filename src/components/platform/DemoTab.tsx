'use client'

import dynamic from 'next/dynamic'

// DemoTab — embeds the existing DemoDashboard (the scenarios table the
// user uses to manage their demo scenarios). We load it dynamically so
// the heavy DemoDashboard bundle only loads when the user clicks the
// "Demo" tab (faster initial page load).
const DemoDashboard = dynamic(() => import('@/components/DemoDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-pulse text-muted-foreground">Loading demo…</div>
    </div>
  ),
})

export default function DemoTab() {
  return <DemoDashboard />
}
