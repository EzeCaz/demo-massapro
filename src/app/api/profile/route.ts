import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Profile API — current user can edit their own profile fields.
// Role, status, company, team are NOT editable here (those are admin-only
// via /api/users).

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, email: true, name: true, role: true,
        company: true, companyId: true, teamId: true,
        jobTitle: true, phone: true, linkedinUrl: true,
        country: true, city: true, avatarUrl: true, bio: true,
        status: true, createdAt: true,
        companyRef: { select: { id: true, name: true } },
        teamRef: { select: { id: true, name: true } },
      },
    })
    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ profile })
  } catch (e: any) {
    console.error('[api/profile GET]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = session.user as any
    if (user.role === 'share') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const data: any = {}

    // Only the user-editable fields. NOT: email, role, status, companyId, teamId, approvedBy, passwordHash.
    const editableFields = ['name', 'jobTitle', 'phone', 'linkedinUrl', 'country', 'city', 'avatarUrl', 'bio']
    for (const f of editableFields) {
      if (typeof body[f] === 'string') data[f] = body[f].trim() || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true, email: true, name: true, role: true,
        company: true, companyId: true, teamId: true,
        jobTitle: true, phone: true, linkedinUrl: true,
        country: true, city: true, avatarUrl: true, bio: true,
        status: true, createdAt: true,
        companyRef: { select: { id: true, name: true } },
        teamRef: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ profile: updated })
  } catch (e: any) {
    console.error('[api/profile PATCH]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
