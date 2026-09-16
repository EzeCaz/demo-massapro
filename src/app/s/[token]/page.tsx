'use client'

import { use, useEffect, useState, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import IntegrationSetupForm from '@/components/IntegrationSetupForm'
import { Loader2, ShieldCheck, AlertTriangle, Plug } from 'lucide-react'

// Public magic-link page. The visitor arrives with a token in the URL.
// We sign them in via NextAuth credentials provider (passing the token
// as `magicToken`), then render the IntegrationSetupForm for the one
// setup the share is scoped to.
//
// This page deliberately has NO app header / nav / footer — the share
// user can only see this single setup, not the dashboard, other setups,
// scenarios, or the admin panel.
export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { data: session, status } = useSession()
  const [shareInfo, setShareInfo] = useState<{
    setupId: string
    setupName: string
    setupStatus: string
    accessLevel: string
    maskedEmail: string
  } | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [signInError, setSignInError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const hasTriedSignIn = useRef(false)

  // 1. Look up the share metadata so we can render the intro screen.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/share-lookup?token=${encodeURIComponent(token)}`)
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setLookupError(data.error || 'Invalid link')
          return
        }
        setShareInfo(data)
      } catch (e) {
        if (!cancelled) setLookupError('Failed to look up share')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  // 2. If we have share info AND the user isn't signed in yet, sign them
  //    in with the magic token. We only attempt this once per visit.
  //
  //    Edge case: if a normal (non-share) MassaPro user is already signed
  //    in and opens a magic link, we DON'T sign them in as a share user —
  //    that would lose their existing session. They see a notice asking
  //    them to open the link in an incognito window instead.
  useEffect(() => {
    if (!shareInfo) return
    if (status !== 'authenticated') return
    if (hasTriedSignIn.current) return

    const userRole = (session?.user as any)?.role
    if (userRole === 'share') {
      // Already signed in as the right share user — nothing to do.
      return
    }
    // Already signed in as a normal user — refuse to overwrite their
    // session; show a notice instead.
    hasTriedSignIn.current = true
    setSignInError("You're already signed in to MassaPro. Open this link in a private/incognito window, or sign out first.")
  }, [shareInfo, status, session])

  // 3. Not yet signed in — sign in with the magic token (once).
  useEffect(() => {
    if (!shareInfo) return
    if (status === 'authenticated') return
    if (hasTriedSignIn.current) return
    hasTriedSignIn.current = true
    setSigningIn(true)
    ;(async () => {
      try {
        const result = await signIn('credentials', {
          magicToken: token,
          email: 'magic',
          password: 'magic',
          redirect: false,
        })
        if (result?.error) {
          setSignInError(result.error)
        }
      } catch (e) {
        setSignInError('Sign-in failed')
      } finally {
        setSigningIn(false)
      }
    })()
  }, [shareInfo, status, token])

  // ===== States =====

  // Lookup failed (invalid/expired token)
  if (lookupError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="text-muted-foreground text-sm">
            {lookupError}. The link may have been revoked, or the setup may have been deleted.
          </p>
          <p className="text-xs text-muted-foreground">
            Please ask the person who shared this with you to send a new link.
          </p>
        </div>
      </div>
    )
  }

  // Still looking up the share
  if (!shareInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-vivid-blue mx-auto" />
          <p className="text-sm text-muted-foreground">Loading shared setup…</p>
        </div>
      </div>
    )
  }

  // Looked up OK but sign-in failed
  if (signInError && status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md text-center space-y-3">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <h1 className="text-xl font-semibold">Sign-in failed</h1>
          <p className="text-muted-foreground text-sm">{signInError}</p>
        </div>
      </div>
    )
  }

  // Signing in via the magic token
  if (signingIn && status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-vivid-blue mx-auto" />
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      </div>
    )
  }

  // Not yet authenticated (waiting for useSession to update after signIn)
  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-vivid-blue" />
      </div>
    )
  }

  // Authenticated! Show the intro banner + the form.
  // The session is share-scoped (role === 'share'), so the API will only
  // allow access to this one setup.
  const accessVerb = shareInfo.accessLevel === 'edit' ? 'edit' : 'view'

  return (
    <div className="min-h-screen bg-background">
      {/* Branded intro banner — NOT the app header. This is the only
          MassaPro chrome the share user sees. */}
      <div className="mp-navy border-b border-white/10">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <img src="/massapro-logo.png" alt="MassaPro" className="h-7 w-auto" />
            <span className="text-white font-semibold text-sm">MassaPro</span>
            <span className="text-white/40 text-xs">·</span>
            <span className="text-white/70 text-xs">Integration Setup</span>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>
              You're signed in as {shareInfo.maskedEmail} · {accessVerb} access
            </span>
          </div>
        </div>
      </div>

      {/* The setup name banner — gives the share user context about which
          setup they're filling out. */}
      <div className="bg-vivid-blue/10 border-b">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-vivid-blue" />
            <div>
              <h1 className="text-lg font-semibold">{shareInfo.setupName}</h1>
              <p className="text-xs text-muted-foreground">
                Status: {shareInfo.setupStatus}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* The IntegrationSetupForm reads the session's share scope and
            the API enforces access — the form itself doesn't need to know
            whether it's running in owner or share mode. The only UI
            difference: share users don't see the Submit / Delete buttons
            (handled inside the form via session.user.role === 'share'). */}
        <IntegrationSetupForm setupId={shareInfo.setupId} />
      </main>

      <footer className="mt-auto border-t bg-muted/30">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} MassaPro · Shared link
        </div>
      </footer>
    </div>
  )
}
