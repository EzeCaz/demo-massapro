import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create super_admin user
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'eze@massapro.com'
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'MassaPro2024!'
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail },
  })

  if (!existingSuperAdmin) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12)
    await prisma.user.create({
      data: {
        email: superAdminEmail,
        name: 'Ezequiel Sznaider',
        passwordHash,
        role: 'super_admin',
        company: 'MassaPro',
      },
    })
    console.log(`✅ Super admin created: ${superAdminEmail}`)
  } else {
    // Ensure the existing user has super_admin role
    if (existingSuperAdmin.role !== 'super_admin') {
      await prisma.user.update({
        where: { email: superAdminEmail },
        data: { role: 'super_admin' },
      })
      console.log(`✅ Updated ${superAdminEmail} to super_admin role`)
    } else {
      console.log(`ℹ️  Super admin already exists: ${superAdminEmail}`)
    }
  }

  // Create a regular admin user if it doesn't exist
  const adminEmail = 'admin@massapro.com'
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const adminPassword = 'Admin2024!'
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        passwordHash,
        role: 'admin',
        company: 'MassaPro',
      },
    })
    console.log(`✅ Admin created: ${adminEmail} / ${adminPassword}`)
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`)
  }

  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
