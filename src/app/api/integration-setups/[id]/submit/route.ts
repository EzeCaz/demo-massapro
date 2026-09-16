import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// POST /api/integration-setups/[id]/submit — mark as submitted.
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
    const setup = await db.integrationSetup.findUnique({ where: { id } })

    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.integrationSetup.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedDate: new Date(),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Submit integration setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
