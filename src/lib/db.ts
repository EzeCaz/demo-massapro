import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL,
  })

// In production (Vercel), each serverless function invocation gets its own isolate,
// so we cache the PrismaClient on the global object to avoid creating multiple instances
// within the same invocation.
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
