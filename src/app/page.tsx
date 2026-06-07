import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root page — server-side redirect based on session role.
 * Using getServerSession (server component) instead of useSession (client)
 * to avoid the race condition that causes redirect loops.
 *
 * If the database isn't ready yet (tables don't exist), getServerSession
 * may throw — we catch that and redirect to /login gracefully.
 */
export default async function HomePage() {
  let session = null

  try {
    session = await getServerSession(authOptions)
  } catch (error) {
    // Database not ready yet — redirect to login page
    // The login page will trigger /api/init if needed
    console.error('[page] getServerSession error:', error)
    redirect('/login')
  }

  if (session?.user) {
    // All authenticated users go to /dashboard
    // Admins can navigate to /admin from the header
    redirect('/dashboard')
  }

  redirect('/login')
}
