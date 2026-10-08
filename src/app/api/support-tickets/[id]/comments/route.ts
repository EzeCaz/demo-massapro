import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Ticket comments API.
//
// POST /api/support-tickets/[id]/comments — add a comment
//   body: { content: string, isInternal?: boolean }
//   - admins can mark isInternal=true (internal note, hidden from submitter)
//   - regular users always get isInternal=false (cannot set it)
//
// GET /api/support-tickets/[id]/comments — list comments
//   - submitter: sees only non-internal comments + their own
//   - admin: sees all comments

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
      select: { submittedById: true },
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    const isOwner = ticket.submittedById === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const comments = await db.ticketComment.findMany({
      where: {
        ticketId: id,
        // Submitter cannot see internal notes
        ...(isAdmin ? {} : { isInternal: false }),
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ comments })
  } catch (e: any) {
    console.error('[api/support-tickets/[id]/comments GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(
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

    const isOwner = ticket.submittedById === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Ticket is closed — cannot add comments' }, { status: 400 })
    }

    const body = await req.json()
    const content = (body.content || '').toString().trim()
    if (!content) return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })

    // Only admins can mark a comment as internal
    const isInternal = isAdmin && body.isInternal === true

    const comment = await db.ticketComment.create({
      data: {
        ticketId: id,
        authorId: user.id,
        content,
        isInternal,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    })

    // Auto-update ticket status when admin replies
    if (isAdmin && ticket.status === 'open') {
      await db.supportTicket.update({
        where: { id },
        data: { status: 'in_progress' },
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  } catch (e: any) {
    console.error('[api/support-tickets/[id]/comments POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
