import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const collaborations = await db.collaboration.findMany({
      where: { scenarioId: id },
      include: { collaborator: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json(collaborations)
  } catch (error) {
    console.error('Get collaborations error:', error)
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

    const { id } = await params
    const body = await req.json()
    const { collaboratorEmail, accessLevel, generatePublicLink } = body

    // Generate public link
    if (generatePublicLink) {
      const publicToken = uuidv4()
      const collaboration = await db.collaboration.create({
        data: {
          scenarioId: id,
          collaboratorId: (session.user as any).id, // Owner is the creator
          accessLevel: 'view',
          publicToken,
        },
        include: { collaborator: { select: { id: true, name: true, email: true } } },
      })
      return NextResponse.json(collaboration, { status: 201 })
    }

    // Add collaborator by email
    if (!collaboratorEmail) {
      return NextResponse.json({ error: 'Collaborator email is required' }, { status: 400 })
    }

    const collaborator = await db.user.findUnique({
      where: { email: collaboratorEmail },
    })

    if (!collaborator) {
      return NextResponse.json({ error: 'User not found with this email' }, { status: 404 })
    }

    // Check if already a collaborator
    const existing = await db.collaboration.findFirst({
      where: { scenarioId: id, collaboratorId: collaborator.id },
    })

    if (existing) {
      return NextResponse.json({ error: 'User is already a collaborator' }, { status: 409 })
    }

    const collaboration = await db.collaboration.create({
      data: {
        scenarioId: id,
        collaboratorId: collaborator.id,
        accessLevel: accessLevel || 'view',
      },
      include: { collaborator: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(collaboration, { status: 201 })
  } catch (error) {
    console.error('Create collaboration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const { searchParams } = new URL(req.url)
    const collaborationId = searchParams.get('collaborationId')

    if (!collaborationId) {
      return NextResponse.json({ error: 'Collaboration ID is required' }, { status: 400 })
    }

    await db.collaboration.delete({ where: { id: collaborationId } })
    return NextResponse.json({ message: 'Collaborator removed' })
  } catch (error) {
    console.error('Delete collaboration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
