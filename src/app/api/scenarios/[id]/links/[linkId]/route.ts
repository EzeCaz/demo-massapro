import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, linkId } = await params
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

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

    const link = await db.scenarioLink.update({
      where: { id: linkId },
      data: {
        url: url.trim(),
        name: name.trim(),
        description: description?.trim() || null,
      },
    })

    return NextResponse.json(link)
  } catch (error) {
    console.error('Update link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, linkId } = await params
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

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

    await db.scenarioLink.delete({ where: { id: linkId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete link error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
