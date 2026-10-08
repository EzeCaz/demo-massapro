import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MassaProHeader from '@/components/MassaProHeader'
import SOWBuilderPage from './SOWBuilderPage'

export const metadata = {
  title: 'MassaPro — SOW Builder',
  description: 'Interactive Statement of Work builder — MassaPro branded.',
}

// Server component — gates on auth, then renders the client page which
// reads the ?snapshot= query param and passes it to SOWBuilder.
export default async function SOWPage({
  searchParams,
}: {
  searchParams: Promise<{ snapshot?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if ((session.user as any).role === 'share') {
    redirect('/s/' + ((session.user as any).shareSetupId || ''))
  }

  const sp = await searchParams
  const snapshotId = sp.snapshot || ''

  return (
    <div className="min-h-screen bg-white">
      <MassaProHeader />
      <SOWBuilderPage snapshotId={snapshotId} />
    </div>
  )
}
