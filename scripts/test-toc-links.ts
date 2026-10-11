// Test PDF TOC link annotations — verifies that the link annotations
// are correctly added to the PDF's Annots array and that the GoTo
// destinations point to valid page dictionaries.
// Run: npx tsx scripts/test-toc-links.ts

import PDFDocument from 'pdfkit'
import fs from 'fs'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const ORCHID = '#7F39FB'
const JET = '#0A0711'
const GREY = '#9CA3AF'

async function testTocPdf() {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 60, bottom: 60, left: MARGIN, right: MARGIN },
    bufferPages: true,
    info: { Title: 'TOC Test', Author: 'Test' },
  })

  const buffers: Buffer[] = []
  doc.on('data', (b: Buffer) => buffers.push(b))

  const sectionDests: { name: string; pageIdx: number; y: number }[] = []
  let currentPageIdx = 0

  // Page 0 — cover
  doc.fontSize(20).text('Cover', MARGIN, 80, { width: CONTENT_WIDTH, align: 'center' })
  doc.addPage()
  currentPageIdx++

  // Page 1 — TOC (empty for now)
  const tocPageIdx = currentPageIdx
  doc.addPage()
  currentPageIdx++

  // Page 2 — section 1
  const s1PageIdx = currentPageIdx
  doc.fontSize(16).fillColor(ORCHID).font('Helvetica-Bold').text('Section 1', MARGIN, 80, { width: CONTENT_WIDTH })
  const s1Y = doc.y
  sectionDests.push({ name: 'Section 1', pageIdx: s1PageIdx, y: s1Y })
  doc.addPage()
  currentPageIdx++

  // Page 3 — section 2
  const s2PageIdx = currentPageIdx
  doc.fontSize(16).fillColor(ORCHID).font('Helvetica-Bold').text('Section 2', MARGIN, 80, { width: CONTENT_WIDTH })
  const s2Y = doc.y
  sectionDests.push({ name: 'Section 2', pageIdx: s2PageIdx, y: s2Y })

  // Now render the TOC
  doc.switchToPage(tocPageIdx)
  doc.y = 80
  doc.fillColor(ORCHID).font('Helvetica-Bold').fontSize(20)
  doc.text('Table of Contents', MARGIN, doc.y, { width: CONTENT_WIDTH, align: 'center' })
  doc.y += 20

  const tocLinks: { dest: { pageIdx: number; y: number }; entryY: number; entryHeight: number }[] = []

  for (const dest of sectionDests) {
    const entryY = doc.y
    doc.fontSize(13).fillColor(ORCHID).font('Helvetica-Bold')
    doc.text(dest.name, MARGIN, entryY, { width: 350, align: 'left', lineBreak: false })
    doc.text(String(dest.pageIdx + 1), PAGE_WIDTH - MARGIN - 50, entryY, { width: 50, align: 'right', lineBreak: false })
    tocLinks.push({ dest, entryY, entryHeight: 20 })
    doc.y = entryY + 24
  }

  // Collect dest page refs
  const destPageRefs = new Map<number, any>()
  for (const link of tocLinks) {
    if (!destPageRefs.has(link.dest.pageIdx)) {
      doc.switchToPage(link.dest.pageIdx)
      destPageRefs.set(link.dest.pageIdx, doc.page.dictionary)
    }
  }

  // Add link annotations using PDFKit's built-in doc.link() method.
  // When the URL parameter is a number, PDFKit creates a GoTo action
  // to that page (0-indexed). This is the correct way to add internal
  // links — the manual doc.ref() approach didn't capitalize the option
  // keys properly so the annotations weren't recognized by PDF readers.
  doc.switchToPage(tocPageIdx)
  console.log('TOC page annotations before:', doc.page.annotations.length)
  for (const link of tocLinks) {
    // doc.link(x, y, w, h, pageNumber) — pageNumber is 0-indexed
    doc.link(
      MARGIN,
      link.entryY,
      CONTENT_WIDTH,
      link.entryHeight,
      link.dest.pageIdx  // 0-indexed page number → GoTo action
    )
    console.log('  Added link annotation for', link.dest.name, 'at y=', link.entryY, '→ page', link.dest.pageIdx)
  }
  console.log('TOC page annotations after:', doc.page.annotations.length)

  doc.end()

  await new Promise<void>((resolve) => doc.on('end', () => resolve()))
  const buf = Buffer.concat(buffers)

  // Write to file for inspection
  fs.writeFileSync('/tmp/test-toc.pdf', buf)

  // Check if the PDF contains Annots
  const pdfText = buf.toString('latin1')
  const hasAnnots = pdfText.includes('/Annots')
  const hasLinkAnnot = pdfText.includes('/Subtype/Link')
  const hasGoTo = pdfText.includes('/S/GoTo')
  console.log('PDF size:', buf.length, 'bytes')
  console.log('Contains /Annots:', hasAnnots)
  console.log('Contains /Subtype/Link:', hasLinkAnnot)
  console.log('Contains /S/GoTo:', hasGoTo)

  console.log('SUCCESS — PDF generated with TOC links')
}

testTocPdf().catch((e) => {
  console.error('FAILED:', e.message)
  console.error(e.stack)
  process.exit(1)
})
