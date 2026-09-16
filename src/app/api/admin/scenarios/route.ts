import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/admin/scenarios — list ALL scenarios across ALL clients.
//
// Per Task 18: all authenticated non-share users can read this list to
// populate the Reports dashboard. (Mutations on individual scenarios
// remain gated by their own /api/scenarios/[id] routes.)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Reject share-token sessions — they have no business listing all scenarios.
    const userRole = (session.user as any).role
    if (userRole === 'share') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For admin / super_admin: return ALL scenarios.
    // For regular 'user' role: also return ALL scenarios (per Task 18 — the
    // Reports dashboard is shared company-wide). If you want to restrict
    // regular users to only their own scenarios in the future, swap the
    // `where` below to filter by clientId.
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
