// Helpers for magic-link share sessions.
//
// A "share session" is one where the user signed in via a /s/[token] magic
// link (role === 'share'). Such sessions are scoped to a SINGLE
// IntegrationSetup row — they can read it (and edit it if the share's
// accessLevel is 'edit') but cannot see any other setup, scenario, or
// page in the app. These helpers centralize the scope checks so the API
// routes stay readable.

import { db } from '@/lib/db'

export interface ShareScope {
  isShare: boolean
  setupId: string | null
  accessLevel: 'view' | 'edit' | null
  email: string | null
}

// Inspect a NextAuth session and return a ShareScope describing what the
// share user is allowed to access. Returns isShare=false for normal users
// (their access is governed by the existing owner/admin logic).
export function readShareScope(sessionUser: any): ShareScope {
  if (!sessionUser) {
    return { isShare: false, setupId: null, accessLevel: null, email: null }
  }
  if (sessionUser.role !== 'share') {
    return { isShare: false, setupId: null, accessLevel: null, email: null }
  }
  return {
    isShare: true,
    setupId: sessionUser.shareSetupId || null,
    accessLevel: (sessionUser.shareAccessLevel === 'edit' ? 'edit' : 'view'),
    email: sessionUser.shareEmail || null,
  }
}

// Verify that a share session is still valid (the share row still exists
// and the token hasn't been revoked). Returns the share row if valid,
// null otherwise. The session-side check is intentionally stateless —
// we look up the share by id stored on the JWT each time.
export async function verifyShareSession(sessionUser: any) {
  const scope = readShareScope(sessionUser)
  if (!scope.isShare || !scope.setupId) return null
  // The share's id is encoded in sessionUser.id as `share:<shareId>`.
  // We extract it and look up the row to ensure it still exists.
  const shareId = typeof sessionUser.id === 'string' && sessionUser.id.startsWith('share:')
    ? sessionUser.id.slice('share:'.length)
    : null
  if (!shareId) return null
  const share = await db.integrationSetupShare.findUnique({
    where: { id: shareId },
    select: { id: true, setupId: true, email: true, accessLevel: true },
  })
  return share
}
