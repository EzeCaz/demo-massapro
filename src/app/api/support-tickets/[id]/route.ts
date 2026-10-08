import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// GET    /api/support-tickets/[id]           — fetch a single ticket (with attachments meta + comments)
// PATCH  /api/support-tickets/[id]           — update ticket (admin: status, priority, assignedTo, category; user: nothing)
// DELETE /api/support-tickets/[id]           — delete ticket (only submitter or admin)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
          },
        },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    // Authorization — submitter or admin can see; others get 403
    const isOwner = ticket.submittedById === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ ticket })
  } catch (e: any) {
    console.error('[api/support-tickets/[id] GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const ticket = await db.supportTicket.findUnique({
      where: { id },
      select: { submittedById: true, status: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const body = await req.json()
    const data: any = {}
    const isAdmin = isAdminRole(user.role)

    // Status, priority, assignedTo, category are admin-only
    if (isAdmin) {
      if (typeof body.status === 'string' && ['open', 'in_progress', 'resolved', 'closed'].includes(body.status)) {
        data.status = body.status
        if (body.status === 'resolved') data.resolvedAt = new Date()
        if (body.status === 'closed') data.closedAt = new Date()
      }
      if (typeof body.priority === 'string' && ['low', 'normal', 'high', 'critical'].includes(body.priority)) {
        data.priority = body.priority
      }
      if (typeof body.assignedToId === 'string') data.assignedToId = body.assignedToId || null
      if (typeof body.category === 'string') data.category = body.category.trim() || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.supportTicket.update({
      where: { id },
      data,
    })
    return NextResponse.json({ ticket: updated })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    console.error('[api/support-tickets/[id] PATCH]', e)
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

    await db.supportTicket.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/support-tickets/[id] DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
