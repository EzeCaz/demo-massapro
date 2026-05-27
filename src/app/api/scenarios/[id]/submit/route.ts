import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const scenario = await db.scenario.findUnique({ where: { id } })
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    if (scenario.clientId !== userId && !isAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await db.scenario.update({
      where: { id },
      data: {
        status: 'submitted',
        submittedDate: new Date(),
      },
    })

    // Log the change
    await db.changeLog.create({
      data: {
        scenarioId: id,
        userId,
        fieldName: 'status',
        oldValue: 'draft',
        newValue: 'submitted',
        changeSummary: 'Scenario submitted',
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Submit scenario error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
