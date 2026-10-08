import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Attachments API.
//
// GET /api/support-tickets/[id]/attachments?attachmentId=X
//   → returns the file as a download (Content-Disposition: attachment)
//   → only the submitter or admins can download
//
// DELETE /api/support-tickets/[id]/attachments?attachmentId=X
//   → deletes the attachment (only the submitter or admins)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const { searchParams } = new URL(_req.url)
    const attachmentId = searchParams.get('attachmentId')
    if (!attachmentId) return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 })

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      select: { submittedById: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const isOwner = ticket.submittedById === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attachment = await db.supportTicketAttachment.findUnique({
      where: { id: attachmentId },
    })
    if (!attachment || attachment.ticketId !== id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Return the binary file as a download
    const headers = new Headers()
    headers.set('Content-Type', attachment.fileType || 'application/octet-stream')
    headers.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.fileName)}"`
    )
    headers.set('Content-Length', String(attachment.fileSize || attachment.data?.length || 0))

    return new NextResponse(attachment.data as any, { headers })
  } catch (e: any) {
    console.error('[api/support-tickets/[id]/attachments GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const { searchParams } = new URL(_req.url)
    const attachmentId = searchParams.get('attachmentId')
    if (!attachmentId) return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 })

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      select: { submittedById: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const isOwner = ticket.submittedById === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attachment = await db.supportTicketAttachment.findUnique({
      where: { id: attachmentId },
      select: { ticketId: true },
    })
    if (!attachment || attachment.ticketId !== id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    await db.supportTicketAttachment.delete({ where: { id: attachmentId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/support-tickets/[id]/attachments DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
