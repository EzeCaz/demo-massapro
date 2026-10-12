import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'
import {
  NDACoverInfo, NDA_SECTIONS, NDA_RECITALS,
  buildNdaIntro, buildNdaSignatures,
} from '@/lib/nda-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Clean NDA PDF — plain black text on white background, no branding,
// no colors, no gradient cover, no TOC, no header/footer logos.
// Matches the style of https://nondisclosureagreement.com's basic NDA.

const JET = '#000000'
const WHITE = '#FFFFFF'
const GREY = '#666666'

const PAGE_WIDTH = 595.28 // A4 portrait in points (72dpi)
const PAGE_HEIGHT = 841.89
const MARGIN = 72 // 1 inch margin (standard for legal docs)
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
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Mutual NDA — ${cover.recipientName || snapshot.name}`,
        Author: 'MassaPro NDA Builder',
        Subject: 'Mutual Non-Disclosure and Non-Circumvention Agreement',
      },
    })

    const buffers: Buffer[] = []
    doc.on('data', (b: Buffer) => buffers.push(b))

    // ---- Helpers (all black text on white, no colors) ----
    const drawBody = (text: string, opts: { indent?: number; italic?: boolean; bold?: boolean; size?: number } = {}) => {
      doc.fontSize(opts.size || 11).fillColor(JET).font(opts.bold ? 'Helvetica-Bold' : opts.italic ? 'Helvetica-Oblique' : 'Helvetica')
      doc.text(text, MARGIN + (opts.indent || 0), doc.y, {
        width: CONTENT_WIDTH - (opts.indent || 0),
        align: 'left',
        lineGap: 4,
      })
      doc.y += 4
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    const drawSectionHeading = (text: string) => {
      doc.fontSize(12).fillColor(JET).font('Helvetica-Bold')
      doc.text(text, MARGIN, doc.y, { width: CONTENT_WIDTH })
      doc.y += 4
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    // ---- Document starts directly with the NDA content (no cover, no TOC) ----
    // Title — centered, bold, black
    doc.fontSize(14).fillColor(JET).font('Helvetica-Bold')
    doc.text('MUTUAL NON-DISCLOSURE AND NON-CIRCUMVENTION AGREEMENT', MARGIN, MARGIN, {
      width: CONTENT_WIDTH, align: 'center',
    })
    doc.y += 16
    doc.fillColor(JET).font('Helvetica').fontSize(11)

    // Intro (parties) — plain black text
    const intro = buildNdaIntro(cover)
    intro.split('\n\n').forEach((para) => drawBody(para))

    // Recitals
    drawBody('')
    drawBody('RECITALS', { bold: true })
    NDA_RECITALS.forEach((recital) => drawBody(recital))
    drawBody('NOW, THEREFORE, in consideration of the mutual covenants, terms, and conditions set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:')

    // Sections — plain black text with bold numbered headings
    NDA_SECTIONS.forEach((sec) => {
      drawBody('')
      drawSectionHeading(`${sec.number}. ${sec.title}`)
      sec.paragraphs.forEach((para) => drawBody(para))
    })

    // Signature block
    doc.y += 20
    drawBody('IN WITNESS WHEREOF, the Parties hereto have executed this Mutual Non-Disclosure and Non-Circumvention Agreement as of the Effective Date set forth above.', { bold: true })
    doc.y += 10

    // Signature block — two columns, plain black text, no colored headers
    const signatures = (payload.signatures || {}) as {
      sinba?: { signedBy: string; signedAt: string; signedByEmail: string; image?: string }
      recipient?: { signedBy: string; signedAt: string; signedByEmail: string; image?: string }
    }
    const sigs = buildNdaSignatures(cover)

    const sigColWidth = CONTENT_WIDTH / 2
    const sigStartY = doc.y
    const sigImageHeight = 70

    // Sinba column header
    doc.fontSize(11).fillColor(JET).font('Helvetica-Bold')
    doc.text('SINBA GROUP ISRAEL LTD.', MARGIN, sigStartY, { width: sigColWidth, lineBreak: false })
    doc.text('RECIPIENT', MARGIN + sigColWidth, sigStartY, { width: sigColWidth, lineBreak: false })
    doc.y = sigStartY + 18
    doc.fillColor(JET).font('Helvetica').fontSize(11)

    let sigY = doc.y

    // ---- Sinba signature image ----
    if (signatures.sinba?.image) {
      try {
        const base64Data = signatures.sinba.image.split(',')[1] || signatures.sinba.image
        const imgBuffer = Buffer.from(base64Data, 'base64')
        doc.image(imgBuffer, MARGIN, sigY, {
          fit: [sigColWidth - 20, sigImageHeight],
          align: 'center',
          valign: 'center',
        })
      } catch (e: any) {
        console.error('[NDA PDF] Sinba signature image error:', e?.message)
      }
    }
    sigY += sigImageHeight

    // Sinba signature line + details
    doc.moveTo(MARGIN, sigY).lineTo(MARGIN + sigColWidth - 20, sigY).strokeColor(JET).lineWidth(0.5).stroke()
    doc.fontSize(10).fillColor(JET).font('Helvetica')
    doc.text('Signature:', MARGIN, sigY + 4, { width: sigColWidth - 20, lineBreak: false })
    sigY += 16
    doc.text(`By: ${signatures.sinba?.signedBy || sigs.sinba[1][1] || '________________'}`, MARGIN, sigY, { width: sigColWidth - 20, lineBreak: false })
    sigY += 14
    doc.text(`Name: ${signatures.sinba?.signedBy || sigs.sinba[2][1] || '________________'}`, MARGIN, sigY, { width: sigColWidth - 20, lineBreak: false })
    sigY += 14
    doc.text(`Title: ${sigs.sinba[3][1] || '________________'}`, MARGIN, sigY, { width: sigColWidth - 20, lineBreak: false })
    sigY += 14
    if (signatures.sinba?.signedAt) {
      doc.font('Helvetica-Bold')
      doc.text(`Date: ${new Date(signatures.sinba.signedAt).toLocaleDateString()}`, MARGIN, sigY, { width: sigColWidth - 20, lineBreak: false })
      doc.font('Helvetica')
    } else {
      doc.text(`Date: ${sigs.sinba[4][1] || '________________'}`, MARGIN, sigY, { width: sigColWidth - 20, lineBreak: false })
    }

    // ---- Recipient signature image ----
    sigY = doc.y + 2
    const recipientSigStartY = sigStartY + 18 + sigImageHeight + 16 + 14 + 14 + 14 + 14
    sigY = recipientSigStartY - sigImageHeight - 16 - 14 - 14 - 14
    // Reset to align with Sinba
    sigY = sigStartY + 18

    if (signatures.recipient?.image) {
      try {
        const base64Data = signatures.recipient.image.split(',')[1] || signatures.recipient.image
        const imgBuffer = Buffer.from(base64Data, 'base64')
        doc.image(imgBuffer, MARGIN + sigColWidth, sigY, {
          fit: [sigColWidth - 20, sigImageHeight],
          align: 'center',
          valign: 'center',
        })
      } catch (e: any) {
        console.error('[NDA PDF] Recipient signature image error:', e?.message)
      }
    }
    sigY += sigImageHeight

    // Recipient signature line + details
    doc.moveTo(MARGIN + sigColWidth, sigY).lineTo(MARGIN + CONTENT_WIDTH, sigY).strokeColor(JET).lineWidth(0.5).stroke()
    doc.fontSize(10).fillColor(JET).font('Helvetica')
    doc.text('Signature:', MARGIN + sigColWidth, sigY + 4, { width: sigColWidth - 20, lineBreak: false })
    sigY += 16
    doc.text(`By: ${signatures.recipient?.signedBy || sigs.recipient[1][1] || '________________'}`, MARGIN + sigColWidth, sigY, { width: sigColWidth - 20, lineBreak: false })
    sigY += 14
    doc.text(`Name: ${signatures.recipient?.signedBy || sigs.recipient[2][1] || '________________'}`, MARGIN + sigColWidth, sigY, { width: sigColWidth - 20, lineBreak: false })
    sigY += 14
    doc.text(`Title: ${sigs.recipient[3][1] || '________________'}`, MARGIN + sigColWidth, sigY, { width: sigColWidth - 20, lineBreak: false })
    sigY += 14
    if (signatures.recipient?.signedAt) {
      doc.font('Helvetica-Bold')
      doc.text(`Date: ${new Date(signatures.recipient.signedAt).toLocaleDateString()}`, MARGIN + sigColWidth, sigY, { width: sigColWidth - 20, lineBreak: false })
      doc.font('Helvetica')
    } else {
      doc.text(`Date: ${sigs.recipient[4][1] || '________________'}`, MARGIN + sigColWidth, sigY, { width: sigColWidth - 20, lineBreak: false })
    }

    doc.y = Math.max(doc.y, sigY + 14) + 20

    // Annex 1
    doc.addPage()
    drawSectionHeading('ANNEX 1: LIST OF TECH PLATFORMS, PROVIDERS, SOFTWARE & PARTNER BRANDS')
    drawBody('(This list forms an integral part of the Agreement. It covers all tech platforms, AI providers, software, and partners introduced by or integrated into Sinba Group Israel LTD\'s omni-channel platform solution).')
    cover.annexItems.forEach((item, i) => {
      drawBody(`${i + 1}. ${item}`)
    })

    // ---- Simple footer with page numbers (black text, no branding) ----
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      doc.page.margins.bottom = 0
      doc.fontSize(9).fillColor(GREY).font('Helvetica')
      doc.text(
        `Page ${i + 1} of ${pageCount}`,
        MARGIN, PAGE_HEIGHT - 30,
        { width: CONTENT_WIDTH, align: 'center', lineBreak: false }
      )
      doc.page.margins.bottom = MARGIN
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
