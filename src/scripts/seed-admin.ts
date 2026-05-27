import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

async function seed() {
  const adminEmail = 'admin@massapro.com'
  const adminPassword = 'admin123'

  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  })

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    await db.user.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        company: 'MassaPro',
        passwordHash,
        role: 'admin',
      },
    })
    console.log('Admin user created: admin@massapro.com / admin123')
  } else {
    console.log('Admin user already exists')
  }
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect())
