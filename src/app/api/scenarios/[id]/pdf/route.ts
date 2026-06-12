import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import path from 'path'
import fs from 'fs'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
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

    /**
     * Draw RTL text correctly in PDFKit.
     *
     * PDFKit renders all text left-to-right (LTR). For Hebrew/RTL text to display
     * correctly, we must:
     * 1. Manually break text into lines that fit the page width
     * 2. Reverse the WORD ORDER in each line (so the first word in reading order
     *    ends up at the rightmost position when rendered LTR)
     * 3. Render each line individually with align: 'right'
     *
     * We must NOT reverse characters within words — fontkit's shaping engine
     * already handles correct glyph ordering for RTL scripts within each word.
     */
    const drawRTLText = (text: string, font: string, fontSize: number, color: string, maxWidth: number, lineGap: number = 3) => {
      const paragraphs = text.split('\n')

      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
          doc.moveDown(0.4)
          continue
        }

        const words = paragraph.trim().split(/\s+/)
        let currentLine = ''

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const testWidth = doc.font(font).fontSize(fontSize).widthOfString(testLine)

          if (testWidth > maxWidth && currentLine) {
            // Current line is full — reverse word order and render it
            const lineWords = currentLine.split(/\s+/)
            const reversedLine = lineWords.reverse().join(' ')

            // Check page break
            if (doc.y > 750) doc.addPage()

            doc.font(font).fontSize(fontSize).fillColor(color)
            doc.text(reversedLine, MARGIN, doc.y, {
              width: maxWidth,
              align: 'right',
              lineBreak: false,
            })
            doc.y += fontSize + lineGap

            currentLine = word
          } else {
            currentLine = testLine
          }
        }

        // Render the last (or only) line
        if (currentLine) {
          const lineWords = currentLine.split(/\s+/)
          const reversedLine = lineWords.reverse().join(' ')

          if (doc.y > 750) doc.addPage()

          doc.font(font).fontSize(fontSize).fillColor(color)
          doc.text(reversedLine, MARGIN, doc.y, {
            width: maxWidth,
            align: 'right',
            lineBreak: false,
          })
          doc.y += fontSize + lineGap
        }
      }
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

      if (isRTL) {
        // Use custom RTL renderer for Hebrew content
        drawRTLText(content, 'DejaVuSans', 10, bodyGray, CONTENT_WIDTH, 3)
      } else {
        // Normal LTR text
        doc.font('Helvetica').fontSize(10).fillColor(bodyGray)
        doc.text(content, { lineGap: 3, align: 'left' })
      }

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
    if (nameIsHebrew) {
      // Render Hebrew name using RTL text handler
      doc.font('DejaVuSans').fontSize(10).fillColor('#E9D5FF')
      const nameWords = scenario.name.split(/\s+/).reverse().join(' ')
      doc.text(nameWords, 90, 55, { width: PAGE_WIDTH - 140, align: 'right', lineBreak: false })
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#E9D5FF')
      doc.text(scenario.name, 90, 55, { width: PAGE_WIDTH - 140, align: 'left' })
    }

    doc.y = 110

    // ===== CUSTOMER INFO =====
    const companyIsHebrew = containsRTL(companyName)
    if (companyIsHebrew) {
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
      doc.text('Customer Name:', { continued: false, align: 'left' })
      const companyWords = companyName.split(/\s+/).reverse().join(' ')
      doc.font('DejaVuSans').fontSize(11).fillColor(bodyGray)
      doc.text(companyWords, { align: 'right', lineBreak: false })
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
        if (kpiIsHebrew) {
          const kpiWords = kpi.name.split(/\s+/).reverse().join(' ')
          doc.font('DejaVuSans-Bold').fontSize(10).fillColor(bodyGray)
          doc.text(`• ${kpiWords}`, { continued: !!kpi.targetValue, align: 'right', lineBreak: false })
          if (kpi.targetValue) {
            doc.font('DejaVuSans').fillColor(lightGray)
            doc.text(` — Target: ${kpi.targetValue}`, { align: 'right', lineBreak: false })
          }
        } else {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(bodyGray)
          doc.text(`• ${kpi.name}`, { continued: !!kpi.targetValue, align: 'left' })
          if (kpi.targetValue) {
            doc.font('Helvetica').fillColor(lightGray)
            doc.text(` — Target: ${kpi.targetValue}`, { align: 'left' })
          }
        }
        doc.text('')
      })
      doc.moveDown(0.8)
    }

    // Final separator
    if (doc.y > 740) doc.addPage()
    doc.moveTo(MARGIN, doc.y + 10).lineTo(PAGE_WIDTH - MARGIN, doc.y + 10).strokeColor(lightGray).lineWidth(0.5).stroke()

    // ===== ADD FOOTERS TO ALL PAGES =====
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

    // Switch back to last page
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
