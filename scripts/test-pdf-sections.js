// Smoke test for the new Attachments + External Links sections in
// src/app/api/scenarios/[id]/pdf/route.ts — replicates the exact drawing
// logic with mock data (incl. Hebrew names, .md files) to catch runtime
// errors before deploying.
const path = require('path')
const fs = require('fs')
const PDFDocument = require('pdfkit')

const fontsDir = path.join(process.cwd(), 'src', 'fonts')

// --- constants from the route ---
const purple = '#7C3AED'
const darkGray = '#1F2937'
const bodyGray = '#374151'
const lightGray = '#9CA3AF'
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN
const MAX_CONTENT_Y = 750

function containsRTL(text) {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(text)
}

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 60, left: 50, right: 50 },
  bufferPages: true,
  autoFirstPage: true,
})

doc.registerFont('DejaVuSans', path.join(fontsDir, 'DejaVuSans.ttf'))
doc.registerFont('DejaVuSans-Bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'))

// --- drawRTLText copied from the route ---
const drawRTLText = (text, font, fontSize, color, maxWidth, lineGap = 3) => {
  const paragraphs = text.split('\n')
  const rightEdge = PAGE_WIDTH - MARGIN
  const spaceWidth = doc.font(font).fontSize(fontSize).widthOfString(' ')

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      doc.moveDown(0.4)
      continue
    }
    const words = paragraph.trim().split(/\s+/)
    const lines = []
    let currentLine = []
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
        doc.text(line[i], x, lineY, { width: wordWidths[i] + 1, lineBreak: false, align: 'left' })
        x -= spaceWidth
      }
      doc.x = MARGIN
      doc.y = lineY + fontSize + lineGap
    }
  }
}

// --- mock data: CPA Setting-like scenario ---
const attachments = [
  { fileName: 'cpa-workflow.md', fileSize: 4300, category: 'attachment' },
  { fileName: 'tax-rules-2026.md', fileSize: 125000, category: 'knowledge_base' },
  { fileName: 'onboarding-guide.pdf', fileSize: 2600000, category: 'attachment' },
  { fileName: 'תדריך-לקוחות.md', fileSize: 8000, category: 'attachment' }, // Hebrew filename
  { fileName: 'intro-call.mp3', fileSize: 3800000, category: 'attachment' },
]

const links = [
  { name: 'IRS Official Site', url: 'https://www.irs.gov', description: 'Federal tax regulations and forms' },
  { name: 'Client Portal', url: 'portal.example.com', description: '' }, // no scheme, no description
  { name: 'מדריך שנה חדשה', url: 'https://masshehu.co.il/tax-guide', description: 'מדריך מס שנתי ללקוחות עסקיים עם הסברים מפורטים על דיווח והגשת טפסים' }, // Hebrew name + long Hebrew description
]

// ===== SECTION 12: Attachments (copied logic) =====
if (attachments.length > 0) {
  if (doc.y > 680) doc.addPage()
  doc.x = MARGIN
  doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray)
  doc.text('12. Attachments', MARGIN, doc.y, { continued: false, align: 'left', width: CONTENT_WIDTH })
  doc.moveDown(0.3)

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  attachments.forEach(att => {
    if (doc.y > MAX_CONTENT_Y) doc.addPage()
    const metaParts = []
    const sizeStr = formatFileSize(att.fileSize)
    if (sizeStr) metaParts.push(sizeStr)
    if (att.category === 'knowledge_base') metaParts.push('Knowledge Base')
    const meta = metaParts.length > 0 ? ` (${metaParts.join(', ')})` : ''

    const attIsRTL = containsRTL(att.fileName || '')
    if (attIsRTL) {
      drawRTLText(`\u2022 ${att.fileName}`, 'DejaVuSans', 10, bodyGray, CONTENT_WIDTH, 3)
      if (meta) {
        if (doc.y > MAX_CONTENT_Y) doc.addPage()
        doc.x = MARGIN
        doc.font('Helvetica').fontSize(9).fillColor(lightGray)
        doc.text(`    ${metaParts.join(' \u00b7 ')}`, MARGIN, doc.y, { align: 'left', width: CONTENT_WIDTH })
      }
    } else {
      doc.x = MARGIN
      doc.font('Helvetica').fontSize(10).fillColor(bodyGray)
      doc.text(`\u2022 ${att.fileName}${meta}`, MARGIN, doc.y, { align: 'left', width: CONTENT_WIDTH })
    }
    doc.x = MARGIN
  })
  doc.moveDown(0.8)
}

// ===== SECTION 13: External Links (copied logic) =====
if (links.length > 0) {
  if (doc.y > 680) doc.addPage()
  doc.x = MARGIN
  doc.font('Helvetica-Bold').fontSize(12).fillColor(darkGray)
  doc.text('13. External Links', MARGIN, doc.y, { continued: false, align: 'left', width: CONTENT_WIDTH })
  doc.moveDown(0.3)

  links.forEach(link => {
    if (doc.y > MAX_CONTENT_Y) doc.addPage()
    const nameIsRTL = containsRTL(link.name || '')
    if (nameIsRTL) {
      drawRTLText(`\u2022 ${link.name}`, 'DejaVuSans-Bold', 10, darkGray, CONTENT_WIDTH, 3)
    } else {
      doc.x = MARGIN
      doc.font('Helvetica-Bold').fontSize(10).fillColor(darkGray)
      doc.text(`\u2022 ${link.name}`, MARGIN, doc.y, { align: 'left', width: CONTENT_WIDTH })
    }

    if (doc.y > MAX_CONTENT_Y) doc.addPage()
    const linkUrl = /^https?:\/\//i.test(link.url || '') ? link.url : `https://${link.url}`
    doc.x = MARGIN
    doc.font('Helvetica').fontSize(9).fillColor(purple)
    doc.text(`    ${link.url}`, MARGIN, doc.y, { align: 'left', width: CONTENT_WIDTH, link: linkUrl })

    if (link.description && String(link.description).trim() !== '') {
      if (doc.y > MAX_CONTENT_Y) doc.addPage()
      const descIsRTL = containsRTL(link.description)
      if (descIsRTL) {
        drawRTLText(link.description, 'DejaVuSans', 9, bodyGray, CONTENT_WIDTH, 3)
      } else {
        doc.x = MARGIN
        doc.font('Helvetica').fontSize(9).fillColor(bodyGray)
        doc.text(`    ${link.description}`, MARGIN, doc.y, { align: 'left', width: CONTENT_WIDTH })
      }
    }
    doc.moveDown(0.4)
    doc.x = MARGIN
  })
  doc.moveDown(0.4)
}

// Final separator
if (doc.y > 740) doc.addPage()
doc.moveTo(MARGIN, doc.y + 10).lineTo(PAGE_WIDTH - MARGIN, doc.y + 10).strokeColor(lightGray).lineWidth(0.5).stroke()

const outPath = path.join(process.cwd(), 'scripts', 'test-pdf-sections-output.pdf')
doc.pipe(fs.createWriteStream(outPath))
doc.end()
console.log('PDF written to', outPath)
