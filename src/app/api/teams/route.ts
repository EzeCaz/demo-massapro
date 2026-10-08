import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Teams API — super_admin only.
//
// GET    /api/teams              — list all teams (with company + member count)
// GET    /api/teams?companyId=X  — list teams in a specific company
// POST   /api/teams              — create a team  { name, companyId, description }
// PUT    /api/teams?id=X         — update team   { name?, description?, status? }
// DELETE /api/teams?id=X         — archive team  (sets status='archived')

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')

    const teams = await db.team.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { name: 'asc' },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    })
    return NextResponse.json({ teams })
  } catch (e: any) {
    console.error('[api/teams GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSuperAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const body = await req.json()
    const name = (body.name || '').toString().trim()
    const companyId = (body.companyId || '').toString().trim()
    const description = (body.description || '').toString().trim() || null
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!companyId) return NextResponse.json({ error: 'companyId is required' }, { status: 400 })

    const team = await db.team.create({
      data: { name, companyId, description },
      include: { company: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ team })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A team with this name already exists in this company' }, { status: 409 })
    }
    if (e?.code === 'P2003') {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
    console.error('[api/teams POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSuperAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const body = await req.json()
    const data: any = {}
    if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
    if (typeof body.description === 'string') data.description = body.description.trim() || null
    if (typeof body.status === 'string' && ['active', 'archived'].includes(body.status)) data.status = body.status

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const team = await db.team.update({
      where: { id },
      data,
      include: { company: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ team })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    console.error('[api/teams PUT]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSuperAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const team = await db.team.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    })
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    if (team._count.members > 0) {
      const archived = await db.team.update({ where: { id }, data: { status: 'archived' } })
      return NextResponse.json({ team: archived, archived: true })
    }

    await db.team.delete({ where: { id } })
    return NextResponse.json({ ok: true, archived: false })
  } catch (e: any) {
    console.error('[api/teams DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
