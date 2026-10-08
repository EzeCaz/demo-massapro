'use client'

import SOWBuilder from '@/components/SOWBuilder'

// Client wrapper that passes the snapshotId from the URL search param to
// the SOWBuilder. The server page (page.tsx) reads the param and passes
// it down here as a prop.
export default function SOWBuilderPage({ snapshotId }: { snapshotId: string }) {
  return <SOWBuilder snapshotId={snapshotId || undefined} />
}
