import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole, isSuperAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Demos API — top-level container in the demo-platform hierarchy.
//
// Visibility (per the user's brief):
//   - super_admin / admin: sees ALL Demos
//   - regular user: sees ONLY Demos where they're the owner OR have a
//     DemoAccess row (view / comment / edit)
//
// Mutations:
//   - POST (create): any authenticated user can create a Demo (they become
//     the owner). super_admin/admin can also create on behalf of others.
//   - PUT/DELETE: owner or super_admin/admin.
//
// GET    /api/demos                  — list (filtered by visibility)
// POST   /api/demos                  — create { name, description? }

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const isAdmin = isAdminRole(user.role)

    const where = isAdmin ? {} : {
      OR: [
        { ownerId: user.id },
        { access: { some: { userId: user.id } } },
      ],
    }

    const demos = await db.demo.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { scenarios: true, access: true } },
        access: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    })

    return NextResponse.json({ demos })
  } catch (e: any) {
    console.error('[api/demos GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const name = (body.name || '').toString().trim()
    const description = (body.description || '').toString().trim() || null
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const demo = await db.demo.create({
      data: {
        name,
        description,
        ownerId: user.id,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ demo }, { status: 201 })
  } catch (e: any) {
    console.error('[api/demos POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
