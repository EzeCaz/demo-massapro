import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import path from 'path'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Detect Hebrew characters in text
function containsHebrew(text: string): boolean {
  return /[\u0590-\u05FF]/.test(text)
}

// Detect any RTL characters (Hebrew, Arabic)
function containsRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(text)
}

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

    // Check if the scenario has any Hebrew/RTL content
    const allContent = [
      scenario.name, scenario.company, scenario.overview, scenario.companyGoals,
      scenario.aiAutomationsRequired, scenario.demoFocusAreas, scenario.scriptsFlows,
      scenario.knowledgeBaseText, scenario.faqObjectionHandling, scenario.requiredIntegrations,
      scenario.erpCrmCcaas,
    ].filter(Boolean).join(' ')
    const hasHebrew = containsHebrew(allContent)

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `MassaPro Demo Form - ${scenario.name}`,
        Author: 'MassaPro',
        Subject: `Demo Form for ${companyName}`,
      },
    })

    // Register Unicode-supporting fonts for Hebrew/multi-language text
    const fontsDir = path.join(process.cwd(), 'src', 'fonts')
    try {
      doc.registerFont('DejaVuSans', path.join(fontsDir, 'DejaVuSans.ttf'))
      doc.registerFont('DejaVuSans-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'))
    } catch (err) {
      console.error('[PDF] Font registration failed:', err)
    }

    const purple = '#7C3AED'
    const darkGray = '#1F2937'
    const bodyGray = '#374151'
    const lightGray = '#9CA3AF'

    // Choose font based on whether text contains Hebrew/RTL
    const getBodyFont = (text: string): string => {
      return (text && containsRTL(text)) ? 'DejaVuSans' : 'Helvetica'
    }

    const getBoldFont = (text: string): string => {
      return (text && containsRTL(text)) ? 'DejaVuSans-Bold' : 'Helvetica-Bold'
    }

    // Helper: draw a section
    // - Section NUMBER and TITLE are always LTR, left-aligned
    // - Body CONTENT is right-aligned if Hebrew, left-aligned otherwise
    const drawSection = (number: number, title: string, content: string | null | undefined) => {
      if (!content || content.trim() === '') return

      // Check if we need a new page
      if (doc.y > 720) {
        doc.addPage()
      }

      const isRTL = containsRTL(content)

      // Section title: always LTR, left-aligned
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray)
      doc.text(`${number}. ${title}`, { continued: false, align: 'left' })
      doc.moveDown(0.3)

      // Body content: right-aligned if Hebrew/RTL, left-aligned otherwise
      const bodyFont = isRTL ? 'DejaVuSans' : 'Helvetica'
      const contentAlign = isRTL ? 'right' as const : 'left' as const

      doc.font(bodyFont).fontSize(10).fillColor(bodyGray)
      doc.text(content, { lineGap: 3, align: contentAlign })
      doc.moveDown(0.8)
    }

    // ===== HEADER =====
    // Purple banner
    doc.rect(0, 0, 595.28, 80).fill(purple)

    // Title text - always LTR
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
    doc.text('MassaPro Demo Form', 50, 25, { width: 495.28, align: 'left' })

    // Subtitle - scenario name, use DejaVu if Hebrew
    const nameIsHebrew = containsRTL(scenario.name)
    const subtitleFont = nameIsHebrew ? 'DejaVuSans' : 'Helvetica'
    const subtitleAlign = nameIsHebrew ? 'right' as const : 'left' as const
    doc.font(subtitleFont).fontSize(10).fillColor('#E9D5FF')
    doc.text(scenario.name, 50, 58, { width: 495.28, align: subtitleAlign })

    doc.y = 100

    // ===== CUSTOMER INFO =====
    // Label is always LTR, value aligns based on content
    const companyIsHebrew = containsRTL(companyName)
    if (companyIsHebrew) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
      doc.text('Customer Name: ', { continued: false, align: 'left' })
      doc.font('DejaVuSans').fontSize(11).fillColor(bodyGray)
      doc.text(companyName, { align: 'right' })
    } else {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
      doc.text('Customer Name: ', { continued: true, align: 'left' })
      doc.font('Helvetica').fillColor(bodyGray)
      doc.text(companyName, { align: 'left' })
    }

    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
    doc.text('Proposed Date: ', { continued: true, align: 'left' })
    doc.font('Helvetica').fillColor(bodyGray)
    doc.text(proposedDate, { align: 'left' })

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
      doc.text('KPIs', { continued: false, align: 'left' })
      doc.moveDown(0.3)
      scenario.kpis.forEach((kpi: any) => {
        const kpiIsHebrew = containsRTL(kpi.name)
        const boldFont = kpiIsHebrew ? 'DejaVuSans-Bold' : 'Helvetica-Bold'
        const bodyFont = kpiIsHebrew ? 'DejaVuSans' : 'Helvetica'
        const kpiAlign = kpiIsHebrew ? 'right' as const : 'left' as const

        doc.font(boldFont).fontSize(10).fillColor(bodyGray)
        doc.text(`• ${kpi.name}`, { continued: !!kpi.targetValue, align: kpiAlign })
        if (kpi.targetValue) {
          doc.font(bodyFont).fillColor(lightGray)
          doc.text(` — Target: ${kpi.targetValue}`, { align: kpiAlign })
        } else {
          doc.text('')
        }
      })
      doc.moveDown(0.8)
    }

    // Footer - always LTR
    if (doc.y > 750) doc.addPage()
    doc.moveTo(50, doc.y + 10).lineTo(545.28, doc.y + 10).strokeColor(lightGray).lineWidth(0.5).stroke()
    doc.moveDown(1)
    doc.font('Helvetica').fontSize(8).fillColor(lightGray)
    doc.text(`Generated by MassaPro — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' })

    // Collect the PDF buffer
    const chunks: Buffer[] = []
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err: Error) => reject(err))
      doc.end()
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
  } catch (error: any) {
    console.error('[PDF] PDF generation error:', error)
    console.error('[PDF] Error stack:', error?.stack)
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    }, { status: 500 })
  }
}
