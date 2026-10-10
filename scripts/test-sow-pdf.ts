// Quick local test for the SOW PDF route — verifies that the TOC link
// annotations don't crash PDFKit.
// Run: npx tsx scripts/test-sow-pdf.ts

import PDFDocument from 'pdfkit'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN

async function testPdf() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 60, bottom: 60, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: { Title: 'Test', Author: 'Test' },
  })

  const buffers: Buffer[] = []
  doc.on('data', (b: Buffer) => buffers.push(b))

  // Page 0 — cover
  doc.fontSize(20).text('Cover', MARGIN, 80, { width: CONTENT_WIDTH, align: 'center' })
  doc.addPage()

  // Page 1 — TOC (empty for now, we'll fill it later)
  const tocPageIdx = 1
  doc.addPage()

  // Page 2 — section 1
  const section1PageIdx = 2
  doc.fontSize(16).fillColor('#9333EA').font('Helvetica-Bold').text('Section 1', MARGIN, 80, { width: CONTENT_WIDTH })
  const section1Y = doc.y
  doc.addPage()

  // Page 3 — section 2
  const section2PageIdx = 3
  doc.fontSize(16).fillColor('#9333EA').font('Helvetica-Bold').text('Section 2', MARGIN, 80, { width: CONTENT_WIDTH })
  const section2Y = doc.y

  // Now switch to TOC page and add links
  const sectionDests = [
    { name: 'Section 1', pageIdx: section1PageIdx, y: section1Y },
    { name: 'Section 2', pageIdx: section2PageIdx, y: section2Y },
  ]

  doc.switchToPage(tocPageIdx)
  doc.y = 80
  doc.fontSize(20).fillColor('#9333EA').font('Helvetica-Bold').text('Table of Contents', MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
  doc.y += 20

  const tocEntries: { dest: typeof sectionDests[0]; entryY: number }[] = []
  for (const dest of sectionDests) {
    const entryY = doc.y
    doc.fontSize(11).fillColor('#030712').font('Helvetica')
    doc.text(dest.name, MARGIN, entryY, { width: 350, align: 'left', lineBreak: false })
    doc.text(String(dest.pageIdx + 1), PAGE_WIDTH - MARGIN - 50, entryY, { width: 50, align: 'right', lineBreak: false })
    tocEntries.push({ dest, entryY })
    doc.y = entryY + 20
  }

  // Collect dest page refs
  const destPageRefs = new Map<number, any>()
  for (const entry of tocEntries) {
    if (!destPageRefs.has(entry.dest.pageIdx)) {
      doc.switchToPage(entry.dest.pageIdx)
      destPageRefs.set(entry.dest.pageIdx, doc.page.dictionary)
    }
  }

  // Add link annotations
  doc.switchToPage(tocPageIdx)
  for (const entry of tocEntries) {
    const destPageRef = destPageRefs.get(entry.dest.pageIdx)
    if (!destPageRef) continue

    const actionRef = doc.ref({
      Type: 'Action',
      S: 'GoTo',
      D: [destPageRef, 'XYZ', MARGIN, entry.dest.y, null],
    })
    actionRef.end()

    const linkRef = doc.ref({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [MARGIN, entry.entryY, PAGE_WIDTH - MARGIN, entry.entryY + 20],
      Border: [0, 0, 0],
      A: actionRef,
    })
    linkRef.end()

    doc.page.annotations.push(linkRef)
  }

  // Footer on every page
  const pageCount = doc.bufferedPageRange().count
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i)
    doc.page.margins.bottom = 0
    doc.fontSize(8).fillColor('#666666').font('Helvetica')
    doc.text(`Page ${i + 1} of ${pageCount}`, MARGIN, PAGE_HEIGHT - 30, { width: CONTENT_WIDTH, align: 'center', lineBreak: false })
  }

  doc.end()

  await new Promise<void>((resolve) => doc.on('end', () => resolve()))
  const buf = Buffer.concat(buffers)
  console.log(`PDF generated: ${buf.length} bytes, ${pageCount} pages`)
  console.log('SUCCESS — no crash')
}

testPdf().catch((e) => {
  console.error('FAILED:', e.message)
  console.error(e.stack)
  process.exit(1)
})
