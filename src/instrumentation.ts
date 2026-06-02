/**
 * Next.js Instrumentation — runs once when the server starts.
 * Checks if the database is initialized and seeds default users.
 *
 * For table creation, we rely on the build script (prisma db push)
 * and the /api/init endpoint as a fallback.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[instrumentation] Checking database...')
    checkAndSeed().catch((error) => {
      console.error('[instrumentation] Error:', error?.message || error)
    })
  }
}

async function checkAndSeed() {
  try {
    const { db } = await import('@/lib/db')

    // Quick check — does the User table exist?
    let userCount: number
    try {
      userCount = await db.user.count()
    } catch {
      console.log('[instrumentation] User table missing — call POST /api/init to set up')
      return
    }

    if (userCount > 0) {
      console.log(`[instrumentation] Database ready — ${userCount} users`)
      return
    }

    // No users — seed the database
    console.log('[instrumentation] No users found — seeding...')
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
    console.error('[instrumentation] Check error:', error.message)
  }
}
