import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, isAdminRole } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (!isAdminRole(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clients = await db.user.findMany({
      where: { role: { in: ['user', 'admin', 'super_admin'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        scenarios: {
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: { select: { scenarios: true } },
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Get clients error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (!isAdminRole(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { userId, name, email, company } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (company !== undefined) updateData.company = company

    // Only super_admin can change roles
    if (body.role !== undefined) {
      if (body.role === 'super_admin') {
        return NextResponse.json({ error: 'Cannot set role to super_admin' }, { status: 403 })
      }
      if (userRole !== 'super_admin') {
        return NextResponse.json({ error: 'Only super admins can change user roles' }, { status: 403 })
      }
      updateData.role = body.role
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (!isAdminRole(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Prevent deletion of super_admin users
    const targetUser = await db.user.findUnique({ where: { id: userId } })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot delete super admin users' }, { status: 403 })
    }
    // Only super_admin can delete admin users
    if (targetUser.role === 'admin' && userRole !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can delete admin users' }, { status: 403 })
    }

    await db.user.delete({ where: { id: userId } })
    return NextResponse.json({ message: 'Client deleted' })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
