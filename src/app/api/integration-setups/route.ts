import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/integration-setups — list all setups for the current user.
// Admins see all setups; regular users see their own.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    let setups
    if (isAdminRole(userRole)) {
      setups = await db.integrationSetup.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
        },
      })
    } else {
      setups = await db.integrationSetup.findMany({
        where: { clientId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
        },
      })
    }

    return NextResponse.json(setups)
  } catch (error) {
    console.error('Get integration setups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/integration-setups — create a new integration setup.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()
    const name = (body?.name || '').trim() || 'New Integration Setup'

    const setup = await db.integrationSetup.create({
      data: {
        clientId: userId,
        name,
      },
    })

    return NextResponse.json(setup, { status: 201 })
  } catch (error) {
    console.error('Create integration setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
