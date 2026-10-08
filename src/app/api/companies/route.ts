import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Companies API — super_admin only.
//
// GET    /api/companies        — list all companies (with member + team counts)
// POST   /api/companies        — create a company  { name, description }
// PUT    /api/companies?id=X   — update company    { name?, description?, status? }
// DELETE /api/companies?id=X   — archive company   (sets status='archived', does NOT delete rows)

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const companies = await db.company.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { members: true, teams: true } },
      },
    })
    return NextResponse.json({ companies })
  } catch (e: any) {
    console.error('[api/companies GET]', e)
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
    const description = (body.description || '').toString().trim() || null
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

    const company = await db.company.create({
      data: { name, description },
    })
    return NextResponse.json({ company })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A company with this name already exists' }, { status: 409 })
    }
    console.error('[api/companies POST]', e)
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

    const company = await db.company.update({
      where: { id },
      data,
    })
    return NextResponse.json({ company })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    console.error('[api/companies PUT]', e)
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

    // Soft delete — set status='archived'. Hard delete only if no members/teams.
    const company = await db.company.findUnique({
      where: { id },
      include: { _count: { select: { members: true, teams: true } } },
    })
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })

    if (company._count.members > 0 || company._count.teams > 0) {
      // Archive instead of deleting
      const archived = await db.company.update({ where: { id }, data: { status: 'archived' } })
      return NextResponse.json({ company: archived, archived: true })
    }

    await db.company.delete({ where: { id } })
    return NextResponse.json({ ok: true, archived: false })
  } catch (e: any) {
    console.error('[api/companies DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
