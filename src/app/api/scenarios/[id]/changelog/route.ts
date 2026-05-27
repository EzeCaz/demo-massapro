import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const changelog = await db.changeLog.findMany({
      where: { scenarioId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(changelog)
  } catch (error) {
    console.error('Get changelog error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
