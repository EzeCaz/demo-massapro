'use client'

import { use, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import MassaProHeader from '@/components/MassaProHeader'
import IntegrationSetupForm from '@/components/IntegrationSetupForm'
import { Loader2 } from 'lucide-react'

// Client component that unwraps the params Promise (Next.js 15+ passes
// params as a Promise to client components). We use React.use() to read it.
export default function IntegrationSetupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { status } = useSession()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (status === 'loading' || hasRedirected.current) return
    if (status === 'unauthenticated') {
      hasRedirected.current = true
      window.location.href = '/login'
    }
  }, [status])

  if (status === 'loading' || status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <img src="/massapro-logo.png" alt="MassaPro" className="h-16 w-auto mx-auto mb-4" />
          <Loader2 className="h-8 w-8 animate-spin text-vivid-blue mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MassaProHeader />
      <main className="flex-1 max-w-[1536px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <IntegrationSetupForm setupId={id} />
      </main>
      <footer className="mt-auto border-t bg-muted/30">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MassaPro. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
