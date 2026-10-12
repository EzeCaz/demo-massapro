// Word (.docx) export for the MassaPro Mutual NDA.
//
// Clean format: plain black text on white background, no branding,
// no colors, no gradient cover, no TOC. Matches the style of
// https://nondisclosureagreement.com's basic NDA.

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow,
  TableCell, WidthType, BorderStyle, PageOrientation,
  Footer, PageNumber, PageBreak, LineRuleType,
} from 'docx'
import { saveAs } from 'file-saver'
import {
  NDACoverInfo, NDA_SECTIONS, NDA_RECITALS,
  buildNdaIntro, buildNdaSignatures,
} from '@/lib/nda-data'

const JET = '000000'

export interface NDAExportPayload {
  cover: NDACoverInfo
}

function bodyParagraph(text: string, opts: { indent?: number; italic?: boolean; bold?: boolean; after?: number } = {}) {
  return new Paragraph({
    spacing: { before: 0, after: opts.after ?? 160, line: 320, lineRule: LineRuleType.AUTO },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({
        text, size: 22, color: JET, bold: opts.bold, italics: opts.italic, font: 'Calibri',
      }),
    ],
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: JET, font: 'Calibri' }),
    ],
  })
}

export async function buildNdaDoc(payload: NDAExportPayload): Promise<Blob> {
  const { cover } = payload

  // ---- Body content (starts directly with the NDA — no cover, no TOC) ----
  const bodyChildren: (Paragraph | Table)[] = []

  // Title — centered, bold, black
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({ text: 'MUTUAL NON-DISCLOSURE AND NON-CIRCUMVENTION AGREEMENT', bold: true, size: 28, color: JET, font: 'Calibri' }),
      ],
    }),
  )

  // Intro (parties)
  const intro = buildNdaIntro(cover)
  intro.split('\n\n').forEach((para) => bodyChildren.push(bodyParagraph(para)))

  // Recitals
  bodyChildren.push(bodyParagraph(''))
  bodyChildren.push(bodyParagraph('RECITALS', { bold: true }))
  NDA_RECITALS.forEach((recital) => bodyChildren.push(bodyParagraph(recital)))
  bodyChildren.push(bodyParagraph('NOW, THEREFORE, in consideration of the mutual covenants, terms, and conditions set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:'))

  // Sections
  NDA_SECTIONS.forEach((sec) => {
    bodyChildren.push(bodyParagraph(''))
    bodyChildren.push(sectionHeading(`${sec.number}. ${sec.title}`))
    sec.paragraphs.forEach((para) => bodyChildren.push(bodyParagraph(para)))
  })

  // Signature block
  bodyChildren.push(bodyParagraph(''))
  bodyChildren.push(bodyParagraph('IN WITNESS WHEREOF, the Parties hereto have executed this Mutual Non-Disclosure and Non-Circumvention Agreement as of the Effective Date set forth above.', { bold: true }))
  bodyChildren.push(bodyParagraph(''))

  const sigs = buildNdaSignatures(cover)
  // Two-column signature table — plain black text, no colored backgrounds
  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: JET },
      bottom: { style: BorderStyle.NONE, size: 0, color: JET },
      left: { style: BorderStyle.NONE, size: 0, color: JET },
      right: { style: BorderStyle.NONE, size: 0, color: JET },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: JET },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: JET },
    },
    rows: [
      // Header row — bold black text, no background
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 0, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: 'SINBA GROUP ISRAEL LTD.', bold: true, size: 22, color: JET, font: 'Calibri' })] })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 100, right: 0 },
            children: [new Paragraph({ children: [new TextRun({ text: 'RECIPIENT', bold: true, size: 22, color: JET, font: 'Calibri' })] })],
          }),
        ],
      }),
      // Signature line + details for Sinba
      ...sigs.sinba.map((row, ri) => new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 0, right: 100 },
            children: [new Paragraph({
              children: [
                new TextRun({ text: row[0], bold: true, size: 20, color: JET, font: 'Calibri' }),
                new TextRun({ text: ' ' + row[1], size: 20, color: JET, font: 'Calibri' }),
              ],
            })],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 100, right: 0 },
            children: [new Paragraph({
              children: [
                new TextRun({ text: sigs.recipient[ri][0], bold: true, size: 20, color: JET, font: 'Calibri' }),
                new TextRun({ text: ' ' + sigs.recipient[ri][1], size: 20, color: JET, font: 'Calibri' }),
              ],
            })],
          }),
        ],
      })),
    ],
  })
  bodyChildren.push(sigTable)

  // Annex 1
  bodyChildren.push(new Paragraph({ children: [new PageBreak()] }))
  bodyChildren.push(sectionHeading('ANNEX 1: LIST OF TECH PLATFORMS, PROVIDERS, SOFTWARE & PARTNER BRANDS'))
  bodyChildren.push(bodyParagraph('(This list forms an integral part of the Agreement. It covers all tech platforms, AI providers, software, and partners introduced by or integrated into Sinba Group Israel LTD\'s omni-channel platform solution).'))
  cover.annexItems.forEach((item, i) => {
    bodyChildren.push(bodyParagraph(`${i + 1}. ${item}`))
  })

  // ---- Document assembly ----
  const doc = new Document({
    creator: 'MassaPro NDA Builder',
    title: 'Mutual NDA',
    description: 'Generated by MassaPro NDA Builder',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: JET } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            size: { orientation: PageOrientation.PORTRAIT },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Page ', size: 18, color: '666666', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '666666', font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 18, color: '666666', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '666666', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: bodyChildren,
      },
    ],
  })

  return Packer.toBlob(doc)
}

// ---- Public entrypoint ----
export async function exportNdaWord(payload: Omit<NDAExportPayload, 'logoBuffer'>, logoUrl?: string): Promise<void> {
  const blob = await buildNdaDoc({ cover: payload.cover })
  const filename = `Mutual-NDA-${(payload.cover.recipientName || 'Recipient').replace(/[^A-Za-z0-9_-]+/g, '_')}.docx`
  saveAs(blob, filename)
}
