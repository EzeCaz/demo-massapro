import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { INTEGRATION_FIELDS } from '@/lib/integration-fields'
import { readShareScope } from '@/lib/share-scope'

// GET /api/integration-setups/[id] — fetch a single integration setup.
//
// Three access modes:
//   1. Admin — full access to any setup.
//   2. Owner (clientId === userId) — full access to own setup.
//   3. Share session (role === 'share') — only the setup the share token
//      was issued for. The session JWT carries shareSetupId; we verify
//      it matches the requested id.
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

    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const scope = readShareScope(session.user as any)

    if (scope.isShare) {
      // Share users can only fetch the setup the share was issued for.
      if (scope.setupId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // Don't leak owner PII to share users.
      return NextResponse.json({ ...setup, client: undefined })
    }

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
//
// Share users with accessLevel === 'edit' may update the 28 fields (and
// their En/Es/He variants) but NOT name/status/submittedDate.
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
    const scope = readShareScope(session.user as any)

    if (scope.isShare) {
      if (scope.setupId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (scope.accessLevel !== 'edit') {
        return NextResponse.json({ error: 'View-only access' }, { status: 403 })
      }
      // Share editors can only update the 28 fields + their variants.
      // They CANNOT change name, status, submittedDate, or clientId.
    } else if (!isAdminRole(userRole) && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()

    // Whitelist of fields that are allowed to be updated. For share
    // editors we restrict to ONLY the 28 fields + their En/Es/He variants.
    // For owners/admins we additionally allow name, status, submittedDate.
    const fieldVariants = INTEGRATION_FIELDS.flatMap(f => [f, `${f}En`, `${f}Es`, `${f}He`])
    const allowedFields = new Set<string>(fieldVariants)
    if (!scope.isShare) {
      allowedFields.add('name')
      allowedFields.add('status')
      allowedFields.add('submittedDate')
    }

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
    // Share users can't do this (status isn't in their allowedFields).
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
// Share users cannot delete — only owners and admins can.
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
    const scope = readShareScope(session.user as any)

    if (scope.isShare) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
