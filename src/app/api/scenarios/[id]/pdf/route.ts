import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'

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
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    const scenario = await db.scenario.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        kpis: true,
      },
    })

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 })
    }

    // Allow access if admin, owner, or collaborator
    if (session?.user) {
      const isOwner = scenario.clientId === userId
      const isCollaborator = await db.collaboration.findFirst({
        where: { scenarioId: id, collaboratorId: userId },
      })
      if (!isAdminRole(userRole) && !isOwner && !isCollaborator) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Generate PDF
    const companyName = scenario.company || scenario.client?.company || scenario.client?.name || 'N/A'
    const proposedDate = scenario.createdAt ? new Date(scenario.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    }) : 'N/A'

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `MassaPro Demo Form - ${scenario.name}`,
        Author: 'MassaPro',
        Subject: `Demo Form for ${companyName}`,
      },
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const purple = '#7C3AED'
    const darkGray = '#1F2937'
    const bodyGray = '#374151'
    const lightGray = '#9CA3AF'

    // Helper: draw a section
    const drawSection = (number: number, title: string, content: string | null | undefined) => {
      if (!content || content.trim() === '') return

      // Check if we need a new page (if less than 80pt remaining)
      if (doc.y > 720) {
        doc.addPage()
      }

      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray)
      doc.text(`${number}. ${title}`, { continued: false })
      doc.moveDown(0.3)
      doc.font('Helvetica').fontSize(10).fillColor(bodyGray)
      doc.text(content, { lineGap: 3 })
      doc.moveDown(0.8)
    }

    // ===== HEADER =====
    // Purple banner
    doc.rect(0, 0, 595.28, 80).fill(purple)

    // Title text
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
    doc.text('MassaPro Demo Form', 50, 25, { width: 495.28 })

    // Subtitle
    doc.font('Helvetica').fontSize(10).fillColor('#E9D5FF')
    doc.text(scenario.name, 50, 58, { width: 495.28 })

    doc.y = 100

    // ===== CUSTOMER INFO =====
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
    doc.text('Customer Name: ', { continued: true })
    doc.font('Helvetica').fillColor(bodyGray)
    doc.text(companyName)

    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
    doc.text('Proposed Date: ', { continued: true })
    doc.font('Helvetica').fillColor(bodyGray)
    doc.text(proposedDate)

    doc.moveDown(1)

    // Separator line
    doc.moveTo(50, doc.y).lineTo(545.28, doc.y).strokeColor(lightGray).lineWidth(0.5).stroke()
    doc.moveDown(0.8)

    // ===== SECTIONS =====
    drawSection(1, 'Company Website URL', scenario.companyWebsiteUrl)
    drawSection(2, 'OVERVIEW', scenario.overview)
    drawSection(3, 'Company Goals', scenario.companyGoals)
    drawSection(4, 'AI / Automations Required', scenario.aiAutomationsRequired)
    drawSection(5, 'Demo Focus Areas', scenario.demoFocusAreas)

    // Languages section
    const languages: string[] = []
    if (scenario.languagesVoice) languages.push(`Voice: ${scenario.languagesVoice}`)
    if (scenario.languagesText) languages.push(`Text: ${scenario.languagesText}`)
    if (languages.length > 0) {
      drawSection(6, 'Languages (voice + text)', languages.join('\n'))
    }

    drawSection(7, 'Scripts / Flows', scenario.scriptsFlows)
    drawSection(8, 'Knowledge Base', scenario.knowledgeBaseText)
    drawSection(9, 'FAQ / Objection Handling', scenario.faqObjectionHandling)
    drawSection(10, 'Required Integrations', scenario.requiredIntegrations)
    drawSection(11, 'ERP / CRM / CCaaS', scenario.erpCrmCcaas)

    // KPIs section (bonus)
    if (scenario.kpis && scenario.kpis.length > 0) {
      if (doc.y > 680) doc.addPage()
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray)
      doc.text('KPIs', { continued: false })
      doc.moveDown(0.3)
      scenario.kpis.forEach((kpi: any) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(bodyGray)
        doc.text(`• ${kpi.name}`, { continued: !!kpi.targetValue })
        if (kpi.targetValue) {
          doc.font('Helvetica').fillColor(lightGray)
          doc.text(` — Target: ${kpi.targetValue}`)
        } else {
          doc.text('')
        }
      })
      doc.moveDown(0.8)
    }

    // Footer
    if (doc.y > 750) doc.addPage()
    doc.moveTo(50, doc.y + 10).lineTo(545.28, doc.y + 10).strokeColor(lightGray).lineWidth(0.5).stroke()
    doc.moveDown(1)
    doc.font('Helvetica').fontSize(8).fillColor(lightGray)
    doc.text(`Generated by MassaPro — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })

    // Finalize
    doc.end()

    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
    })

    const fileName = `MassaPro-Demo-Form-${scenario.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
