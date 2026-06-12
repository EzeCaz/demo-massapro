import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import path from 'path'
import fs from 'fs'
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

    const purple = '#7C3AED'
    const darkGray = '#1F2937'
    const bodyGray = '#374151'
    const lightGray = '#9CA3AF'
    const PAGE_WIDTH = 595.28
    const PAGE_HEIGHT = 841.89
    const MARGIN = 50
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
    const FOOTER_Y = PAGE_HEIGHT - 35
    const FOOTER_LOGO_SIZE = 24

    // Register Unicode-supporting fonts for Hebrew/multi-language text
    const fontsDir = path.join(process.cwd(), 'src', 'fonts')
    const logoPath = path.join(fontsDir, 'massapro-logo.png')
    const logoExists = fs.existsSync(logoPath)

    // Track the range of pages for footers
    // We'll add footers AFTER all content is written by accessing the page ranges
    let currentPage = 1
    const pageRanges: { start: number; end: number }[] = [{ start: 1, end: 1 }]

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,  // Enable buffered pages so we can add footers after
      info: {
        Title: `MassaPro Demo Form - ${scenario.name}`,
        Author: 'MassaPro',
        Subject: `Demo Form for ${companyName}`,
      },
    })

    try {
      doc.registerFont('DejaVuSans', path.join(fontsDir, 'DejaVuSans.ttf'))
      doc.registerFont('DejaVuSans-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'))
    } catch (err) {
      console.error('[PDF] Font registration failed:', err)
    }

    // Helper: draw a section
    const drawSection = (number: number, title: string, content: string | null | undefined) => {
      if (!content || content.trim() === '') return

      // Check if we need a new page
      if (doc.y > 700) {
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

    // ===== PAGE 1 HEADER =====
    // Purple banner
    doc.rect(0, 0, PAGE_WIDTH, 90).fill(purple)

    // Logo at top-left of the banner
    if (logoExists) {
      try {
        doc.image(logoPath, 15, 12, { width: 66, height: 66 })
      } catch (e) {
        console.error('[PDF] Header logo error:', e)
      }
    }

    // Title text - always LTR, positioned after the logo
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#FFFFFF')
    doc.text('MassaPro Demo Form', 90, 22, { width: PAGE_WIDTH - 140, align: 'left' })

    // Subtitle - scenario name
    const nameIsHebrew = containsRTL(scenario.name)
    const subtitleFont = nameIsHebrew ? 'DejaVuSans' : 'Helvetica'
    const subtitleAlign = nameIsHebrew ? 'right' as const : 'left' as const
    doc.font(subtitleFont).fontSize(10).fillColor('#E9D5FF')
    doc.text(scenario.name, 90, 55, { width: PAGE_WIDTH - 140, align: subtitleAlign })

    doc.y = 110

    // ===== CUSTOMER INFO =====
    const companyIsHebrew = containsRTL(companyName)
    if (companyIsHebrew) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
      doc.text('Customer Name:', { continued: false, align: 'left' })
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
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor(lightGray).lineWidth(0.5).stroke()
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

    // KPIs section
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

    // Final separator
    if (doc.y > 740) doc.addPage()
    doc.moveTo(MARGIN, doc.y + 10).lineTo(PAGE_WIDTH - MARGIN, doc.y + 10).strokeColor(lightGray).lineWidth(0.5).stroke()

    // ===== ADD FOOTERS TO ALL PAGES =====
    // Get the total number of pages (buffered mode lets us switch pages)
    const totalPages = doc.bufferedPageRange()

    for (let i = 0; i < totalPages.count; i++) {
      doc.switchToPage(i)

      // Footer text on every page
      doc.font('Helvetica').fontSize(7).fillColor(lightGray)
      doc.text(
        `Generated by MassaPro — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        MARGIN, FOOTER_Y,
        { width: CONTENT_WIDTH - 30, align: 'left', lineBreak: false }
      )

      // Footer logo on pages 2+
      if (i >= 1 && logoExists) {
        try {
          doc.image(logoPath, PAGE_WIDTH - MARGIN - FOOTER_LOGO_SIZE, PAGE_HEIGHT - 40, {
            width: FOOTER_LOGO_SIZE,
            height: FOOTER_LOGO_SIZE,
          })
        } catch (e) {
          // Skip silently
        }
      }
    }

    // Switch back to last page (required before finalizing)
    doc.switchToPage(totalPages.count - 1)

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
