import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// DemoAccess API — manage per-user access grants to a Demo.
//
// GET    /api/demos/[id]/access          — list access grants (owner/admin only)
// POST   /api/demos/[id]/access          — grant access { userId, accessLevel }
//                                          (owner/admin only)
// DELETE /api/demos/[id]/access?userId=X — revoke access (owner/admin only)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const demo = await db.demo.findUnique({ where: { id }, select: { ownerId: true } })
    if (!demo) return NextResponse.json({ error: 'Demo not found' }, { status: 404 })

    const isOwner = demo.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const access = await db.demoAccess.findMany({
      where: { demoId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json({ access })
  } catch (e: any) {
    console.error('[api/demos/[id]/access GET]', e)
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

    const demo = await db.demo.findUnique({ where: { id }, select: { ownerId: true } })
    if (!demo) return NextResponse.json({ error: 'Demo not found' }, { status: 404 })

    const isOwner = demo.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const userId = (body.userId || '').toString().trim()
    const accessLevel = (body.accessLevel || 'view').toString()
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    if (!['view', 'comment', 'edit'].includes(accessLevel)) {
      return NextResponse.json({ error: 'Invalid accessLevel' }, { status: 400 })
    }

    // upsert — one row per (demoId, userId)
    const access = await db.demoAccess.upsert({
      where: { demoId_userId: { demoId: id, userId } },
      create: { demoId: id, userId, accessLevel },
      update: { accessLevel },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json({ access })
  } catch (e: any) {
    console.error('[api/demos/[id]/access POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const demo = await db.demo.findUnique({ where: { id }, select: { ownerId: true } })
    if (!demo) return NextResponse.json({ error: 'Demo not found' }, { status: 404 })

    const isOwner = demo.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    await db.demoAccess.deleteMany({ where: { demoId: id, userId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/demos/[id]/access DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
