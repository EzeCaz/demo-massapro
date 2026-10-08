'use client'

import { useLanguage } from '@/hooks/useLanguage'
import { signOut, useSession } from 'next-auth/react'
import { Globe, LogOut, Shield, Crown, Plug, FileText, UserCircle, LifeBuoy, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Suspense } from 'react'

function MassaProHeaderInner() {
  const { language, setLanguage, t } = useLanguage()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const userRole = (session?.user as any)?.role
  const userName = session?.user?.name || session?.user?.email || ''
  const activeTab = searchParams?.get('tab') || 'demo'

  return (
    <header className="mp-navy sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Brand — links to the Demo tab (platform home) */}
          <Link href="/platform?tab=demo" className="flex items-center gap-3">
            <img
              src="/massapro-logo.png"
              alt="MassaPro Logo"
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: 'var(--font-montserrat)' }}>
              MassaPro
            </span>
          </Link>

          {/* Right: Nav + Language + User */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* 5 main tabs — directly in the header (Task 25 restructure).
                Each links to /platform?tab=<name>. Global Admin is visible
                only to admin + super_admin. */}
            <Link href="/platform?tab=demo">
              <Button
                variant={pathname?.startsWith('/platform') && activeTab === 'demo' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs sm:text-sm ${pathname?.startsWith('/platform') && activeTab === 'demo' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
              >
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('platform.tab.demo')}</span>
              </Button>
            </Link>
            <Link href="/platform?tab=integrations">
              <Button
                variant={pathname?.startsWith('/platform') && activeTab === 'integrations' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs sm:text-sm ${pathname?.startsWith('/platform') && activeTab === 'integrations' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
              >
                <Plug className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('platform.tab.integrations')}</span>
              </Button>
            </Link>
            <Link href="/platform?tab=support">
              <Button
                variant={pathname?.startsWith('/platform') && activeTab === 'support' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs sm:text-sm ${pathname?.startsWith('/platform') && activeTab === 'support' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
              >
                <LifeBuoy className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('platform.tab.support')}</span>
              </Button>
            </Link>
            <Link href="/platform?tab=reports">
              <Button
                variant={pathname?.startsWith('/platform') && activeTab === 'reports' ? 'default' : 'ghost'}
                size="sm"
                className={`text-xs sm:text-sm ${pathname?.startsWith('/platform') && activeTab === 'reports' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('platform.tab.reports')}</span>
              </Button>
            </Link>
            {(userRole === 'admin' || userRole === 'super_admin') && (
              <Link href="/platform?tab=admin">
                <Button
                  variant={pathname?.startsWith('/platform') && activeTab === 'admin' ? 'default' : 'ghost'}
                  size="sm"
                  className={`text-xs sm:text-sm ${pathname?.startsWith('/platform') && activeTab === 'admin' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{t('platform.tab.admin')}</span>
                </Button>
              </Link>
            )}

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
              <Button
                variant={language === 'en' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('en')}
                className={`text-xs px-2 py-1 ${language === 'en' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
              >
                EN
              </Button>
              <Button
                variant={language === 'es' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('es')}
                className={`text-xs px-2 py-1 ${language === 'es' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
              >
                ES
              </Button>
              <Button
                variant={language === 'he' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setLanguage('he')}
                className={`text-xs px-2 py-1 ${language === 'he' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
                title="עברית"
              >
                עב
              </Button>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-white hover:bg-white/10 flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-vivid-blue text-white text-xs">
                      {userName?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm truncate max-w-[120px]">
                    {userName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session?.user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium mt-1 ${userRole === 'super_admin' ? 'text-amber-500' : 'text-vivid-blue'}`}>
                      {userRole === 'super_admin' ? <Crown className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                      {userRole === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { router.push('/profile') }}
                  className="cursor-pointer"
                >
                  <UserCircle className="h-4 w-4 mr-2" />
                  {t('profile.title')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut({ redirect: false })
                    router.replace('/login')
                  }}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('header.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

// Default export wraps the inner component in <Suspense> because
// useSearchParams() requires it (otherwise Next.js throws a
// "useSearchParams() should be wrapped in a suspense boundary" error
// during static generation).
export default function MassaProHeader() {
  return (
    <Suspense fallback={null}>
      <MassaProHeaderInner />
    </Suspense>
  )
}
