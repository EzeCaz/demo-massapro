import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/nda-snapshots/[id]/sign — e-sign the NDA with an automatic timestamp
//
// Body: { signedBy: string (name), role: 'sinba' | 'recipient' }
// Returns: { snapshot: updated snapshot with signedAt + signedBy in payload }
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
    const { signedBy, role, signatureImage } = body

    if (!signedBy || !role) {
      return NextResponse.json({ error: 'signedBy and role are required' }, { status: 400 })
    }

    // Add the e-signature to the payload with an automatic timestamp.
    // signatureImage is an optional base64 PNG/JPG data URL from the
    // SignaturePad component (hand-drawn or uploaded).
    const payload = snapshot.payload as any
    const now = new Date().toISOString()
    if (!payload.signatures) payload.signatures = {}
    payload.signatures[role] = {
      signedBy,
      signedAt: now,
      signedByEmail: user.email || '',
      ...(signatureImage ? { image: signatureImage } : {}),
    }

    // Update the status to 'signed' when both parties have signed
    const sinbaSigned = !!payload.signatures.sinba
    const recipientSigned = !!payload.signatures.recipient
    const newStatus = sinbaSigned && recipientSigned ? 'signed' : 'sent'

    const updated = await db.nDASnapshot.update({
      where: { id },
      data: {
        payload,
        status: newStatus,
      },
    })

    return NextResponse.json({
      snapshot: updated,
      signature: payload.signatures[role],
    })
  } catch (e: any) {
    console.error('[api/nda-snapshots/[id]/sign POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
