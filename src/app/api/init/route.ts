import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// This endpoint initializes the database with required seed data.
// It's safe to call multiple times - it will not duplicate data.
export async function POST() {
  try {
    // Check if super admin exists
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'eze@massapro.com'
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'MassaPro2024!'

    const existingSuperAdmin = await db.user.findUnique({
      where: { email: superAdminEmail },
    })

    if (!existingSuperAdmin) {
      const passwordHash = await bcrypt.hash(superAdminPassword, 12)
      await db.user.create({
        data: {
          email: superAdminEmail,
          name: 'Ezequiel Sznaider',
          passwordHash,
          role: 'super_admin',
          company: 'MassaPro',
        },
      })
    } else if (existingSuperAdmin.role !== 'super_admin') {
      await db.user.update({
        where: { email: superAdminEmail },
        data: { role: 'super_admin' },
      })
    }

    // Create admin user if not exists
    const adminEmail = 'admin@massapro.com'
    const existingAdmin = await db.user.findUnique({
      where: { email: adminEmail },
    })

    if (!existingAdmin) {
      const adminPassword = 'Admin2024!'
      const passwordHash = await bcrypt.hash(adminPassword, 12)
      await db.user.create({
        data: {
          email: adminEmail,
          name: 'Admin',
          passwordHash,
          role: 'admin',
          company: 'MassaPro',
        },
      })
    }

    const userCount = await db.user.count()
    return NextResponse.json({
      success: true,
      message: 'Database initialized',
      userCount,
    })
  } catch (error: any) {
    console.error('Database init error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
