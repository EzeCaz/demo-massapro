import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const comments = await db.scenarioComment.findMany({
      where: { scenarioId: id },
      include: { author: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(comments)
  } catch (error) {
    console.error('Get comments error:', error)
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
    const userId = (session.user as any).id
    const body = await req.json()
    const { content, taggedUsers } = body

    if (!content) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    const comment = await db.scenarioComment.create({
      data: {
        scenarioId: id,
        authorId: userId,
        content,
        taggedUsers: taggedUsers || null,
      },
      include: { author: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const commentId = searchParams.get('commentId')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 })
    }

    await db.scenarioComment.delete({ where: { id: commentId } })
    return NextResponse.json({ message: 'Comment deleted' })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
