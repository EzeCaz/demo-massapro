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
//       tickets:    { byStatus, byPriority, recent, total, byDay },
//       tasks:      { byStatus, byService, total, mine },
//       integration: { total, byStatus, byDay },
//       sow:        { total, byStatus, recent, byDay },
//       scenarios:  { byStatus, byDemo, total },
//       demos:      { total, byOwner }
//     }
//
// The cadence-by-day aggregations (tickets/integration/sow .byDay) are
// 8-week daily series intended to feed line charts. The audits of the
// Content Wizz platform identified this as the missing analytics layer;
// we add it here so the MassaPro Reports tab can render real charts
// instead of count-reading alone.
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
    // Per-day cadence (last 56 days = 8 weeks) of integration setup submissions
    const integrationSnapshots = await db.integrationSetup.findMany({
      where: { ...integrationWhere, createdAt: { gte: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true },
    })

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

    // ---- Scenarios & Demos (added for analytics layer) -------------------
    // Visible scenarios: for admins all, for users those they own or have
    // DemoAccess to via their parent Demo. We reuse the Demo visibility
    // query and join scenarios through demoId.
    //
    // IMPORTANT: the Demo model's access relation is called `access`
    // (not `demoAccess`), and DemoAccess has `accessLevel` (not `role`).
    // Using the wrong field name here throws a Prisma validation error
    // which surfaces as a 500 — that was the root cause of the "reporting
    // is empty" bug.
    const visibleDemoWhere = isAdmin
      ? {}
      : {
          OR: [
            { ownerId: user.id },
            { access: { some: { userId: user.id, accessLevel: { in: ['view', 'comment', 'edit'] } } } },
          ],
        }
    const visibleDemos = await db.demo.findMany({
      where: visibleDemoWhere,
      select: {
        id: true, name: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { scenarios: true, access: true } },
      },
    })
    const visibleDemoIds = visibleDemos.map((d) => d.id)
    const scenarioWhere = visibleDemoIds.length
      ? { demoId: { in: visibleDemoIds } }
      : { id: 'none' } // impossible id → empty result for non-admins without demos
    const scenarioByStatus = await db.scenario.groupBy({
      by: ['status'],
      where: scenarioWhere,
      _count: { _all: true },
    })
    const scenarioByDemo = await db.scenario.groupBy({
      by: ['demoId'],
      where: scenarioWhere,
      _count: { _all: true },
    })
    const scenarioTotal = await db.scenario.count({ where: scenarioWhere })

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

    // ---- Build per-day cadence series (last 56 days) ---------------------
    // Used by the Reports tab line chart for "Activity over the last 8 weeks".
    // Returns an array of { date: 'YYYY-MM-DD', tickets: n, integrations: n, sows: n }
    const DAY = 24 * 60 * 60 * 1000
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const days: { date: string; tickets: number; integrations: number; sows: number }[] = []
    for (let i = 55; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY)
      days.push({ date: d.toISOString().slice(0, 10), tickets: 0, integrations: 0, sows: 0 })
    }
    const dateIdx = new Map(days.map((d, i) => [d.date, i]))
    for (const t of tickets) {
      const key = new Date(t.createdAt).toISOString().slice(0, 10)
      const idx = dateIdx.get(key)
      if (idx !== undefined) days[idx].tickets += 1
    }
    for (const it of integrationSnapshots) {
      const key = new Date(it.createdAt).toISOString().slice(0, 10)
      const idx = dateIdx.get(key)
      if (idx !== undefined) days[idx].integrations += 1
    }
    for (const sw of sowSnapshots) {
      const key = new Date(sw.createdAt).toISOString().slice(0, 10)
      const idx = dateIdx.get(key)
      if (idx !== undefined) days[idx].sows += 1
    }

    // ---- Demo + scenario aggregation shape --------------------------------
    const demosList = visibleDemos.map((d) => ({
      id: d.id,
      name: d.name,
      owner: d.owner,
      scenarioCount: d._count.scenarios,
      accessCount: d._count.access,
    }))
    const scenarioByDemoMap: Record<string, number> = {}
    for (const row of scenarioByDemo) {
      scenarioByDemoMap[row.demoId] = row._count._all
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
      scenarios: {
        total: scenarioTotal,
        byStatus: scenarioByStatus.reduce((acc, row) => {
          acc[row.status] = row._count._all
          return acc
        }, {} as Record<string, number>),
        byDemo: scenarioByDemoMap,
      },
      demos: {
        total: visibleDemos.length,
        list: demosList,
      },
      cadence: days,
    })
  } catch (e: any) {
    console.error('[api/reporting GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
