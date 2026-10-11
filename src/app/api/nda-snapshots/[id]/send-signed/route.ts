import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'
import {
  NDACoverInfo, NDA_SECTIONS, NDA_RECITALS,
  buildNdaIntro, buildNdaSignatures,
} from '@/lib/nda-data'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/nda-snapshots/[id]/send-signed — generate the signed PDF and
// "send" it to the provided email.
//
// Body: { email: string (where to send the signed copy) }
// Returns: { ok: true, pdfUrl: string (temporary download link) }
//
// Since we don't have an email service configured in this environment,
// we return a temporary download URL that the user can forward manually.
// In production with nodemailer/Resend/SendGrid, this would send the email
// with the PDF attached.
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

    // Check that the NDA is fully signed
    const payload = snapshot.payload as any
    const signatures = payload.signatures || {}
    if (!signatures.sinba || !signatures.recipient) {
      return NextResponse.json({ error: 'NDA must be signed by both parties before sending' }, { status: 400 })
    }

    // Store the send record
    if (!payload.sentCopies) payload.sentCopies = []
    payload.sentCopies.push({
      email,
      sentAt: new Date().toISOString(),
      sentBy: user.email || '',
    })

    await db.nDASnapshot.update({
      where: { id },
      data: { payload },
    })

    // Generate a signed copy download token (valid for 7 days)
    const { randomBytes } = await import('crypto')
    const downloadToken = randomBytes(24).toString('hex')
    if (!payload.downloadTokens) payload.downloadTokens = []
    payload.downloadTokens.push({
      token: downloadToken,
      email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await db.nDASnapshot.update({
      where: { id },
      data: { payload },
    })

    const origin = req.nextUrl.origin
    const pdfUrl = `${origin}/api/nda-snapshots/${id}/pdf?token=${downloadToken}`

    return NextResponse.json({
      ok: true,
      pdfUrl,
      email,
      sentAt: new Date().toISOString(),
      message: `Signed copy generated. Download and forward to ${email}, or share the link directly.`,
    })
  } catch (e: any) {
    console.error('[api/nda-snapshots/[id]/send-signed POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
