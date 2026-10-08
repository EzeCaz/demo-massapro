import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import MassaProHeader from '@/components/MassaProHeader'
import PlatformShell from '@/components/platform/PlatformShell'

export const metadata = {
  title: 'MassaPro — Demo Platform',
  description: 'MassaPro Demo Platform — demos, integrations, support, reporting, profile and global admin.',
}

// /platform — the MassaPro Demo Platform (Task 25 restructure).
//
// The 5 main tabs (Demo / Integrations / Support / Reports / Global Admin)
// live in the HEADER as the top-level navigation. Each links to
// /platform?tab=<name>. PlatformShell reads the ?tab= param and renders
// only that tab's content (with its own sub-tabs). No duplicate
// top-level tab strip in the body.
//
// Auth: any authenticated non-share user can land here. The Global Admin
// tab is rendered conditionally inside PlatformShell based on role.
//
// Suspense boundary is required because PlatformShell uses
// useSearchParams() (Next.js 15 requirement).
export default async function PlatformPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if ((session.user as any).role === 'share') redirect('/s/' + ((session.user as any).shareSetupId || ''))

  return (
    <div className="min-h-screen bg-background">
      <MassaProHeader />
      <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8 text-muted-foreground">Loading…</div>}>
        <PlatformShell />
      </Suspense>
    </div>
  )
}
