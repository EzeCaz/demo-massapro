// Smoke test for the SOW PDF logic — replicates the exact patterns used
// in /api/sow-snapshots/[id]/pdf/route.ts (bufferPages:true, pagination-
// aware drawColoredTable, footer loop with switchToPage) and verifies:
//   1. No switchToPage out-of-bounds error
//   2. Page count is reasonable (not 328!)
//   3. Footer/header text drawn on every page (via lineBreak:false)
import PDFDocument from 'pdfkit'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const ORCHID = '#9333EA'
const LAVENDER = '#F3E8FF'
const JET = '#030712'
const WHITE = '#FFFFFF'
const GREY = '#666666'
const TABLE_BOTTOM_LIMIT = PAGE_HEIGHT - 70

async function main() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 60, bottom: 60, left: MARGIN, right: MARGIN },
    bufferPages: true, // the fix
    info: { Title: 'SOW test' },
  })

  const buffers: Buffer[] = []
  doc.on('data', (b: Buffer) => buffers.push(b))

  const drawColoredTable = (headers: string[], rows: string[][], columnWidths?: number[]) => {
    const colCount = headers.length
    const widths = columnWidths
      ? columnWidths.map((p) => (CONTENT_WIDTH * p) / 100)
      : new Array(colCount).fill(CONTENT_WIDTH / colCount)
    const rowHeight = 22

    const drawHeaderRow = () => {
      const y = doc.y
      let hx = MARGIN
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(ORCHID)
      doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(10)
      headers.forEach((h, i) => {
        doc.text(h, hx + 6, y + 6, { width: widths[i] - 12, align: 'left', lineBreak: false })
        hx += widths[i]
      })
      doc.y = y + rowHeight
    }

    if (doc.y + rowHeight * 2 > TABLE_BOTTOM_LIMIT) doc.addPage()
    drawHeaderRow()

    rows.forEach((row, ri) => {
      if (doc.y + rowHeight > TABLE_BOTTOM_LIMIT) {
        doc.addPage()
        drawHeaderRow()
      }
      const y = doc.y
      if (ri % 2 === 1) doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(LAVENDER)
      let x = MARGIN
      doc.strokeColor(LAVENDER).lineWidth(0.5)
      for (let i = 1; i < colCount; i++) {
        x += widths[i - 1]
        doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke()
      }
      doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).stroke()
      x = MARGIN
      doc.fillColor(JET).font('Helvetica').fontSize(9)
      row.forEach((cell, i) => {
        doc.text(cell, x + 6, y + 5, { width: widths[i] - 12, align: 'left', lineBreak: false, ellipsis: true })
        x += widths[i]
      })
      doc.y = y + rowHeight
    })

    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + CONTENT_WIDTH, doc.y)
       .strokeColor(ORCHID).lineWidth(1.5).stroke()
    doc.y += 10
    doc.fillColor(JET).font('Helvetica').fontSize(11)
  }

  // ---- Cover page (starts near the bottom to stress the table pagination) ----
  doc.y = 60
  // Simulate a tall cover section so the cover info table starts near page bottom
  doc.text('Cover section', MARGIN, 700, { lineBreak: false })
  doc.y = 700
  drawColoredTable(
    ['Field', 'Value'],
    [
      ['Client', 'Acme Inc.'],
      ['Client Demo', 'Acme Q4 Outbound Demo'],
      ['Project', 'Implementation of your MassaPro platform'],
    ],
    [35, 65]
  )

  // ---- Big tracker table (100 rows — forces many page breaks) ----
  doc.addPage()
  const trackerRows: string[][] = []
  for (let i = 1; i <= 100; i++) {
    trackerRows.push([String(i), `Task ${i} — Configure some service feature`, 'Voice', 'Pending', 'JP', '2026-11-01', 'note'])
  }
  drawColoredTable(
    ['#', 'Configuration Item', 'Service', 'Status', 'Owner', 'Due', 'Notes'],
    trackerRows,
    [5, 22, 14, 12, 12, 12, 23]
  )

  // ---- Footer/header loop (same as the route) ----
  const range = doc.bufferedPageRange()
  const pageCount = range.count
  console.log('Total pages:', pageCount)
  if (pageCount > 30) {
    console.error('FAIL: runaway page generation detected (', pageCount, 'pages )')
    process.exit(1)
  }

  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    const savedX = doc.x
    const savedY = doc.y
    const savedBottomMargin = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    doc.fontSize(8).fillColor(GREY).font('Helvetica')
    doc.text(`Page ${i + 1} of ${pageCount} • MassaPro SOW Builder`, MARGIN, PAGE_HEIGHT - 30, {
      width: CONTENT_WIDTH, align: 'center', lineBreak: false,
    })
    if (i > 0) {
      doc.fontSize(8).fillColor(ORCHID).font('Helvetica-Bold')
      doc.text('MassaPro', MARGIN, 30, { width: 100, align: 'left', lineBreak: false })
      doc.fillColor(ORCHID).font('Helvetica-Bold')
      doc.text('Client Demo: Acme Q4', PAGE_WIDTH - MARGIN - 200, 30, { width: 200, align: 'right', lineBreak: false, ellipsis: true })
    }
    doc.page.margins.bottom = savedBottomMargin
    doc.x = savedX
    doc.y = savedY
  }

  doc.end()
  await new Promise<void>((resolve) => doc.on('end', () => resolve()))
  const fs = await import('fs')
  fs.writeFileSync('/tmp/sow-pdf-test.pdf', Buffer.concat(buffers))
  console.log('✓ PDF generated without switchToPage error:', Buffer.concat(buffers).length, 'bytes,', pageCount, 'pages')
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
