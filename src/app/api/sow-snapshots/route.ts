import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// SOW Snapshots API — saved SOW documents persisted on the platform.
//
// GET    /api/sow-snapshots                  — list (own + admin sees all)
// POST   /api/sow-snapshots                  — save a new snapshot
//   body: { name, payload, status?, companyId?, teamId? }
//
// (PUT/DELETE handled in [id]/route.ts)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const isAdmin = isAdminRole(user.role)
    const where = isAdmin ? {} : { ownerId: user.id }

    const snapshots = await db.sOWSnapshot.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    })
    return NextResponse.json({ snapshots })
  } catch (e: any) {
    console.error('[api/sow-snapshots GET]', e)
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
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!body.payload || typeof body.payload !== 'object') {
      return NextResponse.json({ error: 'payload must be an object' }, { status: 400 })
    }
    const status = ['draft', 'submitted', 'approved', 'rejected'].includes(body.status) ? body.status : 'draft'

    const snapshot = await db.sOWSnapshot.create({
      data: {
        name,
        ownerId: user.id,
        companyId: typeof body.companyId === 'string' ? body.companyId : null,
        teamId: typeof body.teamId === 'string' ? body.teamId : null,
        status,
        payload: body.payload,
        submittedAt: status === 'submitted' || status === 'approved' ? new Date() : null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    })
    return NextResponse.json({ snapshot }, { status: 201 })
  } catch (e: any) {
    console.error('[api/sow-snapshots POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
