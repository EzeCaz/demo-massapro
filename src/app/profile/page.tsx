import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MassaProHeader from '@/components/MassaProHeader'
import ProfileTab from '@/components/platform/ProfileTab'

export const metadata = {
  title: 'MassaPro — Profile',
  description: 'Edit your MassaPro profile.',
}

// /profile — dedicated page for the user's profile (linked from the
// avatar dropdown menu). Renders the same ProfileTab used by the platform.
export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login')
  if ((session.user as any).role === 'share') {
    redirect('/s/' + ((session.user as any).shareSetupId || ''))
  }

  return (
    <div className="min-h-screen bg-background">
      <MassaProHeader />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileTab />
      </div>
    </div>
  )
}
