// Word (.docx) export for the MassaPro SOW Builder.
//
// Builds a branded SOW document and triggers a browser download using
// the `docx` library. Layout follows the original Connex SOW template
// (uploaded by the user as "Massapro- Statement of Work.pdf"), rebranded
// Connex → MassaPro per the brand book.
//
// Sections in the .docx:
//   1. Cover page — MassaPro logo, title, cover-info table
//   2. Welcome page — intro paragraphs, benefits list, closing, retention
//   3. Project Overview — overview paragraph + Phase 1 deliverables list
//   4. Scope — per-service section: intro + Configuration + Requirements
//   5. Configuration Tracker — single table with status / owner / due / notes
//   6. Infrastructure & Access Requirements (pre-deployment, hardware, internet)
//   7. Support — 24/7 support, support portal, ticket template
//   8. Project Milestones — Connex-template default milestones table
//   9. Signatures — authorized signatories table
//
// Brand colors (MassaPro Brand Book):
//   Orchid Purple  #9333EA   (primary accent, headers, button-equivalents)
//   Pure White     #FFFFFF   (backgrounds)
//   Jet Black      #030712   (body text)
//   Soft Lavender  #F3E8FF   (subtle table header fill)
//
// Font: sans-serif (Calibri in Word — sans-serif).

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  PageBreak,
  ShadingType,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
  LineRuleType,
  TabStopType,
  TabStopPosition,
  PageBorderDisplay,
  PageBorderOffsetFrom,
  PageBorderZOrder,
} from 'docx'
import { saveAs } from 'file-saver'
import {
  SERVICES,
  CATEGORY_LABELS,
  brandClean,
  BRAND,
  type ServiceTask,
  type TaskStatus,
  type ServiceCategory,
  type Service,
  STATUS_LABELS,
  INFRA_REQUIREMENTS,
  SUPPORT_SECTIONS,
  WELCOME_PARAGRAPHS,
  DEFAULT_MILESTONES,
  type MilestoneRow,
} from '@/lib/sow-data'
import { getImageDimensions, fitImage } from '@/lib/image-dimensions'

export interface SOWCoverInfo {
  clientName: string
  clientDemo: string   // NEW — the specific Demo this SOW is for (e.g., "Acme Q4 Outbound Demo"). Shown on the top-right of every page.
  projectName: string
  date: string
  version: string
  preparedBy: string
  overview: string
  clientLogo?: string  // NEW — optional client logo as a data URL (base64-encoded PNG/JPG). Rendered on the cover page (right side, next to MassaPro logo) and on the top-right of every other page header.
}

export interface SOWTaskState {
  // status / owner / dueDate / notes overrides keyed by task id
  [taskId: string]: {
    status?: TaskStatus
    owner?: string
    dueDate?: string
    notes?: string
  }
}

export interface SOWSpecValue {
  // spec row id -> value (string)
  [specId: string]: string
}

export interface CustomService {
  id: string
  name: string
  description: string
  tasks: ServiceTask[]
  techSpecs: { id: string; field: string; description: string; example?: string }[]
}

export interface SOWExportPayload {
  cover: SOWCoverInfo
  selectedServiceIds: string[]
  customServices: CustomService[]
  taskState: SOWTaskState
  specValues: SOWSpecValue
  logoBuffer: ArrayBuffer | null
  // Tasks the user added on top of a builtin service (not its own custom service).
  // Keyed by builtin service id; values are the extra tasks to merge in.
  customTasksByBuiltinService?: Record<string, ServiceTask[]>
  // Optional milestone overrides (same shape as DEFAULT_MILESTONES).
  milestones?: MilestoneRow[]
}

// ---------------------------------------------------------------------------
// Helpers — color to ARGB without leading #
// ---------------------------------------------------------------------------
const hexNoHash = (hex: string) => hex.replace('#', '').toUpperCase()

// ---------------------------------------------------------------------------
// Build the docx
// ---------------------------------------------------------------------------
export async function buildSowDoc(payload: SOWExportPayload): Promise<Blob> {
  const {
    cover,
    selectedServiceIds,
    customServices,
    taskState,
    specValues,
    logoBuffer,
    customTasksByBuiltinService,
    milestones,
  } = payload

  // Resolve services: built-in selected + custom, with custom tasks merged into builtin
  const builtinSelected: Service[] = SERVICES.filter((s) => selectedServiceIds.includes(s.id)).map(
    (s) => ({
      ...s,
      tasks: [...s.tasks, ...(customTasksByBuiltinService?.[s.id] ?? [])],
    })
  ) as Service[]
  const allServices: (Service | CustomService)[] = [...builtinSelected, ...customServices]

  const ORCHID = hexNoHash(BRAND.orchidPurple)
  const JET = hexNoHash(BRAND.jetBlack)
  const LAVENDER = hexNoHash(BRAND.softLavender)
  const WHITE = hexNoHash(BRAND.pureWhite)
  const GREY = '666666'
  // Extra shades for the gradient effect (Orchid Purple blended with Lavender).
  // We simulate a gradient by stacking rows of different shades in the cover banner.
  const ORCHID_DEEP = '6B21A8'   // #6B21A8 — deeper purple for top of gradient
  const ORCHID_MID = '7E22CE'    // #7E22CE — mid
  const LAVENDER_LIGHT = 'FAF5FF' // #FAF5FF — bottom of gradient (very light)

  // =========================================================================
  // SECTION 1 — Cover Page
  //
  // The original Connex template has a full-bleed gradient banner. Word doesn't
  // support true gradients, so we simulate one by stacking three full-width
  // single-cell tables with progressively lighter Orchid Purple shades:
  //   row 1 (deepest) → row 2 (mid) → row 3 (lavender) → row 4 (white)
  // The MassaPro logo sits centered in the gradient, "Statement of Work" in
  // white below it.
  // =========================================================================

  // =========================================================================
  // SECTION 1 — Cover Page
  //
  // Layout (per user feedback): MassaPro logo at the TOP of the gradient
  // banner, with "MassaPro" + "Statement of Work" text BELOW the logo (not
  // on top of it). When a client logo is provided, it appears on the RIGHT
  // side of the gradient banner, next to the MassaPro logo on the left.
  //
  // Word doesn't support true gradients, so we simulate one by stacking
  // full-width single-cell tables with progressively lighter Orchid shades.
  // =========================================================================

  // Helper — a single full-width cell with a colored background. Used to
  // simulate the gradient banner.
  const gradientRow = (fill: string, height: number, children: (Paragraph | Table)[] = []) =>
    new Table({
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

  // Decode the optional client logo data URL into an ArrayBuffer that
  // ImageRun can consume. Returns null when no logo is set or the data
  // URL is malformed.
  const clientLogoBuffer = (() => {
    if (!cover.clientLogo) return null
    try {
      const dataUrlMatch = cover.clientLogo.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (!dataUrlMatch) return null
      const base64 = dataUrlMatch[2]
      const binary = atob(base64)
      const len = binary.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
      return bytes.buffer
    } catch {
      return null
    }
  })()
  const clientLogoType = (() => {
    if (!cover.clientLogo) return 'png' as const
    const m = cover.clientLogo.match(/^data:([a-zA-Z0-9]+\/([a-zA-Z0-9.+-]+));base64,/)
    if (!m) return 'png' as const
    const ext = m[2].toLowerCase()
    if (ext === 'jpg' || ext === 'jpeg') return 'jpg' as any
    if (ext === 'gif') return 'gif' as any
    return 'png' as any
  })()

  // Detect the client logo's natural pixel dimensions so we can preserve its
  // aspect ratio. Without this, a wide logo (e.g., 221×74) gets forced into a
  // 180×180 square and looks distorted. We fit it within a 180×180 box.
  const clientLogoDims = clientLogoBuffer ? getImageDimensions(clientLogoBuffer) : null
  const clientLogoCoverFit = fitImage(clientLogoDims, 180, 180)
  const clientLogoHeaderFit = fitImage(clientLogoDims, 60, 60)

  // Two-column logo row — MassaPro logo on the LEFT, client logo on the RIGHT.
  // Both sit in the darkest band of the gradient. When no client logo is set,
  // the MassaPro logo is centered instead.
  const logoRow = logoBuffer
    ? (clientLogoBuffer
        ? new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorderAll(),
            rows: [
              new TableRow({
                height: { value: 1800, rule: 'atLeast' as any },
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '4C1D95' },
                    margins: { top: 200, bottom: 100, left: 100, right: 100 },
                    borders: noBorderAll() as any,
                    verticalAlign: 'center',
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new ImageRun({ data: logoBuffer, transformation: { width: 180, height: 180 }, type: 'png' } as any)],
                      }),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '4C1D95' },
                    margins: { top: 200, bottom: 100, left: 100, right: 100 },
                    borders: noBorderAll() as any,
                    verticalAlign: 'center',
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new ImageRun({
                          data: clientLogoBuffer,
                          transformation: { width: clientLogoCoverFit.width, height: clientLogoCoverFit.height },
                          type: clientLogoType,
                        } as any)],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        : new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: noBorderAll(),
            rows: [
              new TableRow({
                height: { value: 1800, rule: 'atLeast' as any },
                children: [
                  new TableCell({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '4C1D95' },
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
          }))
    : gradientRow('4C1D95', 1800, [])

  const coverChildren: (Paragraph | Table)[] = [
    // Top: MassaPro logo (+ client logo on right when set). Text goes BELOW.
    logoRow,
    // Transition bands — purple → lavender → white
    gradientRow(ORCHID_DEEP, 160, []),
    gradientRow(ORCHID_MID, 160, []),
    // Brand name — white on the orchid band, BELOW the logo
    gradientRow(ORCHID, 220, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: 'MassaPro', bold: true, size: 56, color: WHITE, font: 'Calibri' }),
        ],
      }),
    ]),
    // Lighter purple band with the document title — BELOW the brand name
    gradientRow('A855F7', 220, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: 'Statement of Work', bold: true, size: 36, color: WHITE, font: 'Calibri' }),
        ],
      }),
    ]),
    // Soft lavender band with the subtitle
    gradientRow('C084FC', 200, [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text: brandClean(`Implementation of your MassaPro platform`),
            italics: true,
            size: 24,
            color: WHITE,
            font: 'Calibri',
          }),
        ],
      }),
    ]),
    gradientRow(LAVENDER, 120, []),
    gradientRow(LAVENDER_LIGHT, 120, []),
    // Spacer
    new Paragraph({ spacing: { before: 480, after: 320 }, children: [] }),
    // Cover info table — Soft Lavender label column, white value column,
    // purple outer border.
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
        coverInfoRow('Client', cover.clientName || '<client name>'),
        coverInfoRow('Client Demo', cover.clientDemo || '<demo>'),
        coverInfoRow('Project', cover.projectName || '<project>'),
        coverInfoRow('Date', cover.date || '—'),
        coverInfoRow('Version', cover.version || 'v1.0'),
        coverInfoRow('Prepared By', cover.preparedBy || 'MassaPro Solutions Architect'),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // =========================================================================
  // SECTION 2 — Welcome Page (Connex template cover page 2)
  // =========================================================================
  // Benefits callout box — a single-cell Soft Lavender table with a thick
  // Orchid left border containing the benefits bullets. Cool design feature
  // that makes the welcome page pop.
  const benefitsCallout = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
      left: { style: BorderStyle.SINGLE, size: 24, color: ORCHID },
      right: { style: BorderStyle.SINGLE, size: 4, color: LAVENDER },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: LAVENDER },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              ...WELCOME_PARAGRAPHS.benefits.map((b) => bulletParagraph(brandClean(b), 0)),
            ],
          }),
        ],
      }),
    ],
  })

  const welcomeChildren: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 120 },
      children: [
        new TextRun({ text: 'Welcome to MassaPro', bold: true, size: 40, color: ORCHID, font: 'Calibri' }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 600, after: 240 },
      children: [
        new TextRun({ text: WELCOME_PARAGRAPHS.subtitle, bold: true, size: 26, color: JET, font: 'Calibri' }),
      ],
    }),
    bodyParagraph(WELCOME_PARAGRAPHS.intro),
    bodyParagraph(WELCOME_PARAGRAPHS.body),
    // Benefits callout box
    new Paragraph({ spacing: { before: 200, after: 0 }, children: [] }),
    benefitsCallout,
    new Paragraph({ spacing: { before: 320, after: 0 }, children: [] }),
    bodyParagraph(WELCOME_PARAGRAPHS.closing),
    bodyParagraph(WELCOME_PARAGRAPHS.retention, { italic: true }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // =========================================================================
  // SECTION 3 — Project Overview + Deliverables
  // =========================================================================
  const overviewChildren: (Paragraph | Table)[] = [
    sectionHeading('Statement of Work'),
    subSectionHeading('Project Overview'),
    bodyParagraph(
      brandClean(
        cover.overview ||
          `This Statement of Work ("SOW") describes the services that MassaPro will deliver to ${cover.clientName || '<client name>'} for the ${cover.projectName || 'Implementation of your MassaPro platform'} initiative. The scope, deliverables, configuration, requirements, milestones and acceptance criteria outlined below reflect the services selected by the Client and confirmed by MassaPro at the time of signing.`
      )
    ),
    subSectionHeading('Deliverables'),
    bodyParagraph(
      brandClean(
        `MassaPro will implement the following project deliverables with ${cover.clientName || '<client name>'}:`
      ),
      { after: 120 }
    ),
    subSectionHeading('Phase 1'),
  ]
  if (allServices.length === 0) {
    overviewChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'No services selected.', italics: true, size: 22, color: JET, font: 'Calibri' })],
      })
    )
  } else {
    allServices.forEach((svc) => {
      overviewChildren.push(
        bulletParagraph(brandClean(`Setup and configuration of ${svc.name}`), 0)
      )
    })
    // Always add the training & support line per the Connex template
    overviewChildren.push(
      bulletParagraph('Remote training with Technical Services Engineer', 0),
      bulletParagraph('Further dedicated Technical Services Engineer support for full Go-Live', 0)
    )
  }

  // =========================================================================
  // SECTION 4 — Scope (per-service Configuration + Requirements)
  // =========================================================================
  // IMPORTANT: do NOT start each service on a new page — that balloons
  // the document from ~15 pages to 28+ pages. Services flow naturally
  // with a spacer between them; only major sections (Tracker, Infra,
  // Support, Milestones, Signatures) get a PageBreak before them.
  const scopeChildren: (Paragraph | Table)[] = []
  let serviceIndex = 0
  for (const svc of allServices) {
    serviceIndex += 1
    // First service continues right after the overview; subsequent
    // services get a visible separator (purple rule) instead of a page break.
    if (serviceIndex > 1) {
      scopeChildren.push(
        new Paragraph({
          spacing: { before: 360, after: 200 },
          border: { bottom: { color: ORCHID, space: 8, style: BorderStyle.SINGLE, size: 6 } },
          children: [],
        })
      )
    }
    // "Scope / Phase 1 / <Service Name>" header block — compact (no page break)
    scopeChildren.push(
      sectionHeading('Scope'),
      subSectionHeading('Phase 1'),
      new Paragraph({
        spacing: { before: 40, after: 160 },
        children: [
          new TextRun({
            text: brandClean(svc.name),
            bold: true,
            size: 28, // 14pt — slightly smaller than before
            color: ORCHID,
            font: 'Calibri',
          }),
        ],
      }),
      // Intro paragraph (Connex-template style: "Your MassaPro TSE will deploy X to <client>.")
      bodyParagraph(brandClean((svc as Service).intro || svc.description))
    )

    // Configuration sub-heading + bullets
    scopeChildren.push(subSectionHeading('Configuration'))
    if (svc.tasks.length === 0) {
      scopeChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 120 },
          children: [new TextRun({ text: 'No configuration items defined.', italics: true, size: 22, color: JET, font: 'Calibri' })],
        })
      )
    } else {
      svc.tasks.forEach((task) => {
        scopeChildren.push(bulletParagraph(brandClean(task.title), 0))
        if (task.description) {
          scopeChildren.push(bodyParagraph(brandClean(task.description), { indent: 360, after: 160, size: 20 }))
        }
        if (task.subTasks && task.subTasks.length) {
          task.subTasks.forEach((sub) => {
            scopeChildren.push(bulletParagraph(brandClean(sub.title), 1))
            if (sub.description) {
              scopeChildren.push(bodyParagraph(brandClean(sub.description), { indent: 720, after: 120, size: 20, color: GREY }))
            }
          })
        }
      })
    }

    // Requirements sub-heading + bullets (these are the spec rows)
    scopeChildren.push(subSectionHeading('Requirements'))
    if (svc.techSpecs.length === 0) {
      scopeChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 120 },
          children: [new TextRun({ text: 'No requirements defined.', italics: true, size: 22, color: JET, font: 'Calibri' })],
        })
      )
    } else {
      svc.techSpecs.forEach((row) => {
        const value = specValues[row.id]
        const text = value
          ? `${row.field}: ${brandClean(row.description)} (Provided: ${brandClean(value)})`
          : `${row.field}: ${brandClean(row.description)}`
        scopeChildren.push(bulletParagraph(text, 0))
      })
    }
  }

  // =========================================================================
  // SECTION 5 — Configuration Tracker (status / owner / due / notes)
  // =========================================================================
  const trackerChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading('Statement of Work'),
    subSectionHeading('Configuration Tracker'),
    bodyParagraph(
      'The following tracker shows the live status of every configuration item across all selected services. Use this table to track progress against owners, due dates and notes during the project delivery.',
      { after: 200 }
    ),
  ]
  const taskRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        taskHeaderCell('#'),
        taskHeaderCell('Configuration Item'),
        taskHeaderCell('Service'),
        taskHeaderCell('Status'),
        taskHeaderCell('Owner'),
        taskHeaderCell('Due'),
        taskHeaderCell('Notes'),
      ],
    }),
  ]
  let taskCounter = 0
  let stripeCounter = 0
  allServices.forEach((svc) => {
    svc.tasks.forEach((task) => {
      taskCounter += 1
      stripeCounter += 1
      const state = taskState[task.id] || {}
      const status = state.status ? STATUS_LABELS[state.status] : STATUS_LABELS.pending
      const stripe = stripeCounter % 2 === 1
      taskRows.push(
        new TableRow({
          cantSplit: true, // keep multi-line rows together across page breaks
          children: [
            taskBodyCell(String(taskCounter), true, stripe),
            taskBodyCell(brandClean(task.title), false, stripe),
            taskBodyCell(brandClean(svc.name), false, stripe),
            statusCell(status, stripe),
            taskBodyCell(state.owner || '', false, stripe),
            taskBodyCell(state.dueDate || '', false, stripe),
            taskBodyCell(state.notes || '', false, stripe),
          ],
        })
      )
      if (task.subTasks && task.subTasks.length) {
        task.subTasks.forEach((sub) => {
          taskCounter += 1
          stripeCounter += 1
          const subState = taskState[sub.id] || {}
          const subStatus = subState.status ? STATUS_LABELS[subState.status] : STATUS_LABELS.pending
          const subStripe = stripeCounter % 2 === 1
          taskRows.push(
            new TableRow({
              cantSplit: true,
              children: [
                taskBodyCell(`${taskCounter}`, true, subStripe),
                taskBodyCell(`↳ ${brandClean(sub.title)}`, false, subStripe),
                taskBodyCell(brandClean(svc.name), false, subStripe),
                statusCell(subStatus, subStripe),
                taskBodyCell(subState.owner || '', false, subStripe),
                taskBodyCell(subState.dueDate || '', false, subStripe),
                taskBodyCell(subState.notes || '', false, subStripe),
              ],
            })
          )
        })
      }
    })
  })
  if (taskRows.length > 1) {
    // Column widths — Configuration Item is 40% wider than the other body
    // columns so its text wraps cleanly instead of stacking on top of itself.
    // #=4, Item=28 (the wide one), Service=14, Status=10, Owner=12, Due=10, Notes=22.
    trackerChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders(),
        columnWidths: [280, 1980, 990, 700, 850, 700, 1560],
        rows: taskRows,
      })
    )
  } else {
    trackerChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'No configuration items selected.', italics: true, size: 22, color: JET, font: 'Calibri' })],
      })
    )
  }

  // =========================================================================
  // SECTION 6 — Infrastructure & Access Requirements
  // =========================================================================
  const infraChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading('Statement of Work'),
    subSectionHeading('Requirements'),
    bodyParagraph(
      'The following infrastructure, hardware and connectivity requirements must be met by the Client prior to and during the project.',
      { after: 200 }
    ),
    subSectionHeading('Infrastructure & Access Requirements'),
    ...INFRA_REQUIREMENTS.preDeployment.map((b) => bulletParagraph(brandClean(b), 0)),
    subSectionHeading('Hardware'),
    ...INFRA_REQUIREMENTS.hardware.map((b) => bulletParagraph(brandClean(b), 0)),
    subSectionHeading('Internet'),
    ...INFRA_REQUIREMENTS.internet.map((b) => bulletParagraph(brandClean(b), 0)),
  ]

  // =========================================================================
  // SECTION 7 — Support
  // =========================================================================
  const supportChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading('Statement of Work'),
    subSectionHeading('Support'),
    subSectionHeading(SUPPORT_SECTIONS.intro),
    ...SUPPORT_SECTIONS.supportService.map((b) => bodyParagraph(brandClean(b))),
    subSectionHeading('Support Portal'),
    ...SUPPORT_SECTIONS.supportPortal.map((b) => bodyParagraph(brandClean(b))),
    subSectionHeading('Support Ticket Submissions'),
    ...SUPPORT_SECTIONS.ticketSubmission.map((b) => bodyParagraph(brandClean(b))),
    // Ticket template — rendered as a simple indented text block to mirror
    // the Connex PDF's monospace-style template box.
    new Paragraph({ spacing: { before: 240, after: 120 } }),
    ...SUPPORT_SECTIONS.ticketTemplate.map((line) =>
      bodyParagraph(line, { indent: 360, size: 20, after: 120, color: JET })
    ),
  ]

  // =========================================================================
  // SECTION 8 — Project Milestones
  // =========================================================================
  const milestoneRows: MilestoneRow[] = milestones && milestones.length > 0 ? milestones : DEFAULT_MILESTONES
  const milestoneChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading('Project Milestones'),
    subSectionHeading('Phase 1'),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 160 },
      children: [
        new TextRun({ text: 'Project Milestones', bold: true, size: 28, color: ORCHID, font: 'Calibri' }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            taskHeaderCell('Task'),
            taskHeaderCell('Target Date'),
            taskHeaderCell('Status'),
          ],
        }),
        ...milestoneRows.map((m, i) =>
          new TableRow({
            children: [
              taskBodyCell(brandClean(m.task), false, i % 2 === 1),
              taskBodyCell(m.targetDate, false, i % 2 === 1),
              statusCell(m.status, i % 2 === 1),
            ],
          })
        ),
      ],
    }),
    bodyParagraph('Project progress will be tracked in the shared Project Tracker document.', { before: 200 }),
  ]

  // =========================================================================
  // SECTION 9 — Signatures (extension to the Connex template)
  // =========================================================================
  const signatureChildren: (Paragraph | Table)[] = [
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading('Signatures'),
    bodyParagraph(
      'By signing below, the authorized representatives of each party accept the scope, deliverables, configuration items, requirements and milestones defined in this Statement of Work.',
      { after: 320 }
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            specHeaderCell('Role'),
            specHeaderCell('Name'),
            specHeaderCell('Signature'),
            specHeaderCell('Date'),
          ],
        }),
        new TableRow({
          children: [
            specBodyCell('MassaPro Authorized Signatory', true, true),
            specBodyCell('', false, true),
            specBodyCell('', false, true),
            specBodyCell('', false, true),
          ],
        }),
        new TableRow({
          children: [
            specBodyCell(`${cover.clientName || 'Client'} Authorized Signatory`, true, false),
            specBodyCell('', false, false),
            specBodyCell('', false, false),
            specBodyCell('', false, false),
          ],
        }),
      ],
    }),
  ]

  // =========================================================================
  // Document assembly
  // =========================================================================
  const doc = new Document({
    creator: 'MassaPro SOW Builder',
    title: `SOW — ${cover.projectName || 'Implementation of your MassaPro platform'}`,
    description: 'Generated by MassaPro SOW Builder',
    // Subtle Soft Lavender page tint — displays as the page color in Word
    background: { color: 'FAF5FF' },
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: JET },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
            size: { orientation: PageOrientation.PORTRAIT },
            // Orchid Purple page border on every page — cool design frame
            borders: {
              pageBorders: {
                display: PageBorderDisplay.ALL_PAGES,
                offsetFrom: PageBorderOffsetFrom.PAGE,
                zOrder: PageBorderZOrder.FRONT,
              },
              pageBorderTop: { style: BorderStyle.SINGLE, size: 12, color: '9333EA', space: 24 },
              pageBorderRight: { style: BorderStyle.SINGLE, size: 12, color: '9333EA', space: 24 },
              pageBorderBottom: { style: BorderStyle.SINGLE, size: 12, color: '9333EA', space: 24 },
              pageBorderLeft: { style: BorderStyle.SINGLE, size: 12, color: '9333EA', space: 24 },
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              // Header row — MassaPro logo on the LEFT, "SOW — project" in the
              // center, client logo on the RIGHT. Per the user's spec: on all
              // pages besides the first, MassaPro logo top-left and client
              // logo top-right.
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                borders: noBorderAll(),
                rows: [
                  new TableRow({
                    children: [
                      // Left cell — MassaPro text (or logo) on deep purple
                      new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '6B21A8' },
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        verticalAlign: 'center',
                        children: [
                          new Paragraph({
                            children: [
                              new TextRun({ text: 'MassaPro', bold: true, size: 18, color: WHITE, font: 'Calibri' }),
                            ],
                          }),
                        ],
                      }),
                      // Center cell — SOW + project name
                      new TableCell({
                        width: { size: 40, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '7E22CE' },
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        verticalAlign: 'center',
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({
                                text: 'SOW — ' + (cover.projectName || 'Implementation of your MassaPro platform'),
                                size: 18,
                                color: WHITE,
                                font: 'Calibri',
                              }),
                            ],
                          }),
                        ],
                      }),
                      // Right cell — client logo (when set) or Client Demo text
                      new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '9333EA' },
                        margins: { top: 60, bottom: 60, left: 100, right: 100 },
                        verticalAlign: 'center',
                        children: clientLogoBuffer
                          ? [new Paragraph({
                              alignment: AlignmentType.RIGHT,
                              children: [new ImageRun({
                                data: clientLogoBuffer,
                                transformation: { width: clientLogoHeaderFit.width, height: clientLogoHeaderFit.height },
                                type: clientLogoType,
                              } as any)],
                            })]
                          : [new Paragraph({
                              alignment: AlignmentType.RIGHT,
                              children: [
                                new TextRun({
                                  text: 'Client Demo: ' + (cover.clientDemo || '—'),
                                  bold: true,
                                  size: 18,
                                  color: WHITE,
                                  font: 'Calibri',
                                }),
                              ],
                            })],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: {
                  top: { color: '9333EA', space: 4, style: BorderStyle.SINGLE, size: 6 },
                },
                children: [
                  new TextRun({ text: 'Page ', size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: GREY, font: 'Calibri' }),
                  new TextRun({ text: '  •  MassaPro SOW Builder', size: 18, color: GREY, font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverChildren,
          ...welcomeChildren,
          ...overviewChildren,
          ...scopeChildren,
          ...trackerChildren,
          ...infraChildren,
          ...supportChildren,
          ...milestoneChildren,
          ...signatureChildren,
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

// ---------------------------------------------------------------------------
// Helpers — paragraphs, cells, borders
// ---------------------------------------------------------------------------

// Top-level section heading (e.g., "Statement of Work", "Scope") — purple,
// underlined, large.
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    border: {
      bottom: { color: '9333EA', space: 6, style: BorderStyle.SINGLE, size: 12 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28, // 14pt
        color: '9333EA',
        font: 'Calibri',
      }),
    ],
  })
}

// Sub-section heading (e.g., "Project Overview", "Configuration") — bold,
// jet black, no border.
function subSectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
        color: '030712',
        font: 'Calibri',
      }),
    ],
  })
}

// Body paragraph with sensible defaults (sans-serif, 11pt, jet black, line spacing 1.5)
function bodyParagraph(
  text: string,
  opts: {
    before?: number
    after?: number
    size?: number
    color?: string
    bold?: boolean
    italic?: boolean
    indent?: number
  } = {}
): Paragraph {
  return new Paragraph({
    spacing: {
      before: opts.before ?? 0,
      after: opts.after ?? 160,
      line: 320, // 1.33x line spacing — compact but readable
      lineRule: LineRuleType.AUTO,
    },
    indent: opts.indent ? { left: opts.indent } : undefined,
    children: [
      new TextRun({
        text,
        size: opts.size ?? 22,
        color: opts.color ?? '030712',
        bold: opts.bold,
        italics: opts.italic,
        font: 'Calibri',
      }),
    ],
  })
}

// Bullet paragraph — uses the unicode bullet "●" with hanging indent.
// level=0 → top-level bullet, level=1 → sub-bullet (indented).
function bulletParagraph(text: string, level: number = 0): Paragraph {
  const indent = 360 + level * 360
  const bulletChar = level === 0 ? '●' : '○'
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 300, lineRule: LineRuleType.AUTO },
    indent: { left: indent, hanging: 200 },
    children: [
      new TextRun({ text: `${bulletChar}  `, size: 22, color: '9333EA', font: 'Calibri', bold: true }),
      new TextRun({ text, size: 22, color: '030712', font: 'Calibri' }),
    ],
  })
}

// Cover-info table row (label / value). Lavender label column, white value
// column, both with purple bold text.
function coverInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3E8FF' },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 22, color: '030712', font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value, size: 22, color: '030712', font: 'Calibri' })],
          }),
        ],
      }),
    ],
  })
}

// Spec table — Orchid Purple header row (white text), alternating white /
// Soft Lavender body rows. Pass `stripe=true` on odd rows.
function specHeaderCell(text: string): TableCell {
  return new TableCell({
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '9333EA' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Calibri' })],
      }),
    ],
  })
}

function specBodyCell(text: string, bold: boolean, stripe: boolean = false): TableCell {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: stripe
      ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F3E8FF' }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20, color: '030712', font: 'Calibri' })],
      }),
    ],
  })
}

// Status colors — bold colored text for status values in tables.
// Cool design feature: statuses are instantly scannable by color.
const STATUS_TEXT_COLORS: Record<string, string> = {
  'Pending': '6B7280',      // grey
  'In Progress': 'D97706',  // amber
  'Completed': '059669',    // emerald
  'Blocked': 'DC2626',      // red
  'Complete': '059669',
  'Scheduled': '2563EB',    // blue
  'draft': '6B7280',
  'submitted': '2563EB',
  'approved': '059669',
  'rejected': 'DC2626',
}

function statusCell(text: string, stripe: boolean = false, small: boolean = true): TableCell {
  const color = STATUS_TEXT_COLORS[text] || '030712'
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    shading: stripe
      ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F3E8FF' }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: small ? 18 : 20, color, font: 'Calibri' })],
      }),
    ],
  })
}

// Task table — same Orchid Purple header, alternating body rows.
function taskHeaderCell(text: string): TableCell {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '9333EA' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18, color: 'FFFFFF', font: 'Calibri' })],
      }),
    ],
  })
}

function taskBodyCell(text: string, bold: boolean, stripe: boolean = false): TableCell {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: stripe
      ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F3E8FF' }
      : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 18, color: '030712', font: 'Calibri' })],
      }),
    ],
  })
}

// Brand-colored table borders — purple outer, lavender inner.
function tableBorders() {
  const outer = { style: BorderStyle.SINGLE, size: 12, color: '9333EA' }
  const inner = { style: BorderStyle.SINGLE, size: 4, color: 'F3E8FF' }
  return {
    top: outer,
    bottom: outer,
    left: outer,
    right: outer,
    insideHorizontal: inner,
    insideVertical: inner,
  }
}


function noBorderAll() {
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return {
    top: none,
    bottom: none,
    left: none,
    right: none,
    insideHorizontal: none,
    insideVertical: none,
  }
}

// ---------------------------------------------------------------------------
// Public helper — fetch the MassaPro logo as ArrayBuffer (best-effort).
// Falls back to null when the fetch fails (cover page renders without image).
// ---------------------------------------------------------------------------
export async function fetchLogoBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Public entrypoint — build + save the SOW .docx
// ---------------------------------------------------------------------------
export async function exportSowWord(
  payload: Omit<SOWExportPayload, 'logoBuffer'>,
  logoUrl?: string
): Promise<void> {
  let logoBuffer: ArrayBuffer | null = null
  if (logoUrl) {
    logoBuffer = await fetchLogoBuffer(logoUrl)
  }
  const blob = await buildSowDoc({ ...payload, logoBuffer })
  const filename = `SOW-${(payload.cover.projectName || 'MassaPro').replace(/[^A-Za-z0-9_-]+/g, '_')}.docx`
  saveAs(blob, filename)
}
