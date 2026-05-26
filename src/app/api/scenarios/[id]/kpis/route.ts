import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const kpis = await db.kPI.findMany({ where: { scenarioId: id } })
    return NextResponse.json(kpis)
  } catch (error) {
    console.error('Get KPIs error:', error)
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
    const body = await req.json()
    const { name, targetValue } = body

    if (!name) {
      return NextResponse.json({ error: 'KPI name is required' }, { status: 400 })
    }

    const kpi = await db.kPI.create({
      data: {
        scenarioId: id,
        name,
        targetValue: targetValue || null,
      },
    })

    return NextResponse.json(kpi, { status: 201 })
  } catch (error) {
    console.error('Create KPI error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { kpiId, name, targetValue } = body

    if (!kpiId) {
      return NextResponse.json({ error: 'KPI ID is required' }, { status: 400 })
    }

    const kpi = await db.kPI.update({
      where: { id: kpiId },
      data: { name, targetValue: targetValue || null },
    })

    return NextResponse.json(kpi)
  } catch (error) {
    console.error('Update KPI error:', error)
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

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const kpiId = searchParams.get('kpiId')

    if (!kpiId) {
      return NextResponse.json({ error: 'KPI ID is required' }, { status: 400 })
    }

    await db.kPI.delete({ where: { id: kpiId } })
    return NextResponse.json({ message: 'KPI deleted' })
  } catch (error) {
    console.error('Delete KPI error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
