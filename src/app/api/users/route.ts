import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isSuperAdminRole, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

// Hierarchical user management — super_admin only.
//
// GET    /api/users                  — list all users with company, team, status
// GET    /api/users?status=pending   — filter by status
// PATCH  /api/users?id=X             — update a user (role, company, team, status, profile fields)
// PATCH  /api/users?id=X&action=approve — approve a pending user
// PATCH  /api/users?id=X&action=suspend — suspend a user
// PATCH  /api/users?id=X&action=reactivate — reactivate a suspended user
// DELETE /api/users?id=X             — soft-delete user (status='deleted')

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')
    const teamId = searchParams.get('teamId')

    const users = await db.user.findMany({
      where: {
        role: { not: 'share' },
        ...(status ? { status } : {}),
        ...(companyId ? { companyId } : {}),
        ...(teamId ? { teamId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true, // legacy free-text
        companyId: true,
        teamId: true,
        jobTitle: true,
        phone: true,
        linkedinUrl: true,
        country: true,
        city: true,
        avatarUrl: true,
        bio: true,
        status: true,
        approvedBy: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        companyRef: { select: { id: true, name: true } },
        teamRef: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ users })
  } catch (e: any) {
    console.error('[api/users GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSuperAdminRole((session.user as any).role)) {
      return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action') // approve | suspend | reactivate | (none)
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const sessionUserId = (session.user as any).id

    // ---- Action shortcuts -------------------------------------------------
    if (action === 'approve') {
      const user = await db.user.update({
        where: { id },
        data: {
          status: 'active',
          approvedBy: sessionUserId,
          approvedAt: new Date(),
        },
      })
      return NextResponse.json({ user })
    }
    if (action === 'suspend') {
      // Cannot suspend another super_admin or yourself
      const target = await db.user.findUnique({ where: { id }, select: { role: true, id: true } })
      if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (target.role === 'super_admin') {
        return NextResponse.json({ error: 'Cannot suspend a super admin' }, { status: 400 })
      }
      if (target.id === sessionUserId) {
        return NextResponse.json({ error: 'Cannot suspend yourself' }, { status: 400 })
      }
      const user = await db.user.update({ where: { id }, data: { status: 'suspended' } })
      return NextResponse.json({ user })
    }
    if (action === 'reactivate') {
      const user = await db.user.update({ where: { id }, data: { status: 'active' } })
      return NextResponse.json({ user })
    }

    // ---- General update (PATCH body) -------------------------------------
    const body = await req.json()
    const data: any = {}

    // Role change — super_admin only, with safety checks
    if (typeof body.role === 'string' && ['super_admin', 'admin', 'user', 'demo'].includes(body.role)) {
      // Prevent demoting the last super_admin (would lock out the platform)
      if (body.role !== 'super_admin') {
        const target = await db.user.findUnique({ where: { id }, select: { role: true } })
        if (target?.role === 'super_admin') {
          const superAdminCount = await db.user.count({ where: { role: 'super_admin', status: 'active' } })
          if (superAdminCount <= 1) {
            return NextResponse.json({ error: 'Cannot demote the last super admin' }, { status: 400 })
          }
        }
      }
      // Prevent the user from demoting themselves (would lose access)
      if (id === sessionUserId && body.role !== 'super_admin') {
        return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
      }
      data.role = body.role
    }

    // Company / team assignment
    if (typeof body.companyId === 'string') data.companyId = body.companyId || null
    if (typeof body.teamId === 'string') {
      data.teamId = body.teamId || null
      // Validate team belongs to the (new) company
      if (body.teamId) {
        const team = await db.team.findUnique({ where: { id: body.teamId }, select: { companyId: true } })
        if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
        const newCompanyId = data.companyId !== undefined ? data.companyId : (await db.user.findUnique({ where: { id }, select: { companyId: true } }))?.companyId
        if (newCompanyId && team.companyId !== newCompanyId) {
          return NextResponse.json({ error: 'Team must belong to the same company as the user' }, { status: 400 })
        }
      }
    }

    // Profile fields
    const profileFields = ['name', 'jobTitle', 'phone', 'linkedinUrl', 'country', 'city', 'avatarUrl', 'bio', 'company']
    for (const f of profileFields) {
      if (typeof body[f] === 'string') data[f] = body[f].trim() || null
    }

    if (typeof body.status === 'string' && ['active', 'pending', 'suspended', 'deleted'].includes(body.status)) {
      data.status = body.status
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, role: true, company: true, companyId: true, teamId: true,
        jobTitle: true, phone: true, linkedinUrl: true, country: true, city: true, avatarUrl: true, bio: true,
        status: true, approvedBy: true, approvedAt: true, createdAt: true, updatedAt: true,
        companyRef: { select: { id: true, name: true } },
        teamRef: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ user })
  } catch (e: any) {
    if (e?.code === 'P2025') return NextResponse.json({ error: 'User not found' }, { status: 404 })
    console.error('[api/users PATCH]', e)
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

    const sessionUserId = (session.user as any).id
    if (id === sessionUserId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id }, select: { role: true } })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (target.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete a super admin' }, { status: 400 })
    }

    // Soft delete — set status='deleted' but keep the row (for referential
    // integrity on tickets, scenarios, integrationSetups, etc.). The user
    // can no longer log in (the credentials provider checks status='active').
    const user = await db.user.update({ where: { id }, data: { status: 'deleted' } })
    return NextResponse.json({ user })
  } catch (e: any) {
    console.error('[api/users DELETE]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
