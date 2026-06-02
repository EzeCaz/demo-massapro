'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/hooks/useLanguage'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <SessionProvider
      // Refetch session every 5 minutes to keep it fresh
      refetchInterval={5 * 60}
      // Also refetch when window regains focus (tab switch back)
      refetchOnWindowFocus={true}
    >
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
