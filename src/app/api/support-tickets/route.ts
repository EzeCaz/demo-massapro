import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Support tickets API.
//
// Per the user's brief:
//   Title:        "Submit support request"  (displayed in the UI form)
//   CC email:     array of emails (Add emails button)
//   Subject:      short string
//   Description:  long string (placeholder: "Please enter the details of
//                 your request. A MassaPro staff will respond as soon as
//                 possible.")
//   Priority:     Low / Normal / High / Critical
//   Attachments:  files (no file chosen / Add file / drop files here)
//
// GET    /api/support-tickets           — list tickets visible to the
//                                          current user (own + assigned + admin sees all)
// POST   /api/support-tickets           — create a ticket
//   multipart/form-data with fields:
//     title, subject, description, priority, ccEmails (JSON array of strings),
//     files (multiple, optional)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    // Build the where clause — admins see all tickets, regular users only see their own
    const where: any = {}
    if (status) where.status = status
    if (priority) where.priority = priority
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      where.submittedById = user.id
    }

    const tickets = await db.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        _count: { select: { attachments: true, comments: true } },
      },
    })
    return NextResponse.json({ tickets })
  } catch (e: any) {
    console.error('[api/support-tickets GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8 MB per file
const MAX_FILES = 10

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await req.formData()
    const title = (formData.get('title') as string | null)?.trim() || 'Submit support request'
    const subject = (formData.get('subject') as string | null)?.trim()
    const description = (formData.get('description') as string | null)?.trim()
    const priority = (formData.get('priority') as string | null) || 'normal'
    const ccEmailsRaw = formData.get('ccEmails') as string | null

    if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    if (!description) return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    if (!['low', 'normal', 'high', 'critical'].includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
    }

    // Parse ccEmails — JSON array of strings
    let ccEmails: string[] = []
    if (ccEmailsRaw) {
      try {
        const parsed = JSON.parse(ccEmailsRaw)
        if (Array.isArray(parsed)) {
          ccEmails = parsed
            .map((s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
            .filter((s: string) => s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
        }
      } catch {
        // ignore malformed JSON
      }
    }

    // Validate and collect attachments
    const files = formData.getAll('files').filter((f) => f instanceof File) as File[]
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} files per ticket` }, { status: 400 })
    }
    const attachments: { fileName: string; fileType: string | null; fileSize: number; data: Buffer }[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds the ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
          { status: 400 }
        )
      }
      const buf = Buffer.from(await file.arrayBuffer())
      attachments.push({
        fileName: file.name,
        fileType: file.type || null,
        fileSize: file.size,
        data: buf,
      })
    }

    // Create the ticket (transactional — also create attachments in same tx)
    const ticket = await db.$transaction(async (tx) => {
      const t = await tx.supportTicket.create({
        data: {
          title,
          subject,
          description,
          priority,
          submittedById: user.id,
          ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
        },
      })
      if (attachments.length > 0) {
        for (const a of attachments) {
          await tx.supportTicketAttachment.create({
            data: {
              ticketId: t.id,
              fileName: a.fileName,
              fileType: a.fileType,
              fileSize: a.fileSize,
              data: a.data as any,
            },
          })
        }
      }
      return t
    })

    return NextResponse.json({ ticket: { id: ticket.id } }, { status: 201 })
  } catch (e: any) {
    console.error('[api/support-tickets POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
