import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'

// POST /api/nda-snapshots/[id]/invite — generate a magic share link for the
// recipient to sign the NDA.
//
// Body: { email: string (recipient email to invite) }
// Returns: { inviteToken: string, inviteUrl: string }
//
// The invite token is stored in the NDA payload so the recipient can access
// the NDA Builder in "sign-only" mode via /nda?invite=<token>.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const snapshot = await db.nDASnapshot.findUnique({ where: { id } })
    if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = snapshot.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { email } = body
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    // Generate a secure invite token
    const inviteToken = randomBytes(24).toString('hex')
    const inviteExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Store the invite in the payload
    const payload = snapshot.payload as any
    if (!payload.invites) payload.invites = []
    payload.invites.push({
      token: inviteToken,
      email,
      role: 'recipient',
      createdAt: new Date().toISOString(),
      expiresAt: inviteExpiresAt.toISOString(),
    })

    await db.nDASnapshot.update({
      where: { id },
      data: { payload },
    })

    // Build the invite URL
    const origin = req.nextUrl.origin
    const inviteUrl = `${origin}/nda?invite=${inviteToken}`

    return NextResponse.json({
      inviteToken,
      inviteUrl,
      email,
      expiresAt: inviteExpiresAt.toISOString(),
    })
  } catch (e: any) {
    console.error('[api/nda-snapshots/[id]/invite POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
