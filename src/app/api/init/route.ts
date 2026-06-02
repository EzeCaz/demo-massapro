import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { execSync } from 'child_process'

/**
 * Initialize the database — creates tables and seeds default users.
 * Safe to call multiple times (idempotent).
 *
 * This endpoint exists as a fallback for when the instrumentation.ts
 * startup initialization fails or is skipped.
 */
export async function POST() {
  try {
    // Step 1: Ensure tables exist by running prisma db push
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'pipe',
        env: { ...process.env },
        timeout: 30000,
      })
    } catch (pushError: any) {
      console.error('[init] prisma db push failed:', pushError.message)
      // Continue anyway — tables might already exist
    }

    // Step 2: Seed default users
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

/**
 * GET handler — check if database is initialized
 */
export async function GET() {
  try {
    const userCount = await db.user.count()
    return NextResponse.json({
      initialized: true,
      userCount,
    })
  } catch {
    return NextResponse.json({
      initialized: false,
      userCount: 0,
    })
  }
}
