'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { Eye, EyeOff, Mail, Lock, User, Building2 } from 'lucide-react'

export default function LoginPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
    confirmPassword: '',
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('Please fill in all fields')
      return
    }
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: form.email,
        password: form.password,
      })

      if (result?.error) {
        toast.error('Invalid email or password')
        setLoading(false)
        return
      }

      // Sign-in succeeded — use hard navigation (window.location.href) to force
      // a full page reload. Client-side router.push() can cause redirect loops
      // because the useSession() hook may still return stale "unauthenticated"
      // state before the session cookie has fully propagated through the
      // NextAuth provider chain. A hard reload ensures the server reads the
      // fresh session cookie directly.
      await new Promise(r => setTimeout(r, 300))

      // Fetch the session to determine where to redirect
      try {
        const sessionRes = await fetch('/api/auth/session')
        const sessionData = await sessionRes.json()
        const userRole = sessionData?.user?.role

        if (userRole === 'admin' || userRole === 'super_admin') {
          window.location.href = '/admin'
        } else {
          window.location.href = '/dashboard'
        }
      } catch {
        // Fallback — go to dashboard (server-side root redirect will fix it)
        window.location.href = '/dashboard'
      }
    } catch (err) {
      toast.error('An error occurred during sign-in')
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.name) {
      toast.error('Please fill in all required fields')
      return
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          company: form.company,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Account created! Please sign in.')
        setIsSignUp(false)
        setForm(prev => ({ ...prev, password: '', confirmPassword: '' }))
      } else {
        toast.error(data.error || 'Registration failed')
      }
    } catch (error) {
      toast.error('An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy via-[#1E293B] to-[#0F172A] p-4">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <img
            src="/massapro-logo.png"
            alt="MassaPro"
            className="h-16 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-montserrat)' }}>
            {t('login.title')}
          </h1>
          <p className="text-blue-200 mt-2">{t('login.subtitle')}</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex rounded-lg bg-muted p-1">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  !isSignUp ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => setIsSignUp(false)}
              >
                {t('login.signin')}
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  isSignUp ? 'bg-white shadow text-foreground' : 'text-muted-foreground'
                }`}
                onClick={() => setIsSignUp(true)}
              >
                {t('login.signup')}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">{t('login.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="company">{t('login.company')}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Company name"
                      value={form.company}
                      onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('login.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
                    {t('general.loading')}
                  </span>
                ) : isSignUp ? (
                  t('login.signup')
                ) : (
                  t('login.signin')
                )}
              </Button>

              {/* Forgot Password */}
              {!isSignUp && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => toast.info(t('login.comingSoon'))}
                    className="text-xs text-vivid-blue hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
              )}

              {/* Google Sign In */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => {
                  setLoading(true)
                  // Redirect-based Google sign-in — NextAuth handles the full OAuth flow
                  // and returns to /dashboard (or /admin for admins) after success.
                  signIn('google', { callbackUrl: '/dashboard' })
                }}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('login.googleSignin')}
              </Button>
            </form>

            {/* Toggle Sign In/Sign Up */}
            <div className="mt-4 text-center text-sm">
              {!isSignUp ? (
                <span className="text-muted-foreground">
                  {t('login.noAccount')}{' '}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="text-vivid-blue hover:underline font-medium"
                  >
                    {t('login.signup')}
                  </button>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {t('login.hasAccount')}{' '}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="text-vivid-blue hover:underline font-medium"
                  >
                    {t('login.signin')}
                  </button>
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
