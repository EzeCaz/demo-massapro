import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root page — server-side redirect based on session role.
 *
 * Per Task 21: all authenticated users land on the new MassaPro Demo
 * Platform (/platform) which contains the Demo / Set Up / Support /
 * Reporting / Profile / Global Admin tabs.
 *
 * Share sessions (magic-link) keep going to /s/[token].
 */
export default async function HomePage() {
  let session = null

  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    // Database not ready yet — redirect to login page
    console.error('[page] getServerSession error:', error)
    redirect('/login')
  }

  if (session?.user) {
    const role = (session.user as any).role
    if (role === 'share') {
      // Share sessions stay on their magic-link scoped setup
      const setupId = (session.user as any).shareSetupId || ''
      redirect(`/s/${setupId || ''}`)
    }
    // All other users go to the platform (Demo tab by default)
    redirect('/platform?tab=demo')
  }

  redirect('/login')
}

