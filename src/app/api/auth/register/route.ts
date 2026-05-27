import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, company, inviteToken } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    let role = 'user'
    if (inviteToken) {
      const invite = await db.invite.findUnique({ where: { token: inviteToken } })
      if (invite && invite.expiresAt > new Date()) {
        // Valid invite
      } else if (inviteToken) {
        return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 })
      }
    }

    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        company: company || null,
        passwordHash,
        role,
      },
    })

    // Mark invite as used if applicable
    if (inviteToken) {
      const invite = await db.invite.findUnique({ where: { token: inviteToken } })
      if (invite) {
        await db.invite.update({
          where: { token: inviteToken },
          data: { usedByUserId: user.id, usedAt: new Date() },
        })
      }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
