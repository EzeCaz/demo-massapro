import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { INTEGRATION_FIELDS } from '@/lib/integration-fields'

// GET /api/integration-setups/[id] — fetch a single integration setup.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const setup = await db.integrationSetup.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
      },
    })

    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    // Permission: admin or owner
    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(setup)
  } catch (error) {
    console.error('Get integration setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/integration-setups/[id] — update any field. Body is a partial
// object whose keys are column names (camelCase, including En/Es/He suffixes).
export async function PUT(
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

    const body = await req.json()

    // Whitelist of fields that are allowed to be updated. We accept any
    // of the 28 base field names + their En/Es/He variants + name + status.
    // The form sends one field at a time (debounced auto-save) but we also
    // accept a full object for bulk updates.
    const allowedFields = new Set<string>([
      'name', 'status', 'submittedDate',
      ...INTEGRATION_FIELDS.flatMap(f => [f, `${f}En`, `${f}Es`, `${f}He`]),
    ])

    const updateData: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.has(key)) {
        updateData[key] = value
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No updatable fields provided' })
    }

    // If status is being set to submitted, also stamp submittedDate.
    if (updateData.status === 'submitted' && !setup.submittedDate) {
      updateData.submittedDate = new Date()
    }

    const updated = await db.integrationSetup.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update integration setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/integration-setups/[id]
export async function DELETE(
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

    await db.integrationSetup.delete({ where: { id } })
    return NextResponse.json({ message: 'Integration setup deleted' })
  } catch (error) {
    console.error('Delete integration setup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
