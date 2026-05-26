import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const notes = await db.adminNote.findMany({
      where: { scenarioId: id },
      include: {
        sentByAdmin: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notes)
  } catch (error) {
    console.error('Get admin notes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { note, clientId, sendEmail } = body

    if (!note || !clientId) {
      return NextResponse.json({ error: 'Note and clientId are required' }, { status: 400 })
    }

    const adminNote = await db.adminNote.create({
      data: {
        scenarioId: id,
        sentByAdminId: userId,
        clientId,
        note,
        sendEmail: sendEmail || false,
      },
      include: {
        sentByAdmin: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(adminNote, { status: 201 })
  } catch (error) {
    console.error('Create admin note error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const { noteId, isRead } = body

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    const note = await db.adminNote.update({
      where: { id: noteId },
      data: { isRead: isRead ?? true },
    })

    return NextResponse.json(note)
  } catch (error) {
    console.error('Update admin note error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
