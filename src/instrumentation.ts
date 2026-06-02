/**
 * Next.js Instrumentation — runs once when the server starts.
 * Checks if the database has been seeded and creates default users if needed.
 *
 * With PostgreSQL, the database schema is managed by Prisma migrations
 * (run during build or via `prisma migrate deploy`), so we only need to
 * seed the default users here.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[instrumentation] Checking database...')
    seedIfNeeded().catch((error) => {
      console.error('[instrumentation] Error:', error?.message || error)
    })
  }
}

async function seedIfNeeded() {
  try {
    const { db } = await import('@/lib/db')

    // Check if any users exist
    let userCount: number
    try {
      userCount = await db.user.count()
    } catch (error: any) {
      console.error('[instrumentation] Cannot connect to database:', error.message)
      console.error('[instrumentation] Make sure DATABASE_URL is set correctly')
      return
    }

    if (userCount > 0) {
      console.log(`[instrumentation] Database ready — ${userCount} users`)
      return
    }

    // No users — seed the database
    console.log('[instrumentation] No users found — seeding default users...')
    const bcrypt = await import('bcryptjs')

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'eze@massapro.com'
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'MassaPro2024!'
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

    const adminEmail = 'admin@massapro.com'
    const adminPasswordHash = await bcrypt.hash('Admin2024!', 12)
    await db.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash: adminPasswordHash,
        role: 'admin',
        company: 'MassaPro',
      },
    })

    const finalCount = await db.user.count()
    console.log(`[instrumentation] Database seeded — ${finalCount} users`)
  } catch (error: any) {
    console.error('[instrumentation] Seed error:', error.message)
  }
}
