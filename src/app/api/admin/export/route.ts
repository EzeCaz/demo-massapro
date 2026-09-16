import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/admin/export?clientId=&scenarioId=&format=json|csv
//
// Per Task 18: all authenticated non-share users can export the full
// scenario dataset (Reports view → Export tab). The data is the same
// they can already see in the Reports dashboard. Mutations remain
// gated by their own /api/scenarios/[id] routes.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    const userId = (session.user as any).id

    // Reject share-token sessions.
    if (userRole === 'share') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const scenarioId = searchParams.get('scenarioId')
    const format = searchParams.get('format') || 'json'

    let scenarios

    if (scenarioId) {
      // Allow non-admin users to export their own scenarios
      const where: any = { id: scenarioId }
      if (!isAdminRole(userRole)) {
        where.OR = [{ clientId: userId }, { collaborations: { some: { collaboratorId: userId } } }]
      }
      scenarios = await db.scenario.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          kpis: true,
          attachments: true,
        },
      })
    } else if (clientId) {
      if (!isAdminRole(userRole) && clientId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      scenarios = await db.scenario.findMany({
        where: { clientId },
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          kpis: true,
          attachments: true,
        },
      })
    } else {
      // Per Task 18: regular users see all scenarios in the Reports
      // dashboard — let them export the same dataset. Admins and
      // super_admin also get the full dataset.
      scenarios = await db.scenario.findMany({
        include: {
          client: { select: { id: true, name: true, email: true, company: true } },
          kpis: true,
          attachments: true,
        },
      })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Scenario Name', 'Client', 'Company', 'Status', 'Website URL', 'KPIs', 'Overview', 'Company Goals', 'AI/Automations', 'Demo Focus Areas', 'Languages Voice', 'Languages Text', 'Scripts/Flows', 'Knowledge Base', 'FAQ/Objection Handling', 'Required Integrations', 'ERP/CRM/CCaaS', 'Submitted Date']
      const rows = scenarios.map(s => [
        s.name,
        s.client.name || s.client.email,
        s.client.company || '',
        s.status,
        s.companyWebsiteUrl || '',
        s.kpis.map((k: any) => `${k.name}: ${k.targetValue || 'N/A'}`).join('; '),
        (s.overview || '').replace(/"/g, '""'),
        (s.companyGoals || '').replace(/"/g, '""'),
        (s.aiAutomationsRequired || '').replace(/"/g, '""'),
        (s.demoFocusAreas || '').replace(/"/g, '""'),
        s.languagesVoice || '',
        s.languagesText || '',
        (s.scriptsFlows || '').replace(/"/g, '""'),
        (s.knowledgeBaseText || '').replace(/"/g, '""'),
        (s.faqObjectionHandling || '').replace(/"/g, '""'),
        (s.requiredIntegrations || '').replace(/"/g, '""'),
        (s.erpCrmCcaas || '').replace(/"/g, '""'),
        s.submittedDate ? new Date(s.submittedDate).toISOString() : '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="massapro-export.csv"',
        },
      })
    }

    return NextResponse.json(scenarios)
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
