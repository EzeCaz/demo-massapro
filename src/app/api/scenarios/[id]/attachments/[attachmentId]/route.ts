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

    const filePath = path.join('/home/z/my-project/uploads', attachment.filePath)
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': attachment.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
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
