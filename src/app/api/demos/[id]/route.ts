import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Demo [id] — get / update / delete.
//
// Authorization:
//   - GET: owner, DemoAccess holder, or admin/super_admin
//   - PUT: owner or admin/super_admin
//   - DELETE: owner or admin/super_admin (Scenarios keep their data but
//     demoId becomes NULL via onDelete: SetNull)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const demo = await db.demo.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        access: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { scenarios: true } },
      },
    })
    if (!demo) return NextResponse.json({ error: 'Demo not found' }, { status: 404 })

    const isOwner = demo.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    const hasAccess = demo.access.some((a) => a.userId === user.id)
    if (!isOwner && !isAdmin && !hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ demo })
  } catch (e: any) {
    console.error('[api/demos/[id] GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(
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
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (typeof body.status === 'string' && ['active', 'archived'].includes(body.status)) data.status = body.status

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.demo.update({
      where: { id },
      data,
      include: { owner: { select: { id: true, name: true, email: true } } },
    })
    return NextResponse.json({ demo: updated })
  } catch (e: any) {
    console.error('[api/demos/[id] PUT]', e)
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

    const demo = await db.demo.findUnique({ where: { id }, select: { ownerId: true } })
    if (!demo) return NextResponse.json({ error: 'Demo not found' }, { status: 404 })

    const isOwner = demo.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // DemoAccess rows cascade-delete. Scenarios get demoId=NULL (SetNull),
    // which means they become "orphaned" — the user can re-assign them to
    // a new Demo from the Scenarios tab.
    await db.demo.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[api/demos/[id] DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
