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

    const uploadsDir = '/home/z/my-project/uploads'
    await mkdir(uploadsDir, { recursive: true })

    const fileName = `${Date.now()}-${file.name}`
    const filePath = path.join(uploadsDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const attachment = await db.attachment.create({
      data: {
        scenarioId: id,
        fileName: file.name,
        filePath: fileName,
        fileType: file.type,
        fileSize: file.size,
        category,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Upload attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
