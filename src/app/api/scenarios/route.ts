import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    let scenarios
    if (isAdminRole(userRole)) {
      scenarios = await db.scenario.findMany({
        orderBy: { order: 'asc' },
        include: { client: { select: { id: true, name: true, email: true, company: true } }, kpis: true, _count: { select: { attachments: true, comments: true, collaborations: true, adminNotes: true } } },
      })
    } else {
      // Get user's own scenarios + collaborated scenarios
      const ownScenarios = await db.scenario.findMany({
        where: { clientId: userId },
        orderBy: { order: 'asc' },
        include: { client: { select: { id: true, name: true, email: true, company: true } }, kpis: true, _count: { select: { attachments: true, comments: true, collaborations: true, adminNotes: true } } },
      })

      const collaborations = await db.collaboration.findMany({
        where: { collaboratorId: userId },
        include: {
          scenario: {
            include: { client: { select: { id: true, name: true, email: true, company: true } }, kpis: true, _count: { select: { attachments: true, comments: true, collaborations: true, adminNotes: true } } },
          },
        },
      })

      const collabScenarios = collaborations.map(c => c.scenario)
      scenarios = [...ownScenarios, ...collabScenarios]
    }

    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Get scenarios error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()

    // Support bulk creation from setup wizard
    if (Array.isArray(body)) {
      const scenarios = []
      for (let i = 0; i < body.length; i++) {
        const item = body[i]
        const scenario = await db.scenario.create({
          data: {
            clientId: userId,
            name: item.name || `Scenario ${i + 1}`,
            order: i,
            kpis: item.kpis ? {
              create: item.kpis.map((kpi: { name: string; targetValue?: string }) => ({
                name: kpi.name,
                targetValue: kpi.targetValue || null,
              }))
            } : undefined,
          },
          include: { kpis: true },
        })
        scenarios.push(scenario)
      }
      return NextResponse.json(scenarios, { status: 201 })
    }

    // Single scenario creation
    const { name, order } = body
    const scenario = await db.scenario.create({
      data: {
        clientId: userId,
        name: name || 'New Scenario',
        order: order ?? 0,
      },
      include: { kpis: true },
    })

    return NextResponse.json(scenario, { status: 201 })
  } catch (error) {
    console.error('Create scenario error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
