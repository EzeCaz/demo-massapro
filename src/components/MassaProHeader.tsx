'use client'

import { useLanguage } from '@/hooks/useLanguage'
import { useAppStore } from '@/lib/store'
import { signOut, useSession } from 'next-auth/react'
import { Globe, LogOut, Shield, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function MassaProHeader() {
  const { language, setLanguage, t } = useLanguage()
  const { currentView, setCurrentView } = useAppStore()
  const { data: session } = useSession()

  const userRole = (session?.user as any)?.role
  const userName = session?.user?.name || session?.user?.email || ''

  return (
    <header className="mp-navy sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/massapro-logo.png"
              alt="MassaPro Logo"
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-montserrat)' }}>
              MassaPro
            </span>
          </div>

          {/* Right: Nav + Language + User */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* View Toggle (Admin) */}
            {userRole === 'admin' && (
              <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
                <Button
                  variant={currentView === 'admin' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('admin')}
                  className={`text-xs sm:text-sm ${currentView === 'admin' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{t('header.admin')}</span>
                </Button>
                <Button
                  variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('dashboard')}
                  className={`text-xs sm:text-sm ${currentView === 'dashboard' ? 'bg-white text-navy' : 'text-white hover:bg-white/20'}`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{t('header.dashboard')}</span>
                </Button>
              </div>
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
                  {userRole === 'admin' && (
                    <span className="inline-flex items-center gap-1 text-xs text-vivid-blue font-medium mt-1">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
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
