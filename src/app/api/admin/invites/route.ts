import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invites = await db.invite.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sentByAdmin: { select: { id: true, name: true, email: true } },
        usedByUser: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Get invites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminId = (session.user as any).id
    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { email, name, company, password } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const token = uuidv4()
    const tempPassword = password || Math.random().toString(36).slice(-8)

    // Create the user if they don't exist
    const existingUser = await db.user.findUnique({ where: { email } })
    let userId = existingUser?.id

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(tempPassword, 12)
      const newUser = await db.user.create({
        data: {
          email,
          name: name || null,
          company: company || null,
          passwordHash,
          role: 'user',
        },
      })
      userId = newUser.id
    }

    const invite = await db.invite.create({
      data: {
        token,
        email,
        name: name || null,
        company: company || null,
        password: tempPassword,
        sentByAdminId: adminId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    return NextResponse.json({
      invite,
      credentials: {
        email,
        password: tempPassword,
        token,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create invite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
