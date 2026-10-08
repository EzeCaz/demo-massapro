import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import {
  SERVICES,
  CATEGORY_LABELS,
  brandClean,
  STATUS_LABELS,
  INFRA_REQUIREMENTS,
  SUPPORT_SECTIONS,
  WELCOME_PARAGRAPHS,
  DEFAULT_MILESTONES,
  type Service,
  type ServiceTask,
  type MilestoneRow,
} from '@/lib/sow-data'
import type { CustomService } from '@/lib/sow-export'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// =========================================================================
// GET /api/sow-snapshots/[id]/pdf
//
// Renders a SOW snapshot as a branded PDF using PDFKit. The PDF closely
// mirrors the redesigned Word export — gradient cover banner, Orchid
// Purple section headings, colored tables with alternating row stripes,
// bullet motifs in Orchid Purple, and a branded header/footer on every
// page.
//
// Auth: the snapshot owner or admin/super_admin.
// =========================================================================

// MassaPro brand book colors
const ORCHID = '#9333EA'
const ORCHID_DEEP = '#6B21A8'
const ORCHID_MID = '#7E22CE'
const LAVENDER = '#F3E8FF'
const LAVENDER_LIGHT = '#FAF5FF'
const JET = '#030712'
const WHITE = '#FFFFFF'
const GREY = '#666666'

const PAGE_WIDTH = 595.28 // A4 portrait in points (72dpi)
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

// Detect RTL text (Hebrew/Arabic) — falls back to per-word right-aligned
// rendering (same approach as the integration-setups PDF route).
function containsRTL(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(text)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    const { id } = await params

    const snapshot = await db.sOWSnapshot.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true, email: true } } },
    })
    if (!snapshot) return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })

    const isOwner = snapshot.ownerId === user.id
    const isAdmin = isAdminRole(user.role)
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const payload = snapshot.payload as any
    const cover = payload.cover || {
      clientName: '',
      projectName: snapshot.name,
      date: '',
      version: 'v1.0',
      preparedBy: '',
      overview: '',
    }
    const selectedServiceIds: string[] = payload.selectedServiceIds || []
    const customServices: CustomService[] = payload.customServices || []
    const taskState: any = payload.taskState || {}
    const specValues: Record<string, string> = payload.specValues || {}
    const customTasksByBuiltin: Record<string, ServiceTask[]> = payload.customTasksByBuiltinService || {}
    const milestones: MilestoneRow[] = payload.milestones && payload.milestones.length > 0 ? payload.milestones : DEFAULT_MILESTONES

    // Resolve services: builtin + custom, with custom tasks merged in
    const builtinSelected: Service[] = SERVICES.filter((s) => selectedServiceIds.includes(s.id)).map((s) => ({
      ...s,
      tasks: [...s.tasks, ...(customTasksByBuiltin[s.id] ?? [])],
    })) as Service[]
    const allServices: (Service | CustomService)[] = [...builtinSelected, ...customServices]

    // ---- Build the PDF ---------------------------------------------------
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: MARGIN, right: MARGIN },
      info: {
        Title: `SOW — ${snapshot.name}`,
        Author: 'MassaPro SOW Builder',
        Subject: 'Statement of Work',
      },
    })

    // Buffer pages so we can add page numbers in the footer of every page
    const buffers: Buffer[] = []
    doc.on('data', (b: Buffer) => buffers.push(b))

    // ---- Helpers ---------------------------------------------------------
    const ensureXMargin = () => { doc.x = MARGIN }

    const drawGradientBanner = (height: number) => {
      // Real linear gradient — Orchid Purple → Soft Lavender (top to bottom)
      const gradient = doc.linearGradient(MARGIN, doc.y, MARGIN, doc.y + height)
      gradient.stop(0, ORCHID_DEEP).stop(0.5, ORCHID).stop(1, LAVENDER)
      doc.rect(MARGIN, doc.y, CONTENT_WIDTH, height).fill(gradient)
      doc.y += height
    }

    const drawSectionHeading = (text: string) => {
      doc.moveDown(20)
      ensureXMargin()
      const y = doc.y
      doc.fontSize(16).fillColor(ORCHID).font('Helvetica-Bold')
      doc.text(brandClean(text), MARGIN, y, { width: CONTENT_WIDTH })
      doc.y += 8
      // Purple underline
      doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y).strokeColor(ORCHID).lineWidth(1.5).stroke()
      doc.y += 14
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    const drawSubHeading = (text: string) => {
      doc.moveDown(8)
      ensureXMargin()
      doc.fontSize(13).fillColor(JET).font('Helvetica-Bold')
      doc.text(brandClean(text), MARGIN, doc.y, { width: CONTENT_WIDTH })
      doc.y += 4
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    const drawBody = (text: string, opts: { indent?: number; italic?: boolean; color?: string; size?: number } = {}) => {
      ensureXMargin()
      doc.fontSize(opts.size || 11).fillColor(opts.color || JET).font(opts.italic ? 'Helvetica-Oblique' : 'Helvetica')
      doc.text(brandClean(text), MARGIN + (opts.indent || 0), doc.y, {
        width: CONTENT_WIDTH - (opts.indent || 0),
        align: 'left',
        lineGap: 4,
      })
      doc.y += 6
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    const drawBullet = (text: string, level: number = 0) => {
      const indent = 20 + level * 20
      const bullet = level === 0 ? '●' : '○'
      doc.fontSize(11).fillColor(ORCHID).font('Helvetica-Bold')
      doc.text(bullet, MARGIN + indent, doc.y, { width: 14, continued: true })
      doc.fillColor(JET).font('Helvetica')
      doc.text('  ' + brandClean(text), { width: CONTENT_WIDTH - indent - 14, align: 'left', lineGap: 3 })
      doc.y += 4
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    const drawColoredTable = (
      headers: string[],
      rows: string[][],
      columnWidths?: number[] // percentages 0-100
    ) => {
      const colCount = headers.length
      const widths = columnWidths
        ? columnWidths.map((p) => (CONTENT_WIDTH * p) / 100)
        : new Array(colCount).fill(CONTENT_WIDTH / colCount)

      const rowHeight = 22
      const startY = doc.y

      // Outer purple border (drawn first as background, then we draw cells on top)
      doc.rect(MARGIN, startY, CONTENT_WIDTH, rowHeight + rows.length * rowHeight)
         .lineWidth(1.5).strokeColor(ORCHID).stroke()

      // Header row — Orchid Purple fill, white bold text
      let x = MARGIN
      doc.rect(MARGIN, startY, CONTENT_WIDTH, rowHeight).fill(ORCHID)
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
      headers.forEach((h, i) => {
        doc.text(h, x + 6, startY + 6, { width: widths[i] - 12, align: 'left' })
        x += widths[i]
      })

      // Body rows — alternating white / Soft Lavender
      rows.forEach((row, ri) => {
        const y = startY + rowHeight + ri * rowHeight
        if (ri % 2 === 1) {
          doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(LAVENDER)
        }
        // Inner lavender vertical dividers
        x = MARGIN
        doc.strokeColor(LAVENDER).lineWidth(0.5)
        for (let i = 1; i < colCount; i++) {
          x += widths[i - 1]
          doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke()
        }
        // Inner lavender horizontal divider
        doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).stroke()

        // Cell text
        x = MARGIN
        doc.fillColor(JET).font('Helvetica').fontSize(9)
        row.forEach((cell, i) => {
          doc.text(brandClean(cell), x + 6, y + 5, { width: widths[i] - 12, align: 'left', ellipsis: true })
          x += widths[i]
        })
      })

      doc.y = startY + rowHeight + rows.length * rowHeight + 6
      doc.fillColor(JET).font('Helvetica').fontSize(11)
    }

    // ---- Cover Page ------------------------------------------------------
    // Top spacer
    doc.y = 60
    drawGradientBanner(220)

    // Logo (centered) — best-effort
    const logoPath = path.join(process.cwd(), 'public', 'massapro-logo.png')
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, (PAGE_WIDTH - 100) / 2, 90, { width: 100, height: 100 })
      } catch {}
    }

    // "MassaPro" + "Statement of Work" centered in the banner area
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(32)
    doc.text('MassaPro', MARGIN, 130, { width: CONTENT_WIDTH, align: 'center' })
    doc.fontSize(20).fillColor(WHITE)
    doc.text('Statement of Work', MARGIN, 175, { width: CONTENT_WIDTH, align: 'center' })

    // Below the gradient banner — project subtitle
    doc.moveDown(20)
    doc.fillColor(JET).font('Helvetica-Oblique').fontSize(12)
    doc.text(brandClean('Implementation of your MassaPro platform'), MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
    doc.moveDown(20)

    // Cover info table — Soft Lavender label column, white value column,
    // purple outer border, lavender inner dividers.
    const coverRows: [string, string][] = [
      ['Client', cover.clientName || '<client name>'],
      ['Client Demo', cover.clientDemo || '<demo>'],
      ['Project', cover.projectName || '<project>'],
      ['Date', cover.date || '—'],
      ['Version', cover.version || 'v1.0'],
      ['Prepared By', cover.preparedBy || 'MassaPro Solutions Architect'],
    ]
    drawColoredTable(
      ['Field', 'Value'],
      coverRows.map(([l, v]) => [l, v]),
      [35, 65]
    )

    doc.addPage()

    // ---- Welcome page ----------------------------------------------------
    doc.y = 80
    doc.fillColor(ORCHID).font('Helvetica-Bold').fontSize(28)
    doc.text('Welcome to MassaPro', MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
    doc.moveDown(6)
    doc.fillColor(JET).font('Helvetica-Bold').fontSize(16)
    doc.text(WELCOME_PARAGRAPHS.subtitle, MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
    doc.moveDown(20)
    drawBody(WELCOME_PARAGRAPHS.intro)
    drawBody(WELCOME_PARAGRAPHS.body)
    WELCOME_PARAGRAPHS.benefits.forEach((b) => drawBullet(b, 0))
    drawBody(WELCOME_PARAGRAPHS.closing, { italic: true })
    drawBody(WELCOME_PARAGRAPHS.retention, { italic: true })

    doc.addPage()

    // ---- Project Overview + Deliverables ---------------------------------
    drawSectionHeading('Statement of Work')
    drawSubHeading('Project Overview')
    drawBody(
      brandClean(
        cover.overview ||
          `This Statement of Work ("SOW") describes the services that MassaPro will deliver to ${cover.clientName || '<client name>'} for the ${cover.projectName || 'Implementation of your MassaPro platform'} initiative.`
      )
    )
    drawSubHeading('Deliverables')
    drawBody(brandClean(`MassaPro will implement the following project deliverables with ${cover.clientName || '<client name>'}:`))
    drawSubHeading('Phase 1')
    if (allServices.length === 0) {
      drawBody('No services selected.', { italic: true })
    } else {
      allServices.forEach((svc) => drawBullet(`Setup and configuration of ${svc.name}`, 0))
      drawBullet('Remote training with Technical Services Engineer', 0)
      drawBullet('Further dedicated Technical Services Engineer support for full Go-Live', 0)
    }

    // ---- Scope (per-service) ---------------------------------------------
    for (const svc of allServices) {
      doc.addPage()
      drawSectionHeading('Scope')
      drawSubHeading('Phase 1')
      doc.fontSize(16).fillColor(ORCHID).font('Helvetica-Bold')
      doc.text(brandClean(svc.name), MARGIN, doc.y, { width: CONTENT_WIDTH })
      doc.y += 6
      doc.fillColor(JET).font('Helvetica').fontSize(11)
      drawBody(brandClean((svc as Service).intro || svc.description))

      drawSubHeading('Configuration')
      if (svc.tasks.length === 0) {
        drawBody('No configuration items defined.', { italic: true })
      } else {
        svc.tasks.forEach((task) => {
          drawBullet(brandClean(task.title), 0)
          if (task.description) drawBody(brandClean(task.description), { indent: 20, size: 10 })
          if (task.subTasks && task.subTasks.length) {
            task.subTasks.forEach((sub) => {
              drawBullet(brandClean(sub.title), 1)
              if (sub.description) drawBody(brandClean(sub.description), { indent: 40, size: 10, color: GREY })
            })
          }
        })
      }

      drawSubHeading('Requirements')
      if (svc.techSpecs.length === 0) {
        drawBody('No requirements defined.', { italic: true })
      } else {
        svc.techSpecs.forEach((row) => {
          const value = specValues[row.id]
          const text = value
            ? `${row.field}: ${brandClean(row.description)} (Provided: ${brandClean(value)})`
            : `${row.field}: ${brandClean(row.description)}`
          drawBullet(text, 0)
        })
      }
    }

    // ---- Configuration Tracker --------------------------------------------
    doc.addPage()
    drawSectionHeading('Statement of Work')
    drawSubHeading('Configuration Tracker')
    drawBody(
      'The following tracker shows the live status of every configuration item across all selected services.',
      { italic: true }
    )
    const trackerRows: string[][] = []
    let taskCounter = 0
    allServices.forEach((svc) => {
      svc.tasks.forEach((task) => {
        taskCounter += 1
        const state = taskState[task.id] || {}
        const status = state.status ? STATUS_LABELS[state.status as keyof typeof STATUS_LABELS] : STATUS_LABELS.pending
        trackerRows.push([
          String(taskCounter),
          brandClean(task.title),
          brandClean(svc.name),
          status,
          state.owner || '',
          state.dueDate || '',
          state.notes || '',
        ])
      })
    })
    drawColoredTable(
      ['#', 'Configuration Item', 'Service', 'Status', 'Owner', 'Due', 'Notes'],
      trackerRows,
      [5, 22, 14, 12, 12, 12, 23]
    )

    // ---- Infrastructure & Access Requirements ----------------------------
    doc.addPage()
    drawSectionHeading('Statement of Work')
    drawSubHeading('Requirements')
    drawSubHeading('Infrastructure & Access Requirements')
    INFRA_REQUIREMENTS.preDeployment.forEach((b) => drawBullet(brandClean(b), 0))
    drawSubHeading('Hardware')
    INFRA_REQUIREMENTS.hardware.forEach((b) => drawBullet(brandClean(b), 0))
    drawSubHeading('Internet')
    INFRA_REQUIREMENTS.internet.forEach((b) => drawBullet(brandClean(b), 0))

    // ---- Support ---------------------------------------------------------
    doc.addPage()
    drawSectionHeading('Statement of Work')
    drawSubHeading('Support')
    drawSubHeading(SUPPORT_SECTIONS.intro)
    SUPPORT_SECTIONS.supportService.forEach((b) => drawBody(brandClean(b)))
    drawSubHeading('Support Portal')
    SUPPORT_SECTIONS.supportPortal.forEach((b) => drawBody(brandClean(b)))
    drawSubHeading('Support Ticket Submissions')
    SUPPORT_SECTIONS.ticketSubmission.forEach((b) => drawBody(brandClean(b)))
    SUPPORT_SECTIONS.ticketTemplate.forEach((line) => drawBody(line, { indent: 20, size: 10 }))

    // ---- Project Milestones ----------------------------------------------
    doc.addPage()
    drawSectionHeading('Project Milestones')
    drawSubHeading('Phase 1')
    drawColoredTable(
      ['Task', 'Target Date', 'Status'],
      milestones.map((m) => [brandClean(m.task), m.targetDate, m.status]),
      [55, 25, 20]
    )
    drawBody('Project progress will be tracked in the shared Project Tracker document.', { italic: true })

    // ---- Signatures ------------------------------------------------------
    doc.addPage()
    drawSectionHeading('Signatures')
    drawBody(
      'By signing below, the authorized representatives of each party accept the scope, deliverables, configuration items, requirements and milestones defined in this Statement of Work.'
    )
    drawColoredTable(
      ['Role', 'Name', 'Signature', 'Date'],
      [
        ['MassaPro Authorized Signatory', '', '', ''],
        [`${cover.clientName || 'Client'} Authorized Signatory`, '', '', ''],
      ],
      [35, 25, 25, 15]
    )

    // ---- Headers + footers on every page (bufferPages) -------------------
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      // Footer — Page X of Y · MassaPro
      const footerY = PAGE_HEIGHT - 30
      doc.fontSize(8).fillColor(GREY).font('Helvetica')
      doc.text(
        `Page ${i + 1} of ${pageCount}  •  MassaPro SOW Builder`,
        MARGIN,
        footerY,
        { width: CONTENT_WIDTH, align: 'center' }
      )
      // Header — MassaPro (left) | SOW — project name (center) | Client Demo (right)
      // Skip on the cover page (page 0) — the cover already has the gradient banner.
      if (i > 0) {
        const headerY = 30
        // Left — MassaPro
        doc.fontSize(8).fillColor(ORCHID).font('Helvetica-Bold')
        doc.text('MassaPro', MARGIN, headerY, { width: 100, align: 'left' })
        // Center — SOW — project name
        doc.fillColor(GREY).font('Helvetica')
        doc.text(
          'SOW — ' + (cover.projectName || 'Implementation of your MassaPro platform'),
          MARGIN + 110,
          headerY,
          { width: CONTENT_WIDTH - 220, align: 'center' }
        )
        // Right — Client Demo (bold Orchid)
        doc.fillColor(ORCHID).font('Helvetica-Bold')
        doc.text(
          'Client Demo: ' + (cover.clientDemo || '—'),
          PAGE_WIDTH - MARGIN - 200,
          headerY,
          { width: 200, align: 'right' }
        )
        // Subtle divider line under the header
        doc.moveTo(MARGIN, headerY + 12).lineTo(PAGE_WIDTH - MARGIN, headerY + 12)
           .strokeColor(LAVENDER).lineWidth(0.5).stroke()
      }
    }

    doc.end()

    // Wait for the buffer to flush
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)))
    })

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SOW-${(snapshot.name || 'MassaPro').replace(/[^A-Za-z0-9_-]+/g, '_')}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (e: any) {
    console.error('[api/sow-snapshots/[id]/pdf GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
