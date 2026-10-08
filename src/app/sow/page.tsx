import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MassaProHeader from '@/components/MassaProHeader'
import SOWBuilder from '@/components/SOWBuilder'

export const metadata = {
  title: 'MassaPro — SOW Builder',
  description: 'Interactive Statement of Work builder — MassaPro branded.',
}

// This is a client-interactive page (the SOWBuilder component uses useState,
// useEffect, localStorage). We keep the page itself as a server component
// that gates on auth, then renders the header + the client builder.
export default async function SOWPage() {
  const session = await getServerSession(authOptions)

  // Allow all authenticated users (admin, user, super_admin, share).
  // Share-scoped sessions can build SOWs locally too — the SOW is purely
  // client-side, no backend persistence.
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-white">
      <MassaProHeader />
      <SOWBuilder />
    </div>
  )
}
