import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const attachments = await db.attachment.findMany({
      where: { scenarioId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Get attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const formData = await req.formData()
    const file = formData.get('file') as File
    const category = formData.get('category') as string || 'attachment'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uniqueName = `${Date.now()}-${file.name}`

    // Store the file content in the database. This is required on serverless
    // platforms (Vercel) where the filesystem is ephemeral — files written to
    // disk would be lost between invocations. It also enables inline playback
    // of audio/video and previewing of images directly from the DB.
    const attachment = await db.attachment.create({
      data: {
        scenarioId: id,
        fileName: file.name,
        filePath: uniqueName,
        fileType: file.type,
        fileSize: file.size,
        category,
        data: buffer,
      },
    })

    // Best-effort local disk write for local development environments.
    // Silently ignored on serverless where the disk is read-only.
    try {
      const uploadsDir = process.env.UPLOADS_DIR || '/home/z/my-project/uploads'
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(path.join(uploadsDir, uniqueName), buffer)
    } catch {
      // Disk not writable (e.g. Vercel) — the DB copy above is authoritative.
    }

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Upload attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
