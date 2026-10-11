// Word (.docx) export for the MassaPro Mutual NDA.
//
// Builds a branded NDA document using the MassaPro Visual & Design System
// (dark gradient cover, electric violet accents, clickable TOC) and
// triggers a browser download using the `docx` library.

import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow,
  TableCell, WidthType, BorderStyle, ShadingType, PageOrientation,
  Header, Footer, PageNumber, PageBreak, Bookmark, InternalHyperlink,
  LineRuleType, ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'
import {
  NDACoverInfo, NDA_SECTIONS, NDA_RECITALS,
  buildNdaIntro, buildNdaSignatures,
} from '@/lib/nda-data'
import { getImageDimensions, fitImage } from '@/lib/image-dimensions'

const ORCHID = '7F39FB'        // electric violet — primary accent
const DARK_NEAR_BLACK = '0A0711'
const DARK_INDIGO = '241445'
const DARK_VIOLET = '3D1F6B'
const LAVENDER = 'E9D5FF'
const JET = '0A0711'
const WHITE = 'FFFFFF'
const GREY = '9CA3AF'

export interface NDAExportPayload {
  cover: NDACoverInfo
  logoBuffer: ArrayBuffer | null
}

const hexNoHash = (hex: string) => hex.replace('#', '').toUpperCase()

function noBorderAll() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return {
    top: none, bottom: none, left: none, right: none,
    insideHorizontal: none, insideVertical: none,
  }
}

// Gradient row — a single full-width cell with a colored background.
// Used to simulate the dark gradient banner on the cover page.
function gradientRow(fill: string, height: number, children: (Paragraph | Table)[] = []) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorderAll(),
    rows: [
      new TableRow({
        height: { value: height, rule: 'atLeast' as any },
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: noBorderAll() as any,
            children,
          }),
        ],
      }),
    ],
  })
}

function bodyParagraph(text: string, opts: { indent?: number; italic?: boolean; bold?: boolean; color?: string; size?: number; after?: number } = {}) {
  return new Paragraph({
    spacing: {
      before: 0,
      after: opts.after ?? 160,
      line: 320,
      lineRule: LineRuleType.AUTO,
    },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({
        text,
        size: opts.size ?? 22,
        color: opts.color ?? JET,
        bold: opts.bold,
        italics: opts.italic,
        font: 'Calibri',
      }),
    ],
  })
}

function sectionHeading(text: string, bookmarkId?: string): Paragraph {
  const headingRun = new TextRun({
    text, bold: true, size: 28, color: ORCHID, font: 'Calibri',
  })
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    border: { bottom: { color: ORCHID, space: 6, style: BorderStyle.SINGLE, size: 12 } },
    children: bookmarkId
      ? [new Bookmark({ id: bookmarkId, children: [headingRun] })]
      : [headingRun],
  })
}

function tocEntry(label: string, anchor: string): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [
      new InternalHyperlink({
        anchor,
        children: [
          new TextRun({
            text: label, size: 24, color: ORCHID, font: 'Calibri',
            underline: { type: 'single', color: ORCHID } as any,
          }),
        ],
      } as any),
    ],
  })
}

export async function buildNdaDoc(payload: NDAExportPayload): Promise<Blob> {
  const { cover, logoBuffer } = payload

  // ---- Cover page (dark gradient banner) ----
  const logoRow = logoBuffer
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorderAll(),
        rows: [
          new TableRow({
            height: { value: 1800, rule: 'atLeast' as any },
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, color: 'auto', fill: DARK_NEAR_BLACK },
                margins: { top: 200, bottom: 100, left: 0, right: 0 },
                borders: noBorderAll() as any,
                verticalAlign: 'center',
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new ImageRun({ data: logoBuffer, transformation: { width: 180, height: 180 }, type: 'png' } as any)],
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    : gradientRow(DARK_NEAR_BLACK, 1800, [])

  const coverChildren: (Paragraph | Table)[] = [
    logoRow,
    gradientRow(DARK_NEAR_BLACK, 160, []),
    gradientRow(DARK_VIOLET, 160, []),
    gradientRow(DARK_INDIGO, 220, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'MassaPro', bold: true, size: 56, color: WHITE, font: 'Calibri' })],
      }),
    ]),
    gradientRow(DARK_INDIGO, 220, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Mutual NDA', bold: true, size: 36, color: LAVENDER, font: 'Calibri' })],
      }),
    ]),
    gradientRow(DARK_INDIGO, 200, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: 'Non-Disclosure & Non-Circumvention Agreement', italics: true, size: 24, color: LAVENDER, font: 'Calibri' })],
      }),
    ]),
    gradientRow(DARK_INDIGO, 120, []),
    // Cover info table
    new Paragraph({ spacing: { before: 480, after: 320 }, children: [] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
        left: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
        right: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
      },
      alignment: AlignmentType.CENTER,
      rows: [
        ...[
          ['Effective Date', cover.effectiveDate || '—'],
          ['Sinba', cover.sinbaName],
          ['Recipient', cover.recipientName || '—'],
          ['Recipient Email', cover.recipientEmail || '—'],
        ].map(([label, value]) => new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: LAVENDER },
              children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, color: JET, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              margins: { top: 100, bottom: 100, left: 160, right: 160 },
              children: [new Paragraph({ children: [new TextRun({ text: value, size: 22, color: JET, font: 'Calibri' })] })],
            }),
          ],
        })),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // ---- TOC page ----
  const tocChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 120 },
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 36, color: ORCHID, font: 'Calibri' })],
    }),
    new Paragraph({
      spacing: { before: 0, after: 200 },
      border: { bottom: { color: ORCHID, space: 6, style: BorderStyle.SINGLE, size: 12 } },
      children: [],
    }),
  ]
  // TOC entries — one per section
  NDA_SECTIONS.forEach((sec, i) => {
    tocChildren.push(tocEntry(`${sec.number}. ${sec.title}`, `nda-sec-${i}`))
  })
  tocChildren.push(tocEntry('Annex 1 — Tech Platforms & Providers', 'nda-annex'))
  tocChildren.push(new Paragraph({ children: [new PageBreak()] }))

  // ---- Body content ----
  const bodyChildren: (Paragraph | Table)[] = []

  // Title
  bodyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      children: [new TextRun({ text: 'MUTUAL NON-DISCLOSURE AND NON-CIRCUMVENTION AGREEMENT', bold: true, size: 32, color: ORCHID, font: 'Calibri' })],
    }),
  )

  // Intro (parties)
  const intro = buildNdaIntro(cover)
  intro.split('\n\n').forEach((para) => {
    bodyChildren.push(bodyParagraph(para))
  })

  // Recitals
  bodyChildren.push(sectionHeading('RECITALS', 'nda-recitals'))
  NDA_RECITALS.forEach((recital) => {
    bodyChildren.push(bodyParagraph(recital))
  })
  bodyChildren.push(bodyParagraph('NOW, THEREFORE, in consideration of the mutual covenants, terms, and conditions set forth herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:'))

  // Sections
  NDA_SECTIONS.forEach((sec, i) => {
    bodyChildren.push(sectionHeading(`${sec.number}. ${sec.title}`, `nda-sec-${i}`))
    sec.paragraphs.forEach((para) => {
      bodyChildren.push(bodyParagraph(para))
    })
  })

  // Signature block
  bodyChildren.push(
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [new TextRun({ text: 'IN WITNESS WHEREOF, the Parties hereto have executed this Mutual Non-Disclosure and Non-Circumvention Agreement as of the Effective Date set forth above.', bold: true, size: 22, color: JET, font: 'Calibri' })],
    }),
  )
  const sigs = buildNdaSignatures(cover)
  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
      left: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
      right: { style: BorderStyle.SINGLE, size: 12, color: ORCHID },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
    },
    rows: [
      // Header row
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: ORCHID },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'SINBA GROUP ISRAEL LTD.', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: ORCHID },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: 'RECIPIENT', bold: true, size: 20, color: WHITE, font: 'Calibri' })] })],
          }),
        ],
      }),
      // Body rows
      ...sigs.sinba.map((row, ri) => new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            shading: ri % 2 === 1 ? { type: ShadingType.CLEAR, color: 'auto', fill: LAVENDER } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: row[0], bold: true, size: 18, color: JET, font: 'Calibri' }), new TextRun({ text: ' ' + row[1], size: 18, color: JET, font: 'Calibri' })] })],
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            shading: ri % 2 === 1 ? { type: ShadingType.CLEAR, color: 'auto', fill: LAVENDER } : undefined,
            children: [new Paragraph({ children: [new TextRun({ text: sigs.recipient[ri][0], bold: true, size: 18, color: JET, font: 'Calibri' }), new TextRun({ text: ' ' + sigs.recipient[ri][1], size: 18, color: JET, font: 'Calibri' })] })],
          }),
        ],
      })),
    ],
  })
  bodyChildren.push(sigTable)

  // Annex 1
  bodyChildren.push(new Paragraph({ children: [new PageBreak()] }))
  bodyChildren.push(sectionHeading('ANNEX 1: LIST OF TECH PLATFORMS, PROVIDERS, SOFTWARE & PARTNER BRANDS', 'nda-annex'))
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
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
            size: { orientation: PageOrientation.PORTRAIT },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { color: ORCHID, space: 4, style: BorderStyle.SINGLE, size: 6 } },
                children: [
                  new TextRun({ text: 'Page ', size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ text: '  •  MassaPro NDA Builder', size: 18, color: GREY, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverChildren,
          ...tocChildren,
          ...bodyChildren,
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

// ---- Public entrypoint ----
export async function exportNdaWord(payload: Omit<NDAExportPayload, 'logoBuffer'>, logoUrl?: string): Promise<void> {
  let logoBuffer: ArrayBuffer | null = null
  if (logoUrl) {
    try {
      const res = await fetch(logoUrl, { mode: 'cors' })
      if (res.ok) logoBuffer = await res.arrayBuffer()
    } catch {}
  }
  const blob = await buildNdaDoc({ ...payload, logoBuffer })
  const filename = `Mutual-NDA-${(payload.cover.recipientName || 'Recipient').replace(/[^A-Za-z0-9_-]+/g, '_')}.docx`
  saveAs(blob, filename)
}
