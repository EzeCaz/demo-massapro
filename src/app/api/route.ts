import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Quick health check - try to count users
    const userCount = await db.user.count()
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      users: userCount,
    })
  } catch (error: any) {
    // Database not initialized — return error with helpful info
    return NextResponse.json({
      status: 'error',
      database: 'not_initialized',
      error: error.message,
      hint: 'Call POST /api/init to initialize the database',
    }, { status: 503 })
  }
}
