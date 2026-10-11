import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/nda-snapshots — list the user's NDA snapshots
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const snapshots = await db.nDASnapshot.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true, name: true, status: true, createdAt: true, updatedAt: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ snapshots })
  } catch (e: any) {
    console.error('[api/nda-snapshots GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/nda-snapshots — create a new NDA snapshot
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, status, payload } = body

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const snapshot = await db.nDASnapshot.create({
      data: {
        name,
        ownerId: user.id,
        status: status || 'draft',
        payload: payload || { cover: {} },
      },
    })

    return NextResponse.json({ snapshot })
  } catch (e: any) {
    console.error('[api/nda-snapshots POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
