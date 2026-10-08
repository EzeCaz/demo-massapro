// Word (.docx) export for the MassaPro SOW Builder.
//
// Builds a branded SOW document and triggers a browser download using
// the `docx` library. The doc includes:
//   - Cover page with MassaPro logo, title, cover-info table
//   - Project Overview section
//   - Scope of Services (bullet list)
//   - Technical Specifications (table per selected service)
//   - Project Tasks (one big table with status / owner / due date / notes)
//   - Signatures block
//
// Brand colors (MassaPro Brand Book):
//   Orchid Purple  #9333EA   (primary accent, headers, button-equivalents)
//   Pure White     #FFFFFF   (backgrounds)
//   Jet Black      #030712   (body text)
//   Soft Lavender  #F3E8FF   (subtle table header fill)
//
// Font: sans-serif (Calibri / Inter in Word — both are sans-serif).

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
  STATUS_LABELS,
} from '@/lib/sow-data'

export interface SOWCoverInfo {
  clientName: string
  projectName: string
  date: string
  version: string
  preparedBy: string
  overview: string
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
}

// ---------------------------------------------------------------------------
// Helpers — color to ARGB without leading #
// ---------------------------------------------------------------------------
const hexNoHash = (hex: string) => hex.replace('#', '').toUpperCase()

// ---------------------------------------------------------------------------
// Build the docx
// ---------------------------------------------------------------------------
export async function buildSowDoc(payload: SOWExportPayload): Promise<Blob> {
  const { cover, selectedServiceIds, customServices, taskState, specValues, logoBuffer, customTasksByBuiltinService } = payload

  // Resolve services: built-in selected + custom, with custom tasks merged into builtin
  const builtinSelected = SERVICES.filter((s) => selectedServiceIds.includes(s.id)).map((s) => ({
    ...s,
    tasks: [...s.tasks, ...(customTasksByBuiltinService?.[s.id] ?? [])],
  }))
  const allServices = [...builtinSelected, ...customServices]

  const ORCHID = hexNoHash(BRAND.orchidPurple)
  const JET = hexNoHash(BRAND.jetBlack)
  const LAVENDER = hexNoHash(BRAND.softLavender)
  const WHITE = hexNoHash(BRAND.pureWhite)

  // ---- Cover Page ---------------------------------------------------------
  const coverImage = logoBuffer
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 240 },
        children: [
          new ImageRun({
            data: logoBuffer,
            transformation: { width: 180, height: 180 },
            type: 'png',
          } as any),
        ],
      })
    : new Paragraph({ spacing: { before: 2400, after: 240 }, children: [] })

  const coverChildren: (Paragraph | Table)[] = [
    coverImage,
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [
        new TextRun({
          text: 'MassaPro',
          bold: true,
          size: 56, // 28pt (size is half-points)
          color: ORCHID,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 480 },
      children: [
        new TextRun({
          text: 'STATEMENT OF WORK',
          bold: true,
          size: 36, // 18pt
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      children: [
        new TextRun({
          text: 'AI-powered contact center platform',
          italics: true,
          size: 22, // 11pt
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    // Cover info table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorderAll(),
      alignment: AlignmentType.CENTER,
      rows: [
        coverInfoRow('Client', cover.clientName || '—'),
        coverInfoRow('Project', cover.projectName || '—'),
        coverInfoRow('Date', cover.date || '—'),
        coverInfoRow('Version', cover.version || 'v1.0'),
        coverInfoRow('Prepared By', cover.preparedBy || '—'),
      ],
    }),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ]

  // ---- Section 1: Project Overview ---------------------------------------
  const overviewChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('1. Project Overview')),
    new Paragraph({
      spacing: { after: 240, line: 320, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({
          text: brandClean(
            cover.overview ||
              `This Statement of Work ("SOW") describes the services that MassaPro will deliver to ${cover.clientName || 'the Client'} for the ${cover.projectName || 'project'} initiative. The scope, tasks, technical specifications and deliverables outlined below reflect the services selected by the Client and confirmed by MassaPro at the time of signing.`
          ),
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
  ]

  // ---- Section 2: Scope of Services --------------------------------------
  const scopeChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('2. Scope of Services')),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'The following services are in scope under this SOW. Each selected service carries its own technical specification and task breakdown, detailed in the sections that follow.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
  ]
  if (allServices.length === 0) {
    scopeChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'No services selected.', italics: true, size: 22, color: JET, font: 'Calibri' })],
      })
    )
  } else {
    allServices.forEach((svc, i) => {
      scopeChildren.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22, color: ORCHID, font: 'Calibri' }),
            new TextRun({ text: brandClean(svc.name), bold: true, size: 22, color: JET, font: 'Calibri' }),
            new TextRun({ text: ` (${CATEGORY_LABELS[(svc as any).category as ServiceCategory] || 'Custom'})`, size: 22, color: '666666', font: 'Calibri' }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: brandClean(svc.description), size: 22, color: JET, font: 'Calibri' }),
          ],
        })
      )
    })
  }

  // ---- Section 3: Technical Specifications -------------------------------
  const specsChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('3. Technical Specifications')),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'The following technical specifications define the configuration parameters for each selected service. Values marked as examples should be confirmed with the Client during the discovery phase.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
  ]
  allServices.forEach((svc) => {
    specsChildren.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [new TextRun({ text: brandClean(svc.name), bold: true, size: 26, color: ORCHID, font: 'Calibri' })],
      })
    )
    if (svc.techSpecs.length === 0) {
      specsChildren.push(
        new Paragraph({
          children: [new TextRun({ text: 'No technical specifications defined.', italics: true, size: 22, color: JET, font: 'Calibri' })],
        })
      )
      return
    }
    specsChildren.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders(),
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              specHeaderCell('Field'),
              specHeaderCell('Description'),
              specHeaderCell('Value / Example'),
            ],
          }),
          ...svc.techSpecs.map(
            (row) =>
              new TableRow({
                children: [
                  specBodyCell(row.field, true),
                  specBodyCell(row.description, false),
                  specBodyCell(specValues[row.id] ?? row.example ?? '—', false),
                ],
              })
          ),
        ],
      })
    )
  })

  // ---- Section 4: Project Tasks ------------------------------------------
  // Aggregate all tasks from all selected services + their sub-tasks.
  const tasksChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('4. Project Tasks')),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'The following tasks define the work required to deliver the services in scope. Status, owner, due date and notes are tracked in real-time by the MassaPro SOW Builder and exported here for record-keeping.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
  ]

  const taskRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        taskHeaderCell('#'),
        taskHeaderCell('Task'),
        taskHeaderCell('Service'),
        taskHeaderCell('Status'),
        taskHeaderCell('Owner'),
        taskHeaderCell('Due'),
        taskHeaderCell('Est. Hrs'),
        taskHeaderCell('Notes'),
      ],
    }),
  ]
  let taskCounter = 0
  let totalHours = 0
  allServices.forEach((svc) => {
    svc.tasks.forEach((task) => {
      taskCounter += 1
      totalHours += task.estimatedHours || 0
      const state = taskState[task.id] || {}
      const status = state.status ? STATUS_LABELS[state.status] : STATUS_LABELS.pending
      taskRows.push(
        new TableRow({
          children: [
            taskBodyCell(String(taskCounter), true),
            taskBodyCell(brandClean(task.title) + (task.description ? `\n${brandClean(task.description)}` : ''), false),
            taskBodyCell(brandClean(svc.name), false),
            taskBodyCell(status, false),
            taskBodyCell(state.owner || '', false),
            taskBodyCell(state.dueDate || '', false),
            taskBodyCell(String(task.estimatedHours || 0), false),
            taskBodyCell(state.notes || '', false),
          ],
        })
      )
      // sub-tasks
      if (task.subTasks && task.subTasks.length) {
        task.subTasks.forEach((sub) => {
          taskCounter += 1
          const subState = taskState[sub.id] || {}
          const subStatus = subState.status ? STATUS_LABELS[subState.status] : STATUS_LABELS.pending
          taskRows.push(
            new TableRow({
              children: [
                taskBodyCell(`${taskCounter}`, true),
                taskBodyCell(`  ↳ ${brandClean(sub.title)} — ${brandClean(sub.description)}`, false),
                taskBodyCell(brandClean(svc.name), false),
                taskBodyCell(subStatus, false),
                taskBodyCell(subState.owner || '', false),
                taskBodyCell(subState.dueDate || '', false),
                taskBodyCell('—', false),
                taskBodyCell(subState.notes || '', false),
              ],
            })
          )
        })
      }
    })
  })
  tasksChildren.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: taskRows,
    })
  )
  tasksChildren.push(
    new Paragraph({
      spacing: { before: 160, after: 0 },
      children: [
        new TextRun({ text: 'Total Estimated Hours: ', bold: true, size: 22, color: JET, font: 'Calibri' }),
        new TextRun({ text: String(totalHours), bold: true, size: 22, color: ORCHID, font: 'Calibri' }),
      ],
    })
  )

  // ---- Section 5: Milestones & Deliverables ------------------------------
  const milestoneChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('5. Milestones & Deliverables')),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Project milestones will be tracked weekly. Final acceptance is contingent on the Client signing off on the deliverables defined below.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({
          tableHeader: true,
          children: [specHeaderCell('Milestone'), specHeaderCell('Deliverable'), specHeaderCell('Target')],
        }),
        new TableRow({ children: [specBodyCell('M1', true), specBodyCell('Discovery & sign-off on scope', false), specBodyCell('Week 1', false)] }),
        new TableRow({ children: [specBodyCell('M2', true), specBodyCell('Environment provisioning & integrations', false), specBodyCell('Week 2–3', false)] }),
        new TableRow({ children: [specBodyCell('M3', true), specBodyCell('Channel & voice configuration complete', false), specBodyCell('Week 3–4', false)] }),
        new TableRow({ children: [specBodyCell('M4', true), specBodyCell('UAT & training', false), specBodyCell('Week 5', false)] }),
        new TableRow({ children: [specBodyCell('M5', true), specBodyCell('Go-live & hypercare', false), specBodyCell('Week 6', false)] }),
      ],
    }),
  ]

  // ---- Section 6: Terms & Conditions -------------------------------------
  const termsChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('6. Terms & Conditions')),
    new Paragraph({
      spacing: { after: 160, line: 320, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({
          text: '6.1 Engagement. This SOW is governed by the Master Services Agreement signed between MassaPro and the Client. In case of conflict, the MSA prevails.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160, line: 320, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({
          text: '6.2 Change orders. Any change to the scope, tasks or specs in this SOW requires a written change order signed by both parties. MassaPro will provide an effort estimate for each change request within five business days.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160, line: 320, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({
          text: '6.3 Acceptance. Deliverables are deemed accepted if the Client does not raise written objections within ten business days of delivery.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 160, line: 320, lineRule: LineRuleType.AUTO },
      children: [
        new TextRun({
          text: '6.4 Confidentiality. Both parties agree to keep confidential all information exchanged during the engagement, including the contents of this SOW.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
  ]

  // ---- Section 7: Signatures ---------------------------------------------
  const signatureChildren: (Paragraph | Table)[] = [
    sectionHeading(brandClean('7. Signatures')),
    new Paragraph({
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: 'By signing below, the authorized representatives of each party accept the scope, tasks and specifications defined in this SOW.',
          size: 22,
          color: JET,
          font: 'Calibri',
        }),
      ],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders(),
      rows: [
        new TableRow({
          tableHeader: true,
          children: [specHeaderCell('Role'), specHeaderCell('Name'), specHeaderCell('Signature'), specHeaderCell('Date')],
        }),
        new TableRow({ children: [specBodyCell('MassaPro Authorized Signatory', true), specBodyCell('', false), specBodyCell('', false), specBodyCell('', false)] }),
        new TableRow({ children: [specBodyCell('Client Authorized Signatory', true), specBodyCell('', false), specBodyCell('', false), specBodyCell('', false)] }),
      ],
    }),
  ]

  // ---- Document assembly --------------------------------------------------
  const doc = new Document({
    creator: 'MassaPro SOW Builder',
    title: `SOW — ${cover.projectName || 'Project'}`,
    description: 'Generated by MassaPro SOW Builder',
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
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'MassaPro  •  ', bold: true, size: 18, color: ORCHID, font: 'Calibri' }),
                  new TextRun({ text: 'SOW — ' + (cover.projectName || 'Project'), size: 18, color: '888888', font: 'Calibri' }),
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
                children: [
                  new TextRun({ text: 'Page ', size: 18, color: '888888', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Calibri' }),
                  new TextRun({ text: ' of ', size: 18, color: '888888', font: 'Calibri' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888', font: 'Calibri' }),
                  new TextRun({ text: '  •  MassaPro SOW Builder', size: 18, color: '888888', font: 'Calibri' }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverChildren,
          ...overviewChildren,
          ...scopeChildren,
          ...specsChildren,
          ...tasksChildren,
          ...milestoneChildren,
          ...termsChildren,
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
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 320, after: 160 },
    border: {
      bottom: { color: '9333EA', space: 4, style: BorderStyle.SINGLE, size: 12 },
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32, // 16pt
        color: '9333EA',
        font: 'Calibri',
      }),
    ],
  })
}

function coverInfoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3E8FF' },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 22, color: '030712', font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value, size: 22, color: '030712', font: 'Calibri' })],
          }),
        ],
      }),
    ],
  })
}

function specHeaderCell(text: string): TableCell {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3E8FF' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 22, color: '030712', font: 'Calibri' })],
      }),
    ],
  })
}

function specBodyCell(text: string, bold: boolean): TableCell {
  return new TableCell({
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 22, color: '030712', font: 'Calibri' })],
      }),
    ],
  })
}

function taskHeaderCell(text: string): TableCell {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: '9333EA' },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Calibri' })],
      }),
    ],
  })
}

function taskBodyCell(text: string, bold: boolean): TableCell {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20, color: '030712', font: 'Calibri' })],
      }),
    ],
  })
}

function tableBorders() {
  const edge = { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }
  return {
    top: edge,
    bottom: edge,
    left: edge,
    right: edge,
    insideHorizontal: edge,
    insideVertical: edge,
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
