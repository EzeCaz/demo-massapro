import { Suspense } from 'react'
import NDABuilder from '@/components/NDABuilder'

export const dynamic = 'force-dynamic'

export default function NDAPage({ searchParams }: { searchParams: Promise<{ snapshot?: string }> }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>}>
      <NDAPageInner searchParams={searchParams} />
    </Suspense>
  )
}

async function NDAPageInner({ searchParams }: { searchParams: Promise<{ snapshot?: string }> }) {
  const { snapshot } = await searchParams
  return (
    <div className="min-h-screen bg-background">
      <NDABuilder snapshotId={snapshot} />
    </div>
  )
}
