import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/nda-share-lookup?token=<inviteToken>
//
// Public endpoint — no auth required. Looks up an NDA snapshot by its
// invite token and returns the NDA details (recipient name, email, etc.)
// so the invited recipient can fill in their details and sign.
//
// Returns: { snapshot: { id, name, payload: { cover, signatures } } }
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

    // Find the NDA snapshot with this invite token in its payload.
    // Prisma JSON filtering for nested array elements is unreliable,
    // so we fetch all snapshots and filter in JS (invite tokens are
    // 24-byte random hex — collision is negligible).
    const allSnapshots = await db.nDASnapshot.findMany({
      select: { id: true, name: true, payload: true },
    })
    const snapshot = allSnapshots.find((s) => {
      const payload = s.payload as any
      const invites = payload?.invites || []
      return invites.some((inv: any) => inv.token === token)
    })

    if (!snapshot) {
      return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 404 })
    }

    const payload = snapshot.payload as any

    // Verify the token hasn't expired
    const invites = payload.invites || []
    const invite = invites.find((inv: any) => inv.token === token)
    if (!invite) return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 })

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 410 })
    }

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        name: snapshot.name,
        payload: {
          cover: payload.cover,
          signatures: payload.signatures || {},
        },
      },
      invite: {
        email: invite.email,
        role: invite.role,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
      },
    })
  } catch (e: any) {
    console.error('[api/nda-share-lookup GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
