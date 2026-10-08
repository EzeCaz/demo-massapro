import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Reporting API — aggregates tickets, tasks, integration status and SOW
// status for the Reporting tab of the demo platform.
//
// All authenticated users (except 'share') can read; admins see global
// numbers, regular users see their own.
//
// GET /api/reporting
//   → {
//       tickets:    { byStatus, byPriority, recent, total, mine },
//       tasks:      { byStatus, byService, total, mine },
//       integration: { total, byStatus, mine },
//       sow:        { total, byStatus, mine }
//     }
//
// Notes on "tasks": we don't have a server-side tasks table (SOW tasks
// live in the SOWBuilder localStorage). We expose them via the SOWSnapshot
// payload — the reporting endpoint counts tasks across all snapshots the
// user can see.

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const isAdmin = isAdminRole(user.role)

    // ---- Tickets ----------------------------------------------------------
    const ticketWhere = isAdmin ? {} : { submittedById: user.id }
    const tickets = await db.supportTicket.findMany({
      where: ticketWhere,
      orderBy: { createdAt: 'desc' },
      take: isAdmin ? 50 : 20,
      select: {
        id: true, title: true, subject: true, priority: true, status: true,
        createdAt: true, updatedAt: true, resolvedAt: true, closedAt: true,
        submittedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    const ticketByStatus = await db.supportTicket.groupBy({
      by: ['status'],
      where: ticketWhere,
      _count: { _all: true },
    })
    const ticketByPriority = await db.supportTicket.groupBy({
      by: ['priority'],
      where: ticketWhere,
      _count: { _all: true },
    })

    // ---- Integration setups ----------------------------------------------
    const integrationWhere = isAdmin ? {} : { clientId: user.id }
    const integrationByStatus = await db.integrationSetup.groupBy({
      by: ['status'],
      where: integrationWhere,
      _count: { _all: true },
    })
    const integrationTotal = await db.integrationSetup.count({ where: integrationWhere })

    // ---- SOW Snapshots ----------------------------------------------------
    const sowWhere = isAdmin ? {} : { ownerId: user.id }
    const sowByStatus = await db.sOWSnapshot.groupBy({
      by: ['status'],
      where: sowWhere,
      _count: { _all: true },
    })
    const sowSnapshots = await db.sOWSnapshot.findMany({
      where: sowWhere,
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true, name: true, status: true, createdAt: true,
        updatedAt: true, submittedAt: true, approvedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        payload: true,
      },
    })

    // ---- Aggregate tasks across all SOW snapshots ------------------------
    // We parse each snapshot payload and count tasks by status (defaulting
    // to 'pending' when not set). For each task we read taskState[task.id].status.
    let taskByStatus: Record<string, number> = { pending: 0, 'in-progress': 0, completed: 0, blocked: 0 }
    let taskByService: Record<string, number> = {}
    let taskTotal = 0

    for (const snap of sowSnapshots) {
      const payload = snap.payload as any
      if (!payload || typeof payload !== 'object') continue
      const taskState: Record<string, any> = payload.taskState || {}
      const selectedServiceIds: string[] = payload.selectedServiceIds || []
      const customServices: any[] = payload.customServices || []
      // Merge custom tasks (added to builtin services) registry
      const customTasksByBuiltin: Record<string, any[]> = payload.customTasksByBuiltinService || {}
      // Build per-service task list — we only need titles + the default status
      const serviceTasks: { service: string; taskId: string }[] = []
      // Built-in services (we don't import SERVICES to keep this server-light;
      // we trust the snapshot payload)
      // The snapshot doesn't include the SERVICES catalog directly — but it
      // doesn't need to: we read taskState keys (any task IDs the user
      // touched) and also scan the registry of custom tasks for builtin
      // services. The simplest reliable approach: count distinct task IDs
      // from taskState + customServices[].tasks + customTasksByBuiltin[svc].
      for (const [tid, t] of Object.entries(taskState)) {
        const status = (t as any)?.status || 'pending'
        taskByStatus[status] = (taskByStatus[status] || 0) + 1
        taskTotal += 1
      }
      for (const cs of customServices) {
        for (const task of cs.tasks || []) {
          const status = taskState[task.id]?.status || 'pending'
          taskByStatus[status] = (taskByStatus[status] || 0) + 1
          taskByService[cs.name] = (taskByService[cs.name] || 0) + 1
          taskTotal += 1
        }
      }
      for (const [svcId, tasks] of Object.entries(customTasksByBuiltin)) {
        for (const task of tasks as any[]) {
          const status = taskState[task.id]?.status || 'pending'
          taskByStatus[status] = (taskByStatus[status] || 0) + 1
          taskByService[svcId] = (taskByService[svcId] || 0) + 1
          taskTotal += 1
        }
      }
      // We do NOT count built-in service default tasks here because the
      // payload doesn't carry a copy of the SERVICES catalog. The
      // reporting endpoint focuses on what the user has actively tracked.
    }

    return NextResponse.json({
      tickets: {
        total: tickets.length,
        recent: tickets,
        byStatus: ticketByStatus.reduce((acc, row) => {
          acc[row.status] = row._count._all
          return acc
        }, {} as Record<string, number>),
        byPriority: ticketByPriority.reduce((acc, row) => {
          acc[row.priority] = row._count._all
          return acc
        }, {} as Record<string, number>),
      },
      integration: {
        total: integrationTotal,
        byStatus: integrationByStatus.reduce((acc, row) => {
          acc[row.status] = row._count._all
          return acc
        }, {} as Record<string, number>),
      },
      sow: {
        total: sowSnapshots.length,
        byStatus: sowByStatus.reduce((acc, row) => {
          acc[row.status] = row._count._all
          return acc
        }, {} as Record<string, number>),
        recent: sowSnapshots.map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
          owner: s.owner,
          updatedAt: s.updatedAt,
        })),
      },
      tasks: {
        total: taskTotal,
        byStatus: taskByStatus,
        byService: taskByService,
      },
    })
  } catch (e: any) {
    console.error('[api/reporting GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
