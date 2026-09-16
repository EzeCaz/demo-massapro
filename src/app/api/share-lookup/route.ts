import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/share-lookup?token=...
//
// PUBLIC endpoint (no session) used by the /s/[token] page to fetch
// metadata about a share BEFORE consuming the magic token to sign the
// visitor in. Returns only the minimal info needed to render the
// "You've been invited to view X" intro screen:
//   { setupName, accessLevel, email (masked) }
//
// The token itself remains the secret — we don't return it and we don't
// reveal anything sensitive (the owner's identity, other shares, etc.).
// If the token doesn't exist we return 404; the page shows an
// "invalid/expired link" message.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')?.trim()
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const share = await db.integrationSetupShare.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        accessLevel: true,
        setup: { select: { id: true, name: true, status: true } },
      },
    })

    if (!share) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 })
    }

    // Mask the email — show local part + first 2 chars of domain so the
    // user can confirm it's theirs without us leaking the full address.
    const [local, domain] = share.email.split('@')
    const maskedEmail = `${local?.slice(0, 2)}${'*'.repeat(Math.max(0, (local?.length || 2) - 2))}@${domain?.slice(0, 2)}***`

    return NextResponse.json({
      setupId: share.setup.id,
      setupName: share.setup.name,
      setupStatus: share.setup.status,
      accessLevel: share.accessLevel,
      maskedEmail,
    })
  } catch (error) {
    console.error('Share lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
