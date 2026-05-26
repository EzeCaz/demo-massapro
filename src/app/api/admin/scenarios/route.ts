import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const scenarios = await db.scenario.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        kpis: true,
        attachments: true,
        _count: { select: { comments: true, collaborations: true, adminNotes: true } },
      },
    })

    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Get admin scenarios error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
