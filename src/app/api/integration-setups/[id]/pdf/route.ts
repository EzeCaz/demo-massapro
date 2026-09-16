import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import path from 'path'
import fs from 'fs'
import PDFDocument from 'pdfkit'
import { readShareScope } from '@/lib/share-scope'
import { INTEGRATION_FIELDS } from '@/lib/integration-fields'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Detect any RTL characters (Hebrew, Arabic)
function containsRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(text)
}

// GET /api/integration-setups/[id]/pdf?lang=original|en|es|he
//
// Generates a PDF of the integration setup with all 28 fields. Uses the
// language-specific variants when ?lang= is set, falling back to the
// base field. Mirrors the scenario PDF route's layout (purple header
// banner with logo, status badge, footer with page number on every page).
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
    const setup = await db.integrationSetup.findUnique({ where: { id } })

    if (!setup) {
      return NextResponse.json({ error: 'Integration setup not found' }, { status: 404 })
    }

    // Permission: admin, owner, or share user scoped to this setup.
    const userId = (session.user as any).id
    const userRole = (session.user as any).role
    const scope = readShareScope(session.user as any)
    if (scope.isShare) {
      if (scope.setupId !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (userRole !== 'admin' && userRole !== 'super_admin' && setup.clientId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Optional ?lang= query
    const requestedLang = (req.nextUrl.searchParams.get('lang') || 'original').toLowerCase()
    const validLangs = ['original', 'en', 'es', 'he']
    const lang = validLangs.includes(requestedLang) ? requestedLang : 'original'
    const langSuffix = lang === 'original' ? '' : lang.charAt(0).toUpperCase() + lang.slice(1)

    const resolveField = (fieldName: string): string | null => {
      if (lang !== 'original') {
        const v = (setup as any)[fieldName + langSuffix]
        if (v && String(v).trim() !== '') return String(v)
      }
      const base = (setup as any)[fieldName]
      return base ? String(base) : null
    }

    // Look up the magic-link share URL to print on the PDF — pick the most
    // recent share for this setup. For share users, look up their own.
    let shareUrl: string | null = null
    if (scope.isShare) {
      const share = await db.integrationSetupShare.findFirst({
        where: { setupId: id, email: scope.email || '' },
        select: { token: true },
      })
      if (share) shareUrl = `${req.nextUrl.origin}/s/${share.token}`
    } else {
      const share = await db.integrationSetupShare.findFirst({
        where: { setupId: id },
        orderBy: { createdAt: 'desc' },
        select: { token: true },
      })
      if (share) shareUrl = `${req.nextUrl.origin}/s/${share.token}`
    }

    // ===== PDF generation =====
    const purple = '#7C3AED'
    const darkGray = '#1F2937'
    const bodyGray = '#374151'
    const lightGray = '#9CA3AF'
    const PAGE_WIDTH = 595.28
    const PAGE_HEIGHT = 841.89
    const MARGIN = 50
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
    const FOOTER_Y = PAGE_HEIGHT - 40
    const MAX_CONTENT_Y = 750

    const fontsDir = path.join(process.cwd(), 'src', 'fonts')
    const logoPath = path.join(fontsDir, 'massapro-logo.png')
    const logoExists = fs.existsSync(logoPath)

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `MassaPro Integration Setup - ${setup.name}`,
        Author: 'MassaPro',
        Subject: `Integration Setup for ${setup.name}`,
      },
    })

    try {
      doc.registerFont('DejaVuSans', path.join(fontsDir, 'DejaVuSans.ttf'))
      doc.registerFont('DejaVuSans-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'))
    } catch (err) {
      console.error('[IntegrationSetup PDF] Font registration failed:', err)
    }

    // Custom RTL text renderer — copied from the scenario PDF route so we
    // get correct Hebrew/Arabic word-by-word right-to-left layout.
    const drawRTLText = (text: string, font: string, fontSize: number, color: string, maxWidth: number, lineGap: number = 3) => {
      const paragraphs = text.split('\n')
      const rightEdge = PAGE_WIDTH - MARGIN
      const spaceWidth = doc.font(font).fontSize(fontSize).widthOfString(' ')

      for (const paragraph of paragraphs) {
        if (!paragraph.trim()) {
          doc.moveDown(0.4)
          continue
        }
        const words = paragraph.trim().split(/\s+/)
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
        if (currentLine.length > 0) lines.push(currentLine)

        for (const line of lines) {
          if (doc.y > MAX_CONTENT_Y) doc.addPage()
          const lineY = doc.y
          const wordWidths = line.map(w => doc.font(font).fontSize(fontSize).widthOfString(w))
          let x = rightEdge
          for (let i = 0; i < line.length; i++) {
            x -= wordWidths[i]
            doc.font(font).fontSize(fontSize).fillColor(color)
            doc.text(line[i], x, lineY, {
              width: wordWidths[i] + 1,
              lineBreak: false,
              align: 'left',
            })
            x -= spaceWidth
          }
          doc.x = MARGIN
          doc.y = lineY + fontSize + lineGap
        }
      }
    }

    // Render a short RTL text (single line) word-by-word, right-aligned.
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
          align: 'left',
        })
        x -= spaceWidth
      }
      doc.x = MARGIN
      doc.y = lineY + fontSize
    }

    // Helper: draw a numbered section
    const drawSection = (number: number, title: string, content: string | null | undefined) => {
      if (!content || content.trim() === '') return

      if (doc.y > 700) doc.addPage()

      const isRTL = containsRTL(content)

      doc.x = MARGIN
      doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray)
      doc.text(`${number}. ${title}`, MARGIN, doc.y, {
        continued: false,
        align: 'left',
        width: CONTENT_WIDTH,
      })
      doc.moveDown(0.3)

      if (isRTL) {
        drawRTLText(content, 'DejaVuSans', 10, bodyGray, CONTENT_WIDTH, 3)
      } else {
        doc.font('Helvetica').fontSize(10).fillColor(bodyGray)
        doc.text(content, MARGIN, doc.y, {
          lineGap: 3,
          align: 'left',
          width: CONTENT_WIDTH,
        })
      }

      doc.moveDown(0.8)
      doc.x = MARGIN
    }

    // ===== PAGE 1 HEADER =====
    doc.rect(0, 0, PAGE_WIDTH, 90).fill(purple)
    if (logoExists) {
      try {
        doc.image(logoPath, 15, 12, { width: 66, height: 66 })
      } catch (e) {
        console.error('[IntegrationSetup PDF] Header logo error:', e)
      }
    }
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#FFFFFF')
    doc.text('MassaPro Integration Setup', 90, 22, { width: PAGE_WIDTH - 140, align: 'left' })

    // Subtitle - setup name
    const nameIsHebrew = containsRTL(setup.name)
    if (nameIsHebrew) {
      drawRTLShortText(setup.name, 'DejaVuSans', 10, '#E9D5FF', PAGE_WIDTH - 140, 90, 55)
    } else {
      doc.font('Helvetica').fontSize(10).fillColor('#E9D5FF')
      doc.text(setup.name, 90, 55, { width: PAGE_WIDTH - 140, align: 'left' })
    }

    // Language badge (top-right of the purple banner)
    if (lang !== 'original') {
      const badgeLabel: Record<string, string> = { en: 'English', es: 'Español', he: 'עברית' }
      const label = badgeLabel[lang] || ''
      if (label) {
        const badgeIsRTL = containsRTL(label)
        const badgeFont = badgeIsRTL ? 'DejaVuSans' : 'Helvetica-Bold'
        const badgeFontSize = 9
        const badgePadding = 8
        const badgeText = `LANG: ${label}`
        const badgeWidth = doc.font(badgeFont).fontSize(badgeFontSize).widthOfString(badgeText) + (badgePadding * 2)
        const badgeHeight = 18
        const badgeX = PAGE_WIDTH - MARGIN - badgeWidth
        const badgeY = 12
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 9).fill('#5B21B6')
        doc.font(badgeFont).fontSize(badgeFontSize).fillColor('#FFFFFF')
        if (badgeIsRTL) {
          drawRTLShortText(badgeText, badgeFont, badgeFontSize, '#FFFFFF', badgeWidth - badgePadding * 2, badgeX + badgePadding, badgeY + 4)
        } else {
          doc.text(badgeText, badgeX + badgePadding, badgeY + 4, { width: badgeWidth - badgePadding * 2, align: 'center', lineBreak: false })
        }
      }
    }

    doc.y = 110

    // ===== INFO ROW =====
    doc.x = MARGIN
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
    doc.text('Status: ', MARGIN, doc.y, {
      continued: true,
      align: 'left',
      width: CONTENT_WIDTH,
    })
    doc.font('Helvetica').fillColor(bodyGray)
    doc.text(setup.status === 'submitted' ? 'Submitted' : 'Draft', { align: 'left' })

    doc.x = MARGIN
    doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
    doc.text('Created: ', MARGIN, doc.y, {
      continued: true,
      align: 'left',
      width: CONTENT_WIDTH,
    })
    doc.font('Helvetica').fillColor(bodyGray)
    doc.text(setup.createdAt ? new Date(setup.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A', { align: 'left' })

    // Share URL — printed near the top so the PDF itself can be opened
    // online by the recipient (or by the owner to verify the link).
    if (shareUrl) {
      doc.x = MARGIN
      doc.font('Helvetica-Bold').fontSize(11).fillColor(darkGray)
      doc.text('View online: ', MARGIN, doc.y, {
        continued: true,
        align: 'left',
        width: CONTENT_WIDTH,
      })
      doc.font('Helvetica').fillColor(purple)
      doc.text(shareUrl, { align: 'left', link: shareUrl })
    }

    doc.moveDown(1)
    doc.x = MARGIN

    // Separator
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).strokeColor(lightGray).lineWidth(0.5).stroke()
    doc.moveDown(0.8)

    // ===== SECTIONS =====
    INTEGRATION_FIELDS.forEach((fieldKey, idx) => {
      const title = prettifyFieldName(fieldKey)
      drawSection(idx + 1, title, resolveField(fieldKey))
    })

    // Final separator
    if (doc.y > 740) doc.addPage()
    doc.moveTo(MARGIN, doc.y + 10).lineTo(PAGE_WIDTH - MARGIN, doc.y + 10).strokeColor(lightGray).lineWidth(0.5).stroke()

    // ===== FOOTERS ON ALL PAGES =====
    const range = doc.bufferedPageRange()
    const pageCount = range.count
    const footerDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      const savedX = doc.x
      const savedY = doc.y
      const savedBottomMargin = doc.page.margins.bottom
      doc.page.margins.bottom = 0

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

      // Bottom-right: MassaPro logo
      if (logoExists) {
        try {
          const logoSize = 20
          const logoX = PAGE_WIDTH - MARGIN - logoSize
          const logoY = FOOTER_Y - 2
          doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize })
        } catch (e) {
          console.error('[IntegrationSetup PDF] Footer logo error on page', i + 1, ':', e)
        }
      }

      doc.page.margins.bottom = savedBottomMargin
      doc.x = savedX
      doc.y = savedY
    }

    const chunks: Buffer[] = []
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err: Error) => reject(err))
      doc.end()
    })

    const safeName = setup.name.replace(/[^a-zA-Z0-9]/g, '-')
    const langSuffixForFile = lang !== 'original' ? `-${lang}` : ''
    const fileName = `MassaPro-IntegrationSetup-${safeName}${langSuffixForFile}.pdf`

    const isPreview = req.nextUrl.searchParams.get('preview') === 'true'
    const disposition = isPreview ? 'inline' : 'attachment'

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('[IntegrationSetup PDF] PDF generation error:', error)
    console.error('[IntegrationSetup PDF] Error stack:', error?.stack)
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    }, { status: 500 })
  }
}

// Convert a camelCase field key to a Title Case string suitable for a PDF
// section heading (e.g., "languagesToUse" -> "Languages To Use").
function prettifyFieldName(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
