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

// Reverse Hebrew/RTL text lines for correct visual display in LTR PDF
// PDFKit doesn't natively handle RTL, so we reverse the character order
function reverseRTLText(text: string): string {
  return text.split('\n').map(line => {
    if (/[\u0590-\u05FF\u0600-\u06FF]/.test(line)) {
      // Reverse the line character by character for visual RTL display
      return line.split('').reverse().join('')
    }
    return line
  }).join('\n')
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
      console.error('[PDF] Font registration failed, falling back to built-in fonts:', err)
    }

    const purple = '#7C3AED'
    const darkGray = '#1F2937'
    const bodyGray = '#374151'
    const lightGray = '#9CA3AF'

    // Choose the best font for the given text
    const getBodyFont = (text: string): string => {
      if (containsHebrew(text) || containsRTL(text)) {
        return 'DejaVuSans'
      }
      return 'Helvetica'
    }

    const getBoldFont = (text: string): string => {
      if (containsHebrew(text) || containsRTL(text)) {
        return 'DejaVuSans-Bold'
      }
      return 'Helvetica-Bold'
    }

    // Process text for RTL content
    const processText = (text: string): string => {
      if (containsRTL(text)) {
        return reverseRTLText(text)
      }
      return text
    }

    // Helper: draw a section
    const drawSection = (number: number, title: string, content: string | null | undefined) => {
      if (!content || content.trim() === '') return

      // Check if we need a new page (if less than 80pt remaining)
      if (doc.y > 720) {
        doc.addPage()
      }

      const isHebrew = containsHebrew(content) || containsRTL(content)
      const boldFont = isHebrew ? 'DejaVuSans-Bold' : 'Helvetica-Bold'
      const bodyFont = isHebrew ? 'DejaVuSans' : 'Helvetica'
      const displayContent = isHebrew ? reverseRTLText(content) : content
      const align = isHebrew ? 'right' as const : 'left' as const

      doc.font(boldFont).fontSize(12).fillColor(darkGray)
      doc.text(`${number}. ${title}`, { continued: false, align })
      doc.moveDown(0.3)
      doc.font(bodyFont).fontSize(10).fillColor(bodyGray)
      doc.text(displayContent, { lineGap: 3, align })
      doc.moveDown(0.8)
    }

    // ===== HEADER =====
    // Purple banner
    doc.rect(0, 0, 595.28, 80).fill(purple)

    // Title text
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
    doc.text('MassaPro Demo Form', 50, 25, { width: 495.28 })

    // Subtitle - use DejaVu if scenario name contains Hebrew
    const nameIsHebrew = containsHebrew(scenario.name) || containsRTL(scenario.name)
    if (nameIsHebrew) {
      doc.font('DejaVuSans').fontSize(10).fillColor('#E9D5FF')
      doc.text(reverseRTLText(scenario.name), 50, 58, { width: 495.28, align: 'right' })
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#E9D5FF')
      doc.text(scenario.name, 50, 58, { width: 495.28 })
    }

    doc.y = 100

    // ===== CUSTOMER INFO =====
    // Company name might contain Hebrew
    const companyIsHebrew = containsHebrew(companyName) || containsRTL(companyName)
    if (companyIsHebrew) {
      doc.font('DejaVuSans-Bold').fontSize(11).fillColor(darkGray)
      doc.text('Customer Name: ', { continued: true })
      doc.font('DejaVuSans').fillColor(bodyGray)
      doc.text(reverseRTLText(companyName))
    } else {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
      doc.text('Customer Name: ', { continued: true })
      doc.font('Helvetica').fillColor(bodyGray)
      doc.text(companyName)
    }

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
        const kpiIsHebrew = containsHebrew(kpi.name) || containsRTL(kpi.name)
        const boldFont = kpiIsHebrew ? 'DejaVuSans-Bold' : 'Helvetica-Bold'
        const bodyFont = kpiIsHebrew ? 'DejaVuSans' : 'Helvetica'
        const kpiName = kpiIsHebrew ? reverseRTLText(kpi.name) : kpi.name
        const kpiTarget = kpi.targetValue
          ? (containsHebrew(kpi.targetValue) ? reverseRTLText(kpi.targetValue) : kpi.targetValue)
          : null

        doc.font(boldFont).fontSize(10).fillColor(bodyGray)
        doc.text(`• ${kpiName}`, { continued: !!kpiTarget })
        if (kpiTarget) {
          doc.font(bodyFont).fillColor(lightGray)
          doc.text(` — Target: ${kpiTarget}`)
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
