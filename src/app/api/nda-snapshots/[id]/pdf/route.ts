import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import {
  NDACoverInfo, NDA_SECTIONS, NDA_RECITALS,
  buildNdaIntro, buildNdaSignatures,
} from '@/lib/nda-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// MassaPro Visual & Design System colors
const ORCHID = '#7F39FB'
const DARK_NEAR_BLACK = '#0A0711'
const DARK_INDIGO = '#241445'
const DARK_VIOLET = '#3D1F6B'
const LAVENDER = '#E9D5FF'
const JET = '#0A0711'
const WHITE = '#FFFFFF'
const GREY = '#9CA3AF'

const PAGE_WIDTH = 595.28 // A4 portrait in points
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const snapshot = await db.nDASnapshot.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })
    if (!snapshot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = snapshot.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = snapshot.payload as any
    const cover: NDACoverInfo = {
      sinbaName: payload.cover?.sinbaName || 'SINBA GROUP ISRAEL LTD.',
      sinbaEntityType: payload.cover?.sinbaEntityType || 'an Israeli company',
      sinbaRegistrationNumber: payload.cover?.sinbaRegistrationNumber || '516133139',
      sinbaAddress: payload.cover?.sinbaAddress || 'Issac Bashevis Singer 2/21, Tel Aviv 6967016, Israel',
      sinbaEmail: payload.cover?.sinbaEmail || 'eze@massapro.com',
      recipientName: payload.cover?.recipientName || '',
      recipientType: payload.cover?.recipientType || 'corporate',
      recipientIdOrPassport: payload.cover?.recipientIdOrPassport || '',
      recipientAddress: payload.cover?.recipientAddress || '',
      recipientEmail: payload.cover?.recipientEmail || '',
      effectiveDate: payload.cover?.effectiveDate || '',
      sinbaSignatoryName: payload.cover?.sinbaSignatoryName || 'Roberto Singler',
      sinbaSignatoryTitle: payload.cover?.sinbaSignatoryTitle || 'CEO',
      sinbaSignatoryDate: payload.cover?.sinbaSignatoryDate || '',
      recipientSignatoryName: payload.cover?.recipientSignatoryName || '',
      recipientSignatoryTitle: payload.cover?.recipientSignatoryTitle || '',
      recipientSignatoryDate: payload.cover?.recipientSignatoryDate || '',
      annexItems: payload.cover?.annexItems || [],
    }

    // ---- Build the PDF ----
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Mutual NDA — ${cover.recipientName || snapshot.name}`,
        Author: 'MassaPro NDA Builder',
        Subject: 'Mutual Non-Disclosure and Non-Circumvention Agreement',
      },
    })

    const buffers: Buffer[] = []
    doc.on('data', (b: Buffer) => buffers.push(b))

    // ---- Helpers ----
    const drawDarkGradientBanner = (height: number) => {
      const gradient = doc.linearGradient(MARGIN, doc.y, MARGIN, doc.y + height)
      gradient.stop(0, DARK_NEAR_BLACK).stop(0.5, DARK_VIOLET).stop(1, DARK_INDIGO)
      doc.rect(MARGIN, doc.y, CONTENT_WIDTH, height).fill(gradient)
      doc.y += height
    }

    const drawBody = (text: string, opts: { indent?: number; italic?: boolean; color?: string; size?: number; bold?: boolean } = {}) => {
      doc.fontSize(opts.size || 11).fillColor(opts.color || JET).font(opts.bold ? 'Helvetica-Bold' : opts.italic ? 'Helvetica-Oblique' : 'Helvetica')
      doc.text(text, MARGIN + (opts.indent || 0), doc.y, {
        width: CONTENT_WIDTH - (opts.indent || 0),
        align: 'left',
        lineGap: 4,
      })
      doc.y += 4
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    const drawSectionHeading = (text: string) => {
      doc.fontSize(14).fillColor(ORCHID).font('Helvetica-Bold')
      doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH })
      doc.y += 4
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(ORCHID).lineWidth(1.5).stroke()
      doc.y += 10
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    // ---- Cover Page ----
    doc.y = 60
    drawDarkGradientBanner(280)

    // Logo
    const logoPath = path.join(process.cwd(), 'public', 'massapro-logo.png')
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, (PAGE_WIDTH - 100) / 2, 80, { width: 100, height: 100 })
      } catch {}
    }

    // Title text on dark banner — WHITE + LAVENDER
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(28)
    doc.text('MassaPro', MARGIN, 200, { width: CONTENT_WIDTH, align: 'center' })
    doc.fontSize(18).fillColor(LAVENDER)
    doc.text('Mutual NDA', MARGIN, 235, { width: CONTENT_WIDTH, align: 'center' })
    doc.fillColor(WHITE).font('Helvetica-Oblique').fontSize(12)
    doc.text('Non-Disclosure & Non-Circumvention Agreement', MARGIN, 265, { width: CONTENT_WIDTH, align: 'center' })

    // Move below the dark banner
    doc.y = 370
    doc.fillColor(JET).font('Helvetica').fontSize(11)

    // Cover info table
    const coverRows: [string, string][] = [
      ['Effective Date', cover.effectiveDate || '—'],
      ['Sinba', cover.sinbaName],
      ['Recipient', cover.recipientName || '—'],
      ['Recipient Email', cover.recipientEmail || '—'],
    ]
    // Draw a simple table
    const drawTable = (rows: [string, string][], colWidths: number[]) => {
      const rowHeight = 24
      const widths = colWidths.map((p) => (CONTENT_WIDTH * p) / 100)
      // Header
      doc.rect(MARGIN, doc.y, CONTENT_WIDTH, rowHeight).fill(ORCHID)
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
      doc.text('Field', MARGIN + 6, doc.y + 6, { width: widths[0] - 12, lineBreak: false })
      doc.text('Value', MARGIN + widths[0] + 6, doc.y + 6, { width: widths[1] - 12, lineBreak: false })
      doc.y += rowHeight
      // Body rows
      rows.forEach((row, ri) => {
        if (doc.y + rowHeight > PAGE_HEIGHT - 70) { doc.addPage() }
        const y = doc.y
        if (ri % 2 === 1) doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(LAVENDER)
        doc.fillColor(JET).font('Helvetica').fontSize(9)
        doc.text(row[0], MARGIN + 6, y + 6, { width: widths[0] - 12, lineBreak: false, ellipsis: true })
        doc.text(row[1], MARGIN + widths[0] + 6, y + 6, { width: widths[1] - 12, lineBreak: false, ellipsis: true })
        doc.y = y + rowHeight
      })
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(ORCHID).lineWidth(1.5).stroke()
      doc.y += 10
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }
    drawTable(coverRows, [35, 65])

    doc.addPage()

    // ---- TOC page ----
    const tocPageIdx = 1
    doc.y = 80
    doc.fillColor(ORCHID).font('Helvetica-Bold').fontSize(20)
    doc.text('Table of Contents', MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
    doc.y += 8
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(ORCHID).lineWidth(1.5).stroke()
    doc.y += 20

    // Track TOC entries for link annotations
    let currentPageIdx = 2 // body starts at page 3 (0-indexed = 2)
    const tocLinks: { destPageIdx: number; entryY: number; entryHeight: number }[] = []

    const drawTocLink = (label: string, destPageIdx: number) => {
      const entryY = doc.y
      doc.fontSize(11).fillColor(ORCHID).font('Helvetica')
      doc.text(label, MARGIN, entryY, { width: 350, align: 'left', lineBreak: false })
      doc.fillColor(GREY)
      doc.text(String(destPageIdx + 1), PAGE_WIDTH - MARGIN - 50, entryY, { width: 50, align: 'right', lineBreak: false })
      tocLinks.push({ destPageIdx, entryY, entryHeight: 16 })
      doc.y = entryY + 20
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    NDA_SECTIONS.forEach((sec, i) => {
      drawTocLink(`${sec.number}. ${sec.title}`, currentPageIdx)
      // Estimate how many pages this section will span — we don't know
      // exactly, so we just link to the start of the body (page 3).
      // The actual linking uses the page number at render time.
    })
    drawTocLink('Annex 1 — Tech Platforms & Providers', currentPageIdx)

    doc.addPage()

    // ---- Body content ----
    // Title
    doc.fillColor(ORCHID).font('Helvetica-Bold').fontSize(16)
    doc.text('MUTUAL NON-DISCLOSURE AND NON-CIRCUMVENTION AGREEMENT', MARGIN, 80, { width: CONTENT_WIDTH, align: 'center' })
    doc.y += 10
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(ORCHID).lineWidth(1.5).stroke()
    doc.y += 20
    doc.fillColor(JET).font('Helvetica').fontSize(11)

    // Intro
    const intro = buildNdaIntro(cover)
    intro.split('\n\n').forEach((para) => drawBody(para))

    // Recitals
    drawSectionHeading('RECITALS')
    NDA_RECITALS.forEach((recital) => drawBody(recital))
    drawBody('NOW, THEREFORE, in consideration of the mutual covenants, terms, and conditions set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:')

    // Sections
    NDA_SECTIONS.forEach((sec) => {
      drawSectionHeading(`${sec.number}. ${sec.title}`)
      sec.paragraphs.forEach((para) => drawBody(para))
    })

    // Signature block
    doc.y += 20
    drawBody('IN WITNESS WHEREOF, the Parties hereto have executed this Mutual Non-Disclosure and Non-Circumvention Agreement as of the Effective Date set forth above.', { bold: true })
    doc.y += 10

    // Signature block — renders the signature image, signed-by name, and
    // timestamp for each party. If a party hasn't signed yet, shows blank
    // fields for them to fill in.
    const signatures = (payload.signatures || {}) as {
      sinba?: { signedBy: string; signedAt: string; signedByEmail: string; image?: string }
      recipient?: { signedBy: string; signedAt: string; signedByEmail: string; image?: string }
    }
    const sigs = buildNdaSignatures(cover)

    // Draw a two-column signature block with space for the signature image
    const sigColWidth = CONTENT_WIDTH / 2
    const sigStartY = doc.y
    const sigBoxHeight = 200 // total height for each signature column
    const sigImageHeight = 80 // height of the signature image area

    // Outer border
    doc.moveTo(MARGIN, sigStartY).lineTo(MARGIN + CONTENT_WIDTH, sigStartY).strokeColor(ORCHID).lineWidth(1.5).stroke()

    // Column divider
    doc.moveTo(MARGIN + sigColWidth, sigStartY).lineTo(MARGIN + sigColWidth, sigStartY + sigBoxHeight).strokeColor(LAVENDER).lineWidth(0.5).stroke()

    // Header row
    doc.rect(MARGIN, sigStartY, CONTENT_WIDTH, 24).fill(ORCHID)
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
    doc.text('SINBA GROUP ISRAEL LTD.', MARGIN + 8, sigStartY + 7, { width: sigColWidth - 16, align: 'left', lineBreak: false })
    doc.text('RECIPIENT', MARGIN + sigColWidth + 8, sigStartY + 7, { width: sigColWidth - 16, align: 'left', lineBreak: false })

    let sigY = sigStartY + 24

    // ---- Sinba signature column ----
    // Signature image area (if signed with an image)
    if (signatures.sinba?.image) {
      try {
        const imgBuffer = Buffer.from(signatures.sinba.image.split(',')[1], 'base64')
        doc.image(imgBuffer, MARGIN + 20, sigY, { fit: [sigColWidth - 40, sigImageHeight] })
      } catch {}
    } else {
      // Empty signature box
      doc.rect(MARGIN + 20, sigY, sigColWidth - 40, sigImageHeight).stroke(LAVENDER).lineWidth(0.5).dash(2, { space: 3 })
      doc.undash()
      doc.fillColor(GREY).font('Helvetica-Oblique').fontSize(10)
      doc.text('Signature', MARGIN + 20, sigY + sigImageHeight / 2 - 5, { width: sigColWidth - 40, align: 'center', lineBreak: false })
    }
    sigY += sigImageHeight + 4

    // Sinba details
    doc.fillColor(JET).font('Helvetica').fontSize(9)
    doc.text(`By: ${signatures.sinba?.signedBy || sigs.sinba[1][1] || '________________'}`, MARGIN + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    sigY += 14
    doc.text(`Name: ${signatures.sinba?.signedBy || sigs.sinba[2][1] || '________________'}`, MARGIN + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    sigY += 14
    doc.text(`Title: ${sigs.sinba[3][1] || '________________'}`, MARGIN + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    sigY += 14
    if (signatures.sinba?.signedAt) {
      doc.fillColor('#10B981').font('Helvetica-Bold').fontSize(9)
      doc.text(`Signed: ${new Date(signatures.sinba.signedAt).toLocaleString()}`, MARGIN + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    } else {
      doc.text(`Date: ${sigs.sinba[4][1] || '________________'}`, MARGIN + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    }

    // ---- Recipient signature column ----
    sigY = sigStartY + 24
    if (signatures.recipient?.image) {
      try {
        const imgBuffer = Buffer.from(signatures.recipient.image.split(',')[1], 'base64')
        doc.image(imgBuffer, MARGIN + sigColWidth + 20, sigY, { fit: [sigColWidth - 40, sigImageHeight] })
      } catch {}
    } else {
      doc.rect(MARGIN + sigColWidth + 20, sigY, sigColWidth - 40, sigImageHeight).stroke(LAVENDER).lineWidth(0.5).dash(2, { space: 3 })
      doc.undash()
      doc.fillColor(GREY).font('Helvetica-Oblique').fontSize(10)
      doc.text('Signature', MARGIN + sigColWidth + 20, sigY + sigImageHeight / 2 - 5, { width: sigColWidth - 40, align: 'center', lineBreak: false })
    }
    sigY += sigImageHeight + 4

    doc.fillColor(JET).font('Helvetica').fontSize(9)
    doc.text(`By: ${signatures.recipient?.signedBy || sigs.recipient[1][1] || '________________'}`, MARGIN + sigColWidth + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    sigY += 14
    doc.text(`Name: ${signatures.recipient?.signedBy || sigs.recipient[2][1] || '________________'}`, MARGIN + sigColWidth + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    sigY += 14
    doc.text(`Title: ${sigs.recipient[3][1] || '________________'}`, MARGIN + sigColWidth + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    sigY += 14
    if (signatures.recipient?.signedAt) {
      doc.fillColor('#10B981').font('Helvetica-Bold').fontSize(9)
      doc.text(`Signed: ${new Date(signatures.recipient.signedAt).toLocaleString()}`, MARGIN + sigColWidth + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    } else {
      doc.text(`Date: ${sigs.recipient[4][1] || '________________'}`, MARGIN + sigColWidth + 20, sigY, { width: sigColWidth - 40, lineBreak: false })
    }

    // Bottom border
    doc.y = sigStartY + sigBoxHeight
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(ORCHID).lineWidth(1.5).stroke()
    doc.y += 10

    // Annex 1
    doc.addPage()
    drawSectionHeading('ANNEX 1: LIST OF TECH PLATFORMS, PROVIDERS, SOFTWARE & PARTNER BRANDS')
    drawBody('(This list forms an integral part of the Agreement. It covers all tech platforms, AI providers, software, and partners introduced by or integrated into Sinba Group Israel LTD\'s omni-channel platform solution).')
    cover.annexItems.forEach((item, i) => {
      drawBody(`${i + 1}. ${item}`)
    })

    // ---- Headers + footers on every page (bufferPages) ----
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      const savedBottomMargin = doc.page.margins.bottom
      doc.page.margins.bottom = 0

      // Footer
      const footerY = PAGE_HEIGHT - 30
      doc.fontSize(8).fillColor(GREY).font('Helvetica')
      doc.text(
        `Page ${i + 1} of ${pageCount}  •  MassaPro NDA Builder`,
        MARGIN, footerY,
        { width: CONTENT_WIDTH, align: 'center', lineBreak: false }
      )

      // Header on pages 2+ (skip cover page 0 and TOC page 1)
      if (i > 1) {
        const headerY = 24
        try {
          const headerGradient = doc.linearGradient(MARGIN, 18, MARGIN, 54)
          headerGradient.stop(0, DARK_NEAR_BLACK).stop(1, DARK_INDIGO)
          doc.rect(MARGIN, 18, CONTENT_WIDTH, 36).fill(headerGradient)
        } catch {
          doc.rect(MARGIN, 18, CONTENT_WIDTH, 36).fill(DARK_INDIGO)
        }
        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
        doc.text('MassaPro', MARGIN + 6, headerY + 8, { width: 100, lineBreak: false })
        doc.fillColor(LAVENDER).font('Helvetica').fontSize(8)
        doc.text('Mutual NDA', MARGIN + 110, headerY + 8, { width: 200, align: 'center', lineBreak: false })
        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(8)
        doc.text(`Recipient: ${cover.recipientName || '—'}`, PAGE_WIDTH - MARGIN - 200, headerY + 8, { width: 200, align: 'right', lineBreak: false, ellipsis: true })
        doc.moveTo(MARGIN, 54).lineTo(PAGE_WIDTH - MARGIN, 54).strokeColor(ORCHID).lineWidth(0.5).stroke()
      }

      doc.page.margins.bottom = savedBottomMargin
    }

    // ---- Add clickable TOC link annotations ----
    // All TOC entries link to page 2 (the body start) for now.
    doc.switchToPage(tocPageIdx)
    for (const link of tocLinks) {
      doc.link(MARGIN, link.entryY, CONTENT_WIDTH, link.entryHeight, 2)
    }

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Mutual-NDA-${(cover.recipientName || 'Recipient').replace(/[^A-Za-z0-9_-]+/g, '_')}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (e: any) {
    console.error('[api/nda-snapshots/[id]/pdf GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
