import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

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
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    // Allow access if admin, owner, or collaborator
    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }
    if (!isAdminRole(userRole)) {
      const isOwner = scenario.clientId === userId
      const isCollaborator = await db.collaboration.findFirst({
        where: { scenarioId: id, collaboratorId: userId },
      })
      if (!isOwner && !isCollaborator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const links = await db.scenarioLink.findMany({
      where: { scenarioId: id },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(links)
  } catch (error) {
    console.error('Get links error:', error)
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
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    // Allow access if admin, owner, or collaborator with edit access
    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }
    if (!isAdminRole(userRole)) {
      const isOwner = scenario.clientId === userId
      const collab = await db.collaboration.findFirst({
        where: { scenarioId: id, collaboratorId: userId },
      })
      if (!isOwner && !(collab && collab.accessLevel === 'edit')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await req.json()
    const { url, name, description } = body

    if (!url || !url.trim() || !name || !name.trim()) {
      return NextResponse.json({ error: 'URL and name are required' }, { status: 400 })
    }

    const link = await db.scenarioLink.create({
      data: {
        scenarioId: id,
        url: url.trim(),
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Create link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
