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
    const FOOTER_Y = PAGE_HEIGHT - 40
    const MAX_CONTENT_Y = 750 // Don't write content below this line

    // Register Unicode-supporting fonts for Hebrew/multi-language text
    const fontsDir = path.join(process.cwd(), 'src', 'fonts')
    const logoPath = path.join(fontsDir, 'massapro-logo.png')
    const logoExists = fs.existsSync(logoPath)

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      autoFirstPage: true,
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
     * Draw RTL text correctly in PDFKit using word-by-word positioning.
     *
     * PDFKit renders all text left-to-right (LTR) and does NOT support RTL
     * text layout. Fontkit's shaping engine handles glyph ordering within each
     * Hebrew word correctly, but PDFKit lays out words in LTR order and its
     * 'align: right' mode interacts poorly with fontkit's RTL shaping — causing
     * spaces between words to be lost or repositioned.
     *
     * Solution: Render each word individually at a calculated x position.
     * 1. Manually break text into lines that fit the page width
     * 2. Keep words in RTL reading order (no reversal needed)
     * 3. Position each word from right to left using widthOfString()
     *
     * This gives us complete control over spacing and eliminates any dependency
     * on PDFKit's RTL handling or align: 'right'.
     */
    const drawRTLText = (text: string, font: string, fontSize: number, color: string, maxWidth: number, lineGap: number = 3) => {
      const paragraphs = text.split('\n')
      const rightEdge = PAGE_WIDTH - MARGIN
      const spaceWidth = doc.font(font).fontSize(fontSize).widthOfString(' ')

      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
          doc.moveDown(0.4)
          continue
        }

        // Split into words (preserving RTL reading order)
        const words = paragraph.trim().split(/\s+/)

        // Build lines that fit within maxWidth
        const lines: string[][] = []
        let currentLine: string[] = []
        let currentWidth = 0

        for (const word of words) {
          const wordWidth = doc.font(font).fontSize(fontSize).widthOfString(word)
          const neededSpace = currentLine.length > 0 ? spaceWidth : 0
          const neededWidth = neededSpace + wordWidth

          if (currentWidth + neededWidth > maxWidth && currentLine.length > 0) {
            lines.push([...currentLine])
            currentLine = [word]
            currentWidth = wordWidth
          } else {
            currentLine.push(word)
            currentWidth += neededWidth
          }
        }

        if (currentLine.length > 0) {
          lines.push(currentLine)
        }

        // Render each line: position each word individually from right to left
        for (const line of lines) {
          // Check if we need a new page before rendering this line
          if (doc.y > MAX_CONTENT_Y) {
            doc.addPage()
          }

          const lineY = doc.y

          // Calculate word widths for this line
          const wordWidths = line.map(w => doc.font(font).fontSize(fontSize).widthOfString(w))

          // Calculate total line width to check if it fits
          const totalLineWidth = wordWidths.reduce((sum, w) => sum + w, 0) + (line.length - 1) * spaceWidth

          // Position words from right to left (RTL reading order)
          let x = rightEdge
          for (let i = 0; i < line.length; i++) {
            x -= wordWidths[i]
            // Use width parameter to constrain the text box to just the word width
            // This prevents PDFKit from doing any internal repositioning
            doc.font(font).fontSize(fontSize).fillColor(color)
            doc.text(line[i], x, lineY, { 
              width: wordWidths[i] + 1, // +1 to avoid clipping
              lineBreak: false,
              align: 'left'
            })
            x -= spaceWidth
          }

          // Advance to next line position manually
          doc.x = MARGIN
          doc.y = lineY + fontSize + lineGap
        }
      }
    }

    /**
     * Render a short RTL text (single line) word-by-word, right-aligned.
     * Used for names, titles, and other short text elements.
     */
    const drawRTLShortText = (text: string, font: string, fontSize: number, color: string, maxWidth: number, xPos?: number, yPos?: number) => {
      const rightEdge = (xPos !== undefined ? xPos + maxWidth : PAGE_WIDTH - MARGIN)
      const words = text.trim().split(/\s+/)
      const spaceWidth = doc.font(font).fontSize(fontSize).widthOfString(' ')
      const wordWidths = words.map(w => doc.font(font).fontSize(fontSize).widthOfString(w))

      const lineY = yPos ?? doc.y

      let x = rightEdge
      for (let i = 0; i < words.length; i++) {
        x -= wordWidths[i]
        doc.font(font).fontSize(fontSize).fillColor(color)
        doc.text(words[i], x, lineY, { 
          width: wordWidths[i] + 1,
          lineBreak: false,
          align: 'left'
        })
        x -= spaceWidth
      }

      doc.x = MARGIN
      doc.y = lineY + fontSize
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
      // Render Hebrew name word-by-word for correct RTL display
      drawRTLShortText(scenario.name, 'DejaVuSans', 10, '#E9D5FF', PAGE_WIDTH - 140, 90, 55)
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
      // Render Hebrew company name word-by-word for correct RTL display
      drawRTLShortText(companyName, 'DejaVuSans', 11, bodyGray, CONTENT_WIDTH)
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
        if (doc.y > MAX_CONTENT_Y) doc.addPage()
        const kpiIsHebrew = containsRTL(kpi.name)
        if (kpiIsHebrew) {
          // Render Hebrew KPI name word-by-word from right to left
          const kpiY = doc.y
          const rightEdge = PAGE_WIDTH - MARGIN
          const spaceWidth = doc.font('DejaVuSans-Bold').fontSize(10).widthOfString(' ')

          // Render bullet first (rightmost position)
          const bulletWidth = doc.font('DejaVuSans-Bold').fontSize(10).widthOfString('\u2022')
          let x = rightEdge - bulletWidth
          doc.font('DejaVuSans-Bold').fontSize(10).fillColor(bodyGray)
          doc.text('\u2022', x, kpiY, { width: bulletWidth + 1, lineBreak: false, align: 'left' })
          x -= spaceWidth

          // Render KPI name words from right to left
          const kpiWords = kpi.name.trim().split(/\s+/)
          const wordWidths = kpiWords.map(w => doc.font('DejaVuSans-Bold').fontSize(10).widthOfString(w))

          for (let i = 0; i < kpiWords.length; i++) {
            x -= wordWidths[i]
            doc.font('DejaVuSans-Bold').fontSize(10).fillColor(bodyGray)
            doc.text(kpiWords[i], x, kpiY, { width: wordWidths[i] + 1, lineBreak: false, align: 'left' })
            x -= spaceWidth
          }

          // Render target value if present (LTR, at left side)
          if (kpi.targetValue) {
            doc.font('DejaVuSans').fontSize(10).fillColor(lightGray)
            doc.text(`\u2014 Target: ${kpi.targetValue}`, MARGIN, kpiY, { lineBreak: false })
          }

          doc.x = MARGIN
          doc.y = kpiY + 10 + 3
        } else {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(bodyGray)
          doc.text(`\u2022 ${kpi.name}`, { continued: !!kpi.targetValue, align: 'left' })
          if (kpi.targetValue) {
            doc.font('Helvetica').fillColor(lightGray)
            doc.text(` \u2014 Target: ${kpi.targetValue}`, { align: 'left' })
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
    // Get the ACTUAL content page count before adding footers
    const range = doc.bufferedPageRange()
    const pageCount = range.count
    const footerDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    console.log(`[PDF] Total content pages before footer: ${pageCount}`)

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)

      // CRITICAL: Save cursor position before footer, restore after.
      // This prevents footer text from moving doc.y and triggering auto page breaks.
      const savedX = doc.x
      const savedY = doc.y

      // Bottom-left: "Generated by MassaPro — Month DD, YYYY"
      doc.font('Helvetica').fontSize(7).fillColor(lightGray)
      doc.text(
        `Generated by MassaPro \u2014 ${footerDate}`,
        MARGIN, FOOTER_Y,
        { width: CONTENT_WIDTH / 3, align: 'left', lineBreak: false }
      )

      // Bottom-center: "Page X of Y"
      doc.font('Helvetica').fontSize(7).fillColor(lightGray)
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        MARGIN + CONTENT_WIDTH / 3, FOOTER_Y,
        { width: CONTENT_WIDTH / 3, align: 'center', lineBreak: false }
      )

      // Bottom-right: MassaPro logo (all pages)
      if (logoExists) {
        try {
          const logoSize = 20
          const logoX = PAGE_WIDTH - MARGIN - logoSize
          const logoY = FOOTER_Y - 2
          doc.image(logoPath, logoX, logoY, {
            width: logoSize,
            height: logoSize,
          })
        } catch (e) {
          console.error('[PDF] Footer logo error on page', i + 1, ':', e)
        }
      }

      // Restore cursor to prevent auto-page-break from footer text
      doc.x = savedX
      doc.y = savedY
    }

    // Don't switch back to last page — just end the document
    // Switching back can trigger unwanted page effects

    // Collect the PDF buffer
    const chunks: Buffer[] = []
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err: Error) => reject(err))
      doc.end()
    })

    console.log(`[PDF] Generated PDF size: ${pdfBuffer.length} bytes, pages: ${pageCount}`)

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
