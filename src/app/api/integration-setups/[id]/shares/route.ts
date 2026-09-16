import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

// GET /api/integration-setups/[id]/shares — list shares for a setup.
// Only the owner (or an admin) may list.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const setup = await db.integrationSetup.findUnique({ where: { id } })
    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const shares = await db.integrationSetupShare.findMany({
      where: { setupId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(shares)
  } catch (error) {
    console.error('List integration setup shares error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integration-setups/[id]/shares — create or refresh a share
// for the given email. Body: { email, accessLevel? }.
//
// We always generate a fresh token (regenerating the magic link is the
// simplest way to "re-invite" someone). Returns the share + the absolute
// magic-link URL the owner can forward.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const setup = await db.integrationSetup.findUnique({ where: { id } })
    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const email = (body?.email || '').toString().trim().toLowerCase()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }
    const accessLevel = body?.accessLevel === 'edit' ? 'edit' : 'view'

    // Upsert: if a share already exists for this (setupId, email), refresh
    // its token + accessLevel. Otherwise create a new one.
    const existing = await db.integrationSetupShare.findUnique({
      where: { setupId_email: { setupId: id, email } },
    })

    let share
    if (existing) {
      share = await db.integrationSetupShare.update({
        where: { id: existing.id },
        data: { token: uuidv4(), accessLevel },
      })
    } else {
      share = await db.integrationSetupShare.create({
        data: { setupId: id, email, token: uuidv4(), accessLevel },
      })
    }

    // Build the absolute magic-link URL. Use the request origin so the
    // link works in both local dev and production.
    const origin = req.nextUrl.origin
    const magicLink = `${origin}/s/${share.token}`

    // Best-effort email send. We don't fail the request if email isn't
    // configured — the owner still gets the magic link in the response
    // and can forward it manually.
    let emailSent = false
    try {
      emailSent = await sendShareEmail(email, setup.name, magicLink, accessLevel)
    } catch (err) {
      console.error('Send share email failed (non-fatal):', err)
    }

    return NextResponse.json({ ...share, magicLink, emailSent }, { status: 201 })
  } catch (error) {
    console.error('Create integration setup share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integration-setups/[id]/shares?shareId=... — revoke a share.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const setup = await db.integrationSetup.findUnique({ where: { id } })
    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const shareId = searchParams.get('shareId')
    if (!shareId) {
      return NextResponse.json({ error: 'shareId is required' }, { status: 400 })
    }

    await db.integrationSetupShare.delete({ where: { id: shareId } })
    return NextResponse.json({ message: 'Share revoked' })
  } catch (error) {
    console.error('Delete integration setup share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Send a share-invitation email via SMTP if SMTP env vars are set.
// Returns true on success, false if SMTP isn't configured (the caller
// treats that as a non-fatal condition — the magic link is returned in
// the JSON response so the owner can forward it manually).
async function sendShareEmail(toEmail: string, setupName: string, magicLink: string, accessLevel: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const fromEmail = process.env.SMTP_FROM || 'no-reply@massapro.com'
  const fromName = process.env.SMTP_FROM_NAME || 'MassaPro'

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    // SMTP not configured — caller falls back to returning the link.
    return false
  }

  // Lazy-load nodemailer only when SMTP is configured. This keeps the
  // cold-start cost low for the common case (no email) and avoids a
  // dependency warning when the package isn't installed.
  let nodemailer: any
  try {
    nodemailer = require('nodemailer')
  } catch {
    console.error('nodemailer not installed — cannot send share email')
    return false
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(smtpPort),
    secure: Number(smtpPort) === 465,
    auth: { user: smtpUser, pass: smtpPass },
  })

  const verb = accessLevel === 'edit' ? 'view and edit' : 'view'
  const subject = `${fromName}: You've been invited to "${setupName}"`
  const text = `Hello,

You've been invited to ${verb} the integration setup "${setupName}" on ${fromName}.

Open it here (no password needed — this link is your key):
${magicLink}

This link is unique to you. Do not share it with anyone else.

If you weren't expecting this invitation, you can safely ignore this email.

— ${fromName}`

  const html = `<p>Hello,</p>
<p>You've been invited to <strong>${verb}</strong> the integration setup "<strong>${escapeHtml(setupName)}</strong>" on ${escapeHtml(fromName)}.</p>
<p>Open it here (no password needed — this link is your key):<br/>
<a href="${escapeHtml(magicLink)}">${escapeHtml(magicLink)}</a></p>
<p>This link is unique to you. Do not share it with anyone else.</p>
<p>If you weren't expecting this invitation, you can safely ignore this email.</p>
<p>— ${escapeHtml(fromName)}</p>`

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: toEmail,
    subject,
    text,
    html,
  })
  return true
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as Record<string, string>)[c])
}
