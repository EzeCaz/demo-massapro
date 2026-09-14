import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { readFile, unlink } from 'fs/promises'
import path from 'path'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { attachmentId } = await params

    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Prefer the DB-stored content (authoritative on serverless). Fall back
    // to the local disk copy for older attachments uploaded in local dev.
    let fileBuffer: Buffer | null = null
    if (attachment.data) {
      fileBuffer = Buffer.from(attachment.data)
    } else {
      try {
        const filePath = path.join('/home/z/my-project/uploads', attachment.filePath)
        fileBuffer = await readFile(filePath)
      } catch {
        return NextResponse.json({ error: 'File content not found' }, { status: 404 })
      }
    }

    // Serve media types inline so browsers can play audio/video and preview
    // images directly. Everything else downloads as an attachment.
    const mime = attachment.fileType || 'application/octet-stream'
    const isMedia = /^(audio|video|image)\//.test(mime)
    const disposition = isMedia ? 'inline' : 'attachment'

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `${disposition}; filename="${attachment.fileName}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Download attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { attachmentId } = await params

    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId },
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Try to delete the file
    try {
      const filePath = path.join('/home/z/my-project/uploads', attachment.filePath)
      await unlink(filePath)
    } catch {
      // File might already be deleted
    }

    await db.attachment.delete({ where: { id: attachmentId } })

    return NextResponse.json({ message: 'Attachment deleted' })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
