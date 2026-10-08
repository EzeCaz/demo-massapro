import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MassaProHeader from '@/components/MassaProHeader'
import PlatformShell from '@/components/platform/PlatformShell'

export const metadata = {
  title: 'MassaPro — Demo Platform',
  description: 'MassaPro Demo Platform — demos, setups, support, reporting, profile and global admin.',
}

// /platform — the new MassaPro Demo Platform (Task 21).
//
// Tabbed experience:
//   Demo  |  Set Up  |  Support  |  Reporting  |  Profile  |  Global Admin (admin+super_admin)
//
// "Set Up" itself has sub-tabs: SOW (specs / tasks / form) + Integrations.
//
// Auth: any authenticated non-share user can land here. The Global Admin
// tab is rendered conditionally inside PlatformShell based on role.
export default async function PlatformPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if ((session.user as any).role === 'share') redirect('/s/' + ((session.user as any).shareSetupId || ''))

  return (
    <div className="min-h-screen bg-background">
      <MassaProHeader />
      <PlatformShell />
    </div>
  )
}
